// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.17.0

mod Errors {
    pub const ZERO_ADDRESS: felt252 = 'Zero address passed';
    pub const ZERO_AMOUNT: felt252 = 'Zero amount passed';
    pub const TOTAL_SUPPLY_LIMIT: felt252 = 'Total supply limit reached';
    pub const WHITELISTED_ALREADY: felt252 = 'Address is already whitelisted';
    pub const EXPECTED_TOKEN_ERROR: felt252 = 'Token not equals to existent';
    pub const EXPECTED_PRICE_ERROR: felt252 = 'Price not equals to existent';
    pub const NOT_TRANSFERRABLE: felt252 = 'Not transferrable';
    pub const ONLY_FACTORY: felt252 = 'Only Factory can call';
    pub const INITIALIZE_ONLY_ONCE: felt252 = 'Initialize only once';
    pub const WRONG_ARRAY_SIZE: felt252 = 'Wrong array size';
    pub const VALIDATION_ERROR: felt252 = 'Invalid signature';
}

#[starknet::contract]
pub mod NFT {
    use crate::nft::interface::{
        INFT, NftParameters, DynamicPriceParameters, StaticPriceParameters
    };
    use crate::snip12::{
        static_price_hash::{
            MessageStaticPriceHash, StaticPriceHash
        },
        dynamic_price_hash::{
            MessageDynamicPriceHash, DynamicPriceHash
        }
    };
    use crate::nftfactory::interface::{
        INFTFactoryDispatcher, INFTFactoryDispatcherTrait
    };
    use core::num::traits::Zero;
    use starknet::{
        ContractAddress,
        get_caller_address,
        event::EventEmitter,
        storage::{
            StoragePointerReadAccess, 
            StoragePointerWriteAccess, 
            Map,
            StorageMapReadAccess,
            StorageMapWriteAccess,
        }
    };
    use openzeppelin::{
        access::ownable::OwnableComponent,
        introspection::src5::SRC5Component,
        token::{
            erc20::interface::{IERC20Dispatcher,IERC20DispatcherTrait},
            erc721::ERC721Component,
            common::erc2981::{ERC2981Component,DefaultConfig}
        },
        account::interface::{
            ISRC6Dispatcher, ISRC6DispatcherTrait
        }
    };

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: ERC2981Component, storage: erc2981, event: ERC2981Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC2981Impl = ERC2981Component::ERC2981Impl<ContractState>;
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;

    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;
    impl ERC2981InternalImpl = ERC2981Component::InternalImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        erc2981: ERC2981Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,

        creator: ContractAddress,
        factory: ContractAddress,

        nft_node: ParametersNode, 
        nft_parameters: NftParameters,
    }

    #[starknet::storage_node]
    struct ParametersNode {
        total_supply: u256,
        metadata_uri: Map<u256, felt252>,
        whitelisted: Map<ContractAddress, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        ERC2981Event: ERC2981Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat] 
        OwnableEvent: OwnableComponent::Event,
        PaymentInfoChangedEvent: PaymentInfoChanged,
        PaidEvent: Paid
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    pub struct PaymentInfoChanged {
        #[key]
        pub payment_token: ContractAddress,
        #[key]
        pub mint_price: u256,
        #[key]
        pub whitelisted_mint_price: u256
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    pub struct Paid {
        #[key]
        pub user: ContractAddress,
        #[key]
        pub payment_token: ContractAddress,
        #[key]
        pub amount: u256
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, 
        creator: ContractAddress,
        factory: ContractAddress,
        name: ByteArray, 
        symbol: ByteArray,
        fee_receiver: ContractAddress,
        royalty_fraction: u128,
    ) {
        self.creator.write(creator);
        self.factory.write(factory);

        self.erc721.initializer(name, symbol, "");
        self.ownable.initializer(creator);
        self.erc2981.initializer(fee_receiver, royalty_fraction);
    }

    #[abi(embed_v0)]
    impl NFTImpl of INFT<ContractState> {
        fn initialize(
            ref self: ContractState,
            nftParameters: NftParameters,
        ) {
            assert(get_caller_address() == self.factory.read(), super::Errors::ONLY_FACTORY);
            assert(self.nft_parameters.mint_price.read().is_zero(), super::Errors::INITIALIZE_ONLY_ONCE);

            self.nft_parameters.write(nftParameters);
        }

        fn setPaymentInfo(
            ref self: ContractState,
            paymentToken: ContractAddress,
            mintPrice: u256,
            whitelistedMintPrice: u256,
        ) {
            self.ownable.assert_only_owner();
            self._set_payment_info(paymentToken, mintPrice, whitelistedMintPrice);
        }

        fn addWhitelisted(ref self: ContractState, whitelisted: ContractAddress) {
            self.ownable.assert_only_owner();
            self._add_whitelisted(whitelisted);
        }

        fn mintDynamicPrice( 
            ref self: ContractState,
            dynamicParams: Array<DynamicPriceParameters>,
            expectedPayingToken: ContractAddress
        ) {
            self._mint_dynamic_price_batch(dynamicParams, expectedPayingToken);
        }

        fn mintStaticPrice(
            ref self: ContractState,
            staticParams: Array<StaticPriceParameters>,
            expectedPayingToken: ContractAddress,
            expectedMintPrice: u256
        ) {
            self._mint_static_price_batch(staticParams, expectedPayingToken, expectedMintPrice);
        }

        fn nftParameters(self: @ContractState) -> NftParameters {
            return self.nft_parameters.read();
        }

        fn metadataUri(self: @ContractState, tokenId: u256) -> felt252 {
            return self.nft_node.metadata_uri.read(tokenId);
        }

        fn contractUri(self: @ContractState) -> felt252 {
            return self.nft_parameters.contract_uri.read();
        }

        fn creator(self: @ContractState) -> ContractAddress {
            return self.creator.read();
        }

        fn factory(self: @ContractState) -> ContractAddress {
            return self.factory.read();
        }

        fn totalSupply(self: @ContractState) -> u256 {
            return self.nft_node.total_supply.read();
        }

        fn isWhitelisted(self: @ContractState, whitelisted: ContractAddress) -> bool {
            self.nft_node.whitelisted.read(whitelisted)
        }
    }

    impl ERC721HooksImpl of ERC721Component::ERC721HooksTrait<ContractState> {
        fn before_update(
            ref self: ERC721Component::ComponentState<ContractState>,
            to: ContractAddress,
            token_id: u256,
            auth: ContractAddress,
        ) {
            let contract_state = self.get_contract();
            let from = contract_state.owner_of(token_id);

            if to.is_non_zero() && from.is_non_zero() {
                assert(contract_state.nft_parameters.transferrable.read(), super::Errors::NOT_TRANSFERRABLE);
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _set_payment_info(
            ref self: ContractState,
            payment_token: ContractAddress,
            mint_price: u256,
            whitelisted_mint_price: u256,
        ) {
            assert(payment_token.is_non_zero(), super::Errors::ZERO_ADDRESS);
            assert(mint_price.is_non_zero(), super::Errors::ZERO_AMOUNT);
            
            self.nft_parameters.payment_token.write(payment_token);
            self.nft_parameters.mint_price.write(mint_price);
            self.nft_parameters.whitelisted_mint_price.write(whitelisted_mint_price);

            self.emit(
                Event::PaymentInfoChangedEvent(
                    PaymentInfoChanged { payment_token, mint_price, whitelisted_mint_price }
                )
            );
        }

        fn _mint_static_price_batch(
            ref self: ContractState,
            static_params: Array<StaticPriceParameters>,
            expected_paying_token: ContractAddress,
            expected_mint_price: u256
        ) {
            let array_size = static_params.len();
            let factory = INFTFactoryDispatcher { contract_address: self.factory.read() };

            assert(
                array_size.into() <= factory.maxArraySize(),
                super::Errors::WRONG_ARRAY_SIZE
            );

            let signer = ISRC6Dispatcher { contract_address: factory.signer() };

            let mut amount_to_pay = 0;
            for i in 0..array_size {
                let params = *static_params.at(i);

                let message = StaticPriceHash {
                    receiver: params.receiver,
                    token_id: params.token_id,
                    whitelisted: params.whitelisted,
                    token_uri: params.token_uri,
                };

                let is_valid_signature_felt = signer.is_valid_signature(
                    message.get_message_hash(), params.signature.into()
                );

                assert(
                    is_valid_signature_felt == starknet::VALIDATED || is_valid_signature_felt == 1, 
                    super::Errors::VALIDATION_ERROR
                );

                let mint_price = if params.whitelisted {
                    self.nft_parameters.whitelisted_mint_price.read()
                } else {
                    self.nft_parameters.mint_price.read()
                };

                amount_to_pay += mint_price;

                self._base_mint(
                    params.token_id,
                    params.receiver,
                    params.token_uri
                );
            };

            let (fees, amount_to_creator) = self._check_price(amount_to_pay, expected_paying_token);

            assert(expected_mint_price == amount_to_pay, super::Errors::EXPECTED_PRICE_ERROR);

            self._pay(amount_to_pay, fees, amount_to_creator);
        }

        fn _mint_dynamic_price_batch(
            ref self: ContractState,
            dynamic_params: Array<DynamicPriceParameters>,
            expected_paying_token: ContractAddress
        ) {
            let array_size = dynamic_params.len();
            let factory = INFTFactoryDispatcher { contract_address: self.factory.read() };

            assert(
                array_size.into() <= factory.maxArraySize(),
                super::Errors::WRONG_ARRAY_SIZE
            );

            let signer = ISRC6Dispatcher { contract_address: factory.signer() };

            let mut amount_to_pay = 0;
            for i in 0..array_size {
                let params = *dynamic_params.at(i);

                let message = DynamicPriceHash {
                    receiver: params.receiver,
                    token_id: params.token_id,
                    price: params.price,
                    token_uri: params.token_uri,
                };

                let is_valid_signature_felt = signer.is_valid_signature(
                    message.get_message_hash(), params.signature.into()
                );

                assert(
                    is_valid_signature_felt == starknet::VALIDATED || is_valid_signature_felt == 1, 
                    super::Errors::VALIDATION_ERROR
                );

                amount_to_pay += params.price;

                self._base_mint(
                    params.token_id,
                    params.receiver,
                    params.token_uri
                );
            };

            let (fees, amount_to_creator) = self._check_price(amount_to_pay, expected_paying_token);

            self._pay(amount_to_pay, fees, amount_to_creator);
        }

        fn _base_mint( 
            ref self: ContractState,
            token_id: u256,
            recipient: ContractAddress,
            token_uri: felt252
        ) {
            assert(token_id + 1 <= self.nft_parameters.max_total_supply.read(), super::Errors::TOTAL_SUPPLY_LIMIT);

            self.nft_node.total_supply.write(self.nft_node.total_supply.read() + 1);
            self.nft_node.metadata_uri.write(token_id, token_uri);

            self.erc721.safe_mint(recipient, token_id, array![].span());
        }

        fn _pay(
            ref self: ContractState, 
            amount: u256, 
            fees: u256, 
            amount_to_creator: u256,
        ) {
            let referral_code = self.nft_parameters.referral_code.read();

            let factory = INFTFactoryDispatcher { contract_address: self.factory.read() };
            let creator = self.creator.read();

            let mut fees_to_platform = fees;
            let mut referral_fees = 0;

            if referral_code.is_non_zero() {
                referral_fees = factory.getReferralRate(creator, referral_code, fees);
                fees_to_platform = fees_to_platform - referral_fees;
            }

            let (_, platform) = factory.platformParams();

            let user = get_caller_address();
            let token = IERC20Dispatcher { contract_address: self.nft_parameters.payment_token.read() };
            if fees_to_platform.is_non_zero() {
                token.transfer_from(user, platform, fees_to_platform);
            }
            if referral_fees.is_non_zero() {
                token.transfer_from(user, factory.getReferralCreator(referral_code), referral_fees);
            }

            token.transfer_from(user, creator, amount_to_creator);
            
            self.emit(
                Event::PaidEvent(
                    Paid { user, payment_token: token.contract_address, amount }
                )
            );
        }

        fn _add_whitelisted(ref self: ContractState, whitelisted: ContractAddress) {
            assert(whitelisted.is_non_zero(), super::Errors::ZERO_ADDRESS);
            assert(!self.nft_node.whitelisted.read(whitelisted), super::Errors::WHITELISTED_ALREADY);

            self.nft_node.whitelisted.write(whitelisted, true);
        }

        fn _check_price(
            self: @ContractState,
            price: u256,
            payment_token: ContractAddress,
        ) -> (u256, u256) {
            // price is the same so no need to return it
            assert(payment_token == self.nft_parameters.payment_token.read(), super::Errors::EXPECTED_TOKEN_ERROR);

            let (platform_commission, _) = INFTFactoryDispatcher { contract_address: self.factory.read() }.platformParams();

            let fees = (price * platform_commission) / DefaultConfig::FEE_DENOMINATOR.into();

            let amount_to_creator = price - fees;

            return (fees, amount_to_creator);
        }
    }
}
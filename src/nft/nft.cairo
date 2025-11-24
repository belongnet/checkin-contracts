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
    use core::num::traits::Zero;
    use starknet::{
        ClassHash, ContractAddress, event::EventEmitter, get_caller_address, get_contract_address,
        storage::{
            StoragePointerReadAccess, StoragePointerWriteAccess, Map, StorageMapReadAccess,
            StorageMapWriteAccess,
        },
    };
    use openzeppelin::{
        utils::bytearray::{ByteArrayExtImpl, ByteArrayExtTrait}, access::ownable::OwnableComponent,
        introspection::src5::SRC5Component,
        token::{
            erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait}, erc721::ERC721Component,
            common::erc2981::{ERC2981Component, DefaultConfig},
        },
        account::interface::{ISRC6Dispatcher, ISRC6DispatcherTrait},
        upgrades::{UpgradeableComponent, interface::IUpgradeable},
    };
    use crate::{
        snip12::{
            static_price_hash::{MessageStaticPriceHash, StaticPriceHash},
            dynamic_price_hash::{MessageDynamicPriceHash, DynamicPriceHash},
            interfaces::SignatureProtection
        },
        nft::interface::{INFT, NftParameters, DynamicPriceParameters, StaticPriceParameters},
        nftfactory::interface::{INFTFactoryDispatcher, INFTFactoryDispatcherTrait},
    };

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: ERC2981Component, storage: erc2981, event: ERC2981Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);

    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC2981Impl = ERC2981Component::ERC2981Impl<ContractState>;
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;

    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;
    impl ERC2981InternalImpl = ERC2981Component::InternalImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

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
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,
        creator: ContractAddress,
        factory: ContractAddress,
        nft_node: ParametersNode,
        nft_parameters: NftParameters,
    }

    #[starknet::storage_node]
    struct ParametersNode {
        total_supply: u256,
        metadata_uri: Map<u256, ByteArray>,
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
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
        PaymentInfoChangedEvent: PaymentInfoChanged,
        PaidEvent: Paid,
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    pub struct PaymentInfoChanged {
        #[key]
        pub payment_token: ContractAddress,
        #[key]
        pub mint_price: u256,
        #[key]
        pub whitelisted_mint_price: u256,
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    pub struct Paid {
        #[key]
        pub user: ContractAddress,
        #[key]
        pub payment_token: ContractAddress,
        #[key]
        pub amount: u256,
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
        if royalty_fraction.is_non_zero() && fee_receiver.is_non_zero() {
            self.erc2981.initializer(fee_receiver, royalty_fraction);
        }
    }

    //
    // Upgradeable
    //
    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.upgradeable.upgrade(new_class_hash);
        }
    }

    #[abi(embed_v0)]
    impl NFTImpl of INFT<ContractState> {
        fn initialize(ref self: ContractState, nftParameters: NftParameters) {
            assert(get_caller_address() == self.factory.read(), super::Errors::ONLY_FACTORY);
            assert(
                self.nft_parameters.mint_price.read().is_zero(),
                super::Errors::INITIALIZE_ONLY_ONCE,
            );

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
            signaturesProtection: Array<SignatureProtection>,
            dynamicParams: Array<DynamicPriceParameters>,
            expectedPayingToken: ContractAddress,
        ) {
            self._mint_dynamic_price_batch(signaturesProtection, dynamicParams, expectedPayingToken);
        }

        fn mintStaticPrice(
            ref self: ContractState,
            signaturesProtection: Array<SignatureProtection>,
            staticParams: Array<StaticPriceParameters>,
            expectedPayingToken: ContractAddress,
            expectedMintPrice: u256,
        ) {
            self._mint_static_price_batch(signaturesProtection, staticParams, expectedPayingToken, expectedMintPrice);
        }

        fn nftParameters(self: @ContractState) -> NftParameters {
            return self.nft_parameters.read();
        }

        fn metadataUri(self: @ContractState, tokenId: u256) -> ByteArray {
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

        fn tokenUriHash(self: @ContractState, token_uri: ByteArray) -> felt252 {
            self._token_uri_hash(token_uri)
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

            if contract_state.erc721.exists(token_id) {
                let from = contract_state.owner_of(token_id);
                if to.is_non_zero() && from.is_non_zero() {
                    assert(
                        contract_state.nft_parameters.transferrable.read(),
                        super::Errors::NOT_TRANSFERRABLE,
                    );
                }
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

            self
                .emit(
                    Event::PaymentInfoChangedEvent(
                        PaymentInfoChanged { payment_token, mint_price, whitelisted_mint_price },
                    ),
                );
        }

        fn _mint_dynamic_price_batch(
            ref self: ContractState,
            signatures_protection: Array<SignatureProtection>,
            dynamic_params: Array<DynamicPriceParameters>,
            expected_paying_token: ContractAddress,
        ) {
            let array_size = dynamic_params.len();
            let factory = INFTFactoryDispatcher { contract_address: self.factory.read() };

            assert(array_size.into() <= factory.maxArraySize(), super::Errors::WRONG_ARRAY_SIZE);

            let signerAddress = factory.signer();
            let signer = ISRC6Dispatcher { contract_address: signerAddress };

            let mut amount_to_pay = 0;
            for i in 0..array_size {
                let protection_ref = signatures_protection.at(i);
                let params_ref = dynamic_params.at(i);

                let token_uri_hash: felt252 = params_ref.token_uri.hash();

                let message = DynamicPriceHash {
                    verifying_contract: get_contract_address(),
                    nonce: *protection_ref.nonce,
                    deadline: *protection_ref.deadline,
                    receiver: *params_ref.receiver,
                    token_id: *params_ref.token_id,
                    price: *params_ref.price,
                    token_uri_hash: token_uri_hash,
                };

                let is_valid_signature_felt = signer
                    .is_valid_signature(
                        message.get_message_hash(signerAddress), protection_ref.signature.clone(),
                    );

                assert(
                    is_valid_signature_felt == starknet::VALIDATED || is_valid_signature_felt == 1,
                    super::Errors::VALIDATION_ERROR,
                );

                amount_to_pay += *params_ref.price;

                self
                    ._base_mint(
                        *params_ref.token_id, *params_ref.receiver, params_ref.token_uri.clone(),
                    );
            };

            let (fees, amount_to_creator) = self._check_price(amount_to_pay, expected_paying_token);

            self._pay(amount_to_pay, fees, amount_to_creator);
        }

        fn _mint_static_price_batch(
            ref self: ContractState,
            signatures_protection: Array<SignatureProtection>,
            static_params: Array<StaticPriceParameters>,
            expected_paying_token: ContractAddress,
            expected_mint_price: u256,
        ) {
            let array_size = static_params.len();
            let factory = INFTFactoryDispatcher { contract_address: self.factory.read() };

            assert(array_size.into() <= factory.maxArraySize(), super::Errors::WRONG_ARRAY_SIZE);

            let signerAddress = factory.signer();
            let signer = ISRC6Dispatcher { contract_address: signerAddress };

            let mut amount_to_pay = 0;
            for i in 0..array_size {
                let protection_ref = signatures_protection.at(i);
                let params_ref = static_params.at(i);

                let token_uri_hash: felt252 = params_ref.token_uri.hash();

                let message = StaticPriceHash {
                    verifying_contract: get_contract_address(),
                    nonce: *protection_ref.nonce,
                    deadline: *protection_ref.deadline,
                    receiver: *params_ref.receiver,
                    token_id: *params_ref.token_id,
                    whitelisted: *params_ref.whitelisted,
                    token_uri_hash: token_uri_hash,
                };

                let is_valid_signature_felt = signer
                    .is_valid_signature(
                        message.get_message_hash(signerAddress), protection_ref.signature.clone(),
                    );

                assert(
                    is_valid_signature_felt == starknet::VALIDATED || is_valid_signature_felt == 1,
                    super::Errors::VALIDATION_ERROR,
                );

                let mint_price = if *params_ref.whitelisted {
                    self.nft_parameters.whitelisted_mint_price.read()
                } else {
                    self.nft_parameters.mint_price.read()
                };

                amount_to_pay += mint_price;

                self
                    ._base_mint(
                        *params_ref.token_id, *params_ref.receiver, params_ref.token_uri.clone(),
                    );
            };

            let (fees, amount_to_creator) = self._check_price(amount_to_pay, expected_paying_token);

            assert(expected_mint_price == amount_to_pay, super::Errors::EXPECTED_PRICE_ERROR);

            self._pay(amount_to_pay, fees, amount_to_creator);
        }

        fn _base_mint(
            ref self: ContractState,
            token_id: u256,
            recipient: ContractAddress,
            token_uri: ByteArray,
        ) {
            assert(
                token_id + 1 <= self.nft_parameters.max_total_supply.read(),
                super::Errors::TOTAL_SUPPLY_LIMIT,
            );

            self.nft_node.total_supply.write(self.nft_node.total_supply.read() + 1);
            self.nft_node.metadata_uri.write(token_id, token_uri);

            self.erc721.safe_mint(recipient, token_id, array![].span());
        }

        fn _pay(ref self: ContractState, amount: u256, fees: u256, amount_to_creator: u256) {
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

            let token = IERC20Dispatcher {
                contract_address: self.nft_parameters.payment_token.read(),
            };
            if fees_to_platform.is_non_zero() {
                token.transfer_from(get_caller_address(), platform, fees_to_platform);
            }
            if referral_fees.is_non_zero() {
                token
                    .transfer_from(
                        get_caller_address(),
                        factory.getReferralCreator(referral_code),
                        referral_fees,
                    );
            }

            token.transfer_from(get_caller_address(), creator, amount_to_creator);

            self
                .emit(
                    Event::PaidEvent(
                        Paid {
                            user: get_caller_address(),
                            payment_token: token.contract_address,
                            amount,
                        },
                    ),
                );
        }

        fn _add_whitelisted(ref self: ContractState, whitelisted: ContractAddress) {
            assert(whitelisted.is_non_zero(), super::Errors::ZERO_ADDRESS);
            assert(
                !self.nft_node.whitelisted.read(whitelisted), super::Errors::WHITELISTED_ALREADY,
            );

            self.nft_node.whitelisted.write(whitelisted, true);
        }

        fn _check_price(
            self: @ContractState, price: u256, payment_token: ContractAddress,
        ) -> (u256, u256) {
            // price is the same so no need to return it
            assert(
                payment_token == self.nft_parameters.payment_token.read(),
                super::Errors::EXPECTED_TOKEN_ERROR,
            );

            let (platform_commission, _) = INFTFactoryDispatcher {
                contract_address: self.factory.read(),
            }
                .platformParams();

            let fees = (price * platform_commission) / DefaultConfig::FEE_DENOMINATOR.into();

            let amount_to_creator = price - fees;

            return (fees, amount_to_creator);
        }

        fn _token_uri_hash(self: @ContractState, token_uri: ByteArray) -> felt252 {
            token_uri.hash()
        }
    }
}

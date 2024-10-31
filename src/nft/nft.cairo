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
    pub const INITIALIZE_ONLY_ONCE: felt252 = 'Itialize only once';
}

#[starknet::contract]
mod NFT {
    use crate::nft::interface::INFTInitializer;
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
            erc20::interface::{
                IERC20Dispatcher,
                IERC20DispatcherTrait
            },
            erc721::ERC721Component,
            common::erc2981::{
                ERC2981Component,
                DefaultConfig
            }
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

    #[derive(Drop, Serde, starknet::Store)]
    struct NftParameters {
        payment_token: ContractAddress,  
        // Address of ERC20 paying token (
        //     STRK - 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
        //     ETH - 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
        // )
        mint_price: u256,               // Mint price of a token from a new collection
        whitelisted_mint_price: u256,     // Mint price for whitelisted users
        max_total_supply: u256,         // The max total supply of a new collection
        collection_expires: u256,       // Collection expiration period (timestamp)
        transferrable: bool,
        referral_code: felt252
    }

    #[starknet::storage_node]
    struct ParametersNode {
        total_supply: u256,
        metadata_uri: Map<u256, ByteArray>,
        whitelisted: Map<ContractAddress, felt252>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
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
    impl InitializerImpl of INFTInitializer<ContractState> {
        fn initialize(
            ref self: ContractState,
            payment_token: ContractAddress,  
            mint_price: u256,
            whitelisted_mint_price: u256,
            max_total_supply: u256,
            collection_expires: u256,
            transferrable: bool,
            referral_code: felt252,
        ) {
            self._initialize(
                payment_token,
                mint_price,
                whitelisted_mint_price,
                max_total_supply,
                collection_expires,
                transferrable,
                referral_code
            );
        }
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        #[external(v0)]
        fn mint( 
            ref self: ContractState,
            recipient: ContractAddress,
            token_uri: ByteArray,
            expected_payment_token: ContractAddress,
            expected_mint_price: u256,
            data: Span<felt252>,
        ) {
            self._check_price(recipient, expected_payment_token, expected_mint_price);
            self._base_mint(recipient, token_uri, data);
        }

        #[external(v0)]
        fn set_payment_info(
            ref self: ContractState,
            payment_token: ContractAddress,
            mint_price: u256,
            whitelisted_mint_price: u256,
        ) {
            self.ownable.assert_only_owner();
            self._set_payment_info(payment_token, mint_price, whitelisted_mint_price);
        }

        #[external(v0)]
        fn add_whitelisted(ref self: ContractState, whitelisted: ContractAddress) {
            self.ownable.assert_only_owner();
            self._add_whitelisted(whitelisted);
        }

        #[external(v0)]
        fn metadata_uri(
            self: @ContractState,
            token_id: u256,
        ) -> ByteArray {
            return self._metadata_uri(token_id);
        }

        #[external(v0)]
        fn metadataUri(
            self: @ContractState,
            tokenId: u256,
        ) -> ByteArray {
            return self._metadata_uri(tokenId);
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
                assert(!contract_state.nft_parameters.transferrable.read(), super::Errors::NOT_TRANSFERRABLE);
            }
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _initialize(
            ref self: ContractState,
            payment_token: ContractAddress,  
            mint_price: u256,
            whitelisted_mint_price: u256,
            max_total_supply: u256,
            collection_expires: u256,
            transferrable: bool,
            referral_code: felt252,
        ) {
            assert(get_caller_address() != self.factory.read(), super::Errors::ONLY_FACTORY);
            assert(self.nft_parameters.mint_price.read().is_non_zero(), super::Errors::INITIALIZE_ONLY_ONCE);

            let parameters = NftParameters {
                payment_token,
                mint_price,
                whitelisted_mint_price,
                max_total_supply,
                collection_expires,
                transferrable,
                referral_code
            };

            self.nft_parameters.write(parameters);
        }

        fn _pay(
            ref self: ContractState, 
            amount: u256, 
            fees: u256, 
            to_creator: u256,
        ) {
            let user = get_caller_address();

            let fees_to_platform = fees; 
            let referral_fees = fees; // TODO: Mocked
            
            let payment_token = self.nft_parameters.payment_token.read();
            let token = IERC20Dispatcher { contract_address: payment_token };

            // if !fees_to_platform.is_zero() {
            //     token.transfer_from(user, self.nft_parameters.creator.read(), fees_to_platform); // TODO: change user to platform
            // }

            // if !referral_fees.is_zero() {
            //     token.transfer_from(user, self.nft_parameters.creator.read(), referral_fees); // TODO: change user to referral
            // }

            token.transfer_from(user, self.creator.read(), amount);

            self.emit(Event::PaidEvent(Paid { user, payment_token, amount }));
        }

        fn _base_mint( 
            ref self: ContractState,
            recipient: ContractAddress,
            token_uri: ByteArray,
            data: Span<felt252>
        ) {
            let token_id =  self.nft_node.total_supply.read();

            assert(token_id + 1 > self.nft_parameters.max_total_supply.read(), super::Errors::TOTAL_SUPPLY_LIMIT);

            self.nft_node.total_supply.write(token_id + 1);
            self.nft_node.metadata_uri.write(token_id, token_uri);

            self.erc721.safe_mint(recipient, token_id, data);
        }

        fn _set_payment_info(
            ref self: ContractState,
            payment_token: ContractAddress,
            mint_price: u256,
            whitelisted_mint_price: u256,
        ) {
            assert(payment_token.is_zero(), super::Errors::ZERO_ADDRESS);
            assert(mint_price.is_zero(), super::Errors::ZERO_AMOUNT);
            
            self.nft_parameters.payment_token.write(payment_token);
            self.nft_parameters.mint_price.write(mint_price);
            self.nft_parameters.whitelisted_mint_price.write(whitelisted_mint_price);

            self.emit(Event::PaymentInfoChangedEvent(PaymentInfoChanged { payment_token, mint_price, whitelisted_mint_price }));
        }

        fn _add_whitelisted(ref self: ContractState, whitelisted: ContractAddress) {
            assert(whitelisted.is_zero(), super::Errors::ZERO_ADDRESS);
            assert(self._whitelisted(whitelisted), super::Errors::WHITELISTED_ALREADY);

            self.nft_node.whitelisted.write(whitelisted, 1);
        }

        fn _check_price(
            self: @ContractState,
            account: ContractAddress,
            payment_token: ContractAddress,
            price: u256,
        ) {
            assert(payment_token != self.nft_parameters.payment_token.read(), super::Errors::EXPECTED_TOKEN_ERROR);

            let mint_price = if self._whitelisted(account) {
                self.nft_parameters.whitelisted_mint_price.read()
            } else {
                self.nft_parameters.mint_price.read()
            };

            assert(price != mint_price, super::Errors::EXPECTED_PRICE_ERROR);
            //TODO: for multiple return (price, fees, etc) try use structs
        }

        fn _metadata_uri(
            self: @ContractState,
            token_id: u256,
        ) -> ByteArray {
            return self.nft_node.metadata_uri.read(token_id);
        }

        fn _whitelisted(
            self: @ContractState,
            account: ContractAddress,
        ) -> bool {
            return self.nft_node.whitelisted.read(account) == 1;
        }
    }
}
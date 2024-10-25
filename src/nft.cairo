// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.17.0

mod Errors {
    pub const ZERO_ADDRESS: felt252 = 'Zero address passed';
    pub const ZERO_AMOUNT: felt252 = 'Zero amount passed';
    pub const TOTAL_SUPPLY_LIMIT: felt252 = 'Total supply limit reached';
    pub const WHITELISTED_ALREADY: felt252 = 'Address is already whitelisted';
    pub const EXPECTED_TOKEN_ERROR: felt252 = 'Token not equals to existent';
    pub const EXPECTED_PRICE_ERROR: felt252 = 'Price not equals to existent';
}

#[starknet::contract]
mod ERC721 {
    use core::{
        num::traits::Zero,
        starknet::event::EventEmitter
    };
    use starknet::{
        ContractAddress,
        get_caller_address,
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
        security::pausable::PausableComponent,
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
    component!(path: PausableComponent, storage: pausable, event: PausableEvent);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC2981Impl = ERC2981Component::ERC2981Impl<ContractState>;
    #[abi(embed_v0)]
    impl PausableImpl = PausableComponent::PausableImpl<ContractState>;
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;

    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;
    impl ERC2981InternalImpl = ERC2981Component::InternalImpl<ContractState>;
    impl PausableInternalImpl = PausableComponent::InternalImpl<ContractState>;
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
        pausable: PausableComponent::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,

        nft_node: ParametersNode, 
        nft_parameters: NftParameters,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct NftParameters {
        creator: ContractAddress,       // Creator's address
        payment_token: ContractAddress,  
        // Address of ERC20 paying token (
        //     STRK - 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
        //     ETH - 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
        // )
        mint_price: u256,               // Mint price of a token from a new collection
        whitelisted_mint_price: u256,     // Mint price for whitelisted users
        max_total_supply: u256,         // The max total supply of a new collection
        collection_expires: u256,       // Collection expiration period (timestamp),
        referral_code: ByteArray
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
        PausableEvent: PausableComponent::Event,
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
        name: ByteArray, 
        symbol: ByteArray, 
        base_uri: ByteArray,
        nft_params: NftParameters,
        default_receiver: ContractAddress,
        default_royalty_fraction: u128,
    ) {
        let owner = nft_params.creator;
        self.nft_parameters.write(nft_params);

        self.erc721.initializer(name, symbol, base_uri);
        self.ownable.initializer(owner);
        self.erc2981.initializer(default_receiver, default_royalty_fraction);
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
                contract_state.pausable.assert_not_paused();
            }
        }
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        #[external(v0)]
        fn pause(ref self: ContractState) {
            self._pause();
        }

        #[external(v0)]
        fn unpause(ref self: ContractState) {
            self._unpause();
        }

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
            self._set_payment_info(payment_token, mint_price, whitelisted_mint_price);
        }

        #[external(v0)] 
        fn setPaymentInfo(
            ref self: ContractState,
            payingToken: ContractAddress,
            mintPrice: u256,
            whitelistedMintPrice: u256,
        ) {
            self._set_payment_info(payingToken, mintPrice, whitelistedMintPrice);
        }

        #[external(v0)]
        fn add_whitelisted(ref self: ContractState, whitelisted: ContractAddress) {
            self._add_whitelisted(whitelisted);
        }

        #[external(v0)]
        fn addWhitelisted(ref self: ContractState, whitelisted: ContractAddress) {
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

    
    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _pause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.pause();
        }

        fn _unpause(ref self: ContractState) {
            self.ownable.assert_only_owner();
            self.pausable.unpause();
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

            token.transfer_from(user, self.nft_parameters.creator.read(), amount);

            self.emit(Paid { user, payment_token, amount });
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
            self.ownable.assert_only_owner();
            assert(payment_token.is_zero(), super::Errors::ZERO_ADDRESS);
            assert(mint_price.is_zero(), super::Errors::ZERO_AMOUNT);
            
            self.nft_parameters.payment_token.write(payment_token);
            self.nft_parameters.mint_price.write(mint_price);
            self.nft_parameters.whitelisted_mint_price.write(whitelisted_mint_price);

            self.emit(PaymentInfoChanged { payment_token, mint_price, whitelisted_mint_price });
        }

        fn _add_whitelisted(ref self: ContractState, whitelisted: ContractAddress) {
            self.ownable.assert_only_owner();
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
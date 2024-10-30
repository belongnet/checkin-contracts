// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.17.0

mod Errors {
    pub const ZERO_ADDRESS: felt252 = 'Zero address passed';
    pub const ZERO_AMOUNT: felt252 = 'Zero amount passed';
    pub const EMPTY_NAME: felt252 = 'Name is empty';
    pub const EMPTY_SYMBOL: felt252 = 'Symbol is empty';
    pub const NFT_EXISTS: felt252 = 'NFT is already exists';
}

#[starknet::contract]
mod NFTFactory {
    use crate::nft::interface::{
        INFTInitializerDispatcher,
        INFTInitializerDispatcherTrait
    };
    use core::{
        traits::Into,
        num::traits::Zero,
        starknet::event::EventEmitter,
        pedersen::pedersen
    };
    use starknet::{
        ContractAddress,
        ClassHash,
        SyscallResultTrait,
        get_caller_address,
        get_contract_address,
        syscalls::deploy_syscall,
        storage::{
            StoragePointerReadAccess, 
            StoragePointerWriteAccess, 
            Map,
            StorageMapReadAccess,
            StorageMapWriteAccess,
        }
    };
    use openzeppelin::access::ownable::OwnableComponent;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;

    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        
        /// Store the class hash of the contract to deploy
        counter_class_hash: ClassHash,

        nft_info: Map<felt252, NftInfo>,
        factory_parameters: FactoryParameters,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct NftMetadata {
        name: felt252,
        symbol: felt252,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct NftInfo {
        nft_metadata: NftMetadata,
        creator: ContractAddress,
        nft_address: ContractAddress
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct InstanceInfo {
        nft_metadata: NftMetadata,
        payment_token: ContractAddress,
        fee_receiver: ContractAddress,
        royalty_fraction: felt252,
        transferrable: bool,
        max_total_supply: u256,         // The max total supply of a new collection
        mint_price: u256,               // Mint price of a token from a new collection
        whitelisted_mint_price: u256,     // Mint price for whitelisted users
        collection_expires: u256,       // Collection expiration period (timestamp)
        referral_code: ByteArray,
        signature: ByteArray,
    }


    #[derive(Drop, Serde, starknet::Store)]
    struct FactoryParameters {
        signer_address: ContractAddress,
        default_payment_currency: ContractAddress,
        platform_address: ContractAddress,
        platform_commission: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OwnableEvent: OwnableComponent::Event
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, class_hash: ClassHash, factory_parameters: FactoryParameters) {
        self.counter_class_hash.write(class_hash);
        self.factory_parameters.write(factory_parameters);

        self.ownable.initializer(owner);
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        // fn create_counter_at(ref self: ContractState, init_value: u128) -> ContractAddress {
        //     // Constructor arguments
        //     let mut constructor_calldata: Array::<felt252> = array![init_value.into()];

        //     // Contract deployment
        //     let (deployed_address, _) = deploy_syscall(
        //         self.counter_class_hash.read(), 0, constructor_calldata.span(), false
        //     )
        //         .unwrap_syscall();

        //     deployed_address
        // }

        // fn create_counter(ref self: ContractState) -> ContractAddress {
        //     self.create_counter_at(self.init_value.read())
        // }

        // fn update_init_value(ref self: ContractState, init_value: u128) {
        //     self.init_value.write(init_value);
        // }

        fn update_counter_class_hash(ref self: ContractState, counter_class_hash: ClassHash) {
            self._update_counter_class_hash(counter_class_hash);
        }

        fn set_factory_parameters(ref self: ContractState, factory_parameters: FactoryParameters) {
            self._set_factory_parameters(factory_parameters);
        }


        fn factory_parameters(ref self: ContractState) -> FactoryParameters {
            return self._factory_parameters();
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _produce(ref self: ContractState, instance_info: InstanceInfo) -> ContractAddress {
            assert(instance_info.nft_metadata.name.is_zero(), super::Errors::EMPTY_NAME);
            assert(instance_info.nft_metadata.symbol.is_zero(), super::Errors::EMPTY_SYMBOL);

            let hash = pedersen(instance_info.nft_metadata.name, instance_info.nft_metadata.symbol);
            assert(self.nft_info.read(hash).nft_address.is_non_zero(), super::Errors::NFT_EXISTS);

            let payment_token = if instance_info.payment_token.is_zero() {
                self.factory_parameters.default_payment_currency.read()
            } else {
                instance_info.payment_token
            };

            // Constructor arguments
            let mut constructor_calldata: Array::<felt252> = array![
                get_caller_address().into(),
                get_contract_address().into(),
                instance_info.nft_metadata.name, 
                instance_info.nft_metadata.symbol,
                instance_info.fee_receiver.into(),
                instance_info.royalty_fraction,
            ];

            let (deployed_address, _) = deploy_syscall(
                self.counter_class_hash.read(), 0, constructor_calldata.span(), false
            )
                .unwrap_syscall();

            INFTInitializerDispatcher { contract_address: deployed_address }.initialize(
                payment_token,
                instance_info.mint_price,
                instance_info.whitelisted_mint_price,
                instance_info.max_total_supply,
                instance_info.collection_expires,
                instance_info.transferrable,
                instance_info.referral_code,
                instance_info.signature,
            );

            deployed_address
        }

        fn _update_referral_code(ref self: ContractState, counter_class_hash: ClassHash) {
            self.counter_class_hash.write(counter_class_hash);
        }

        fn _update_counter_class_hash(ref self: ContractState, counter_class_hash: ClassHash) {
            self.counter_class_hash.write(counter_class_hash);
        }

        fn _set_factory_parameters(ref self: ContractState, factory_parameters: FactoryParameters) {
            assert(factory_parameters.signer_address.is_zero(), super::Errors::ZERO_ADDRESS);
            assert(factory_parameters.platform_address.is_zero(), super::Errors::ZERO_ADDRESS);
            assert(factory_parameters.platform_commission.is_zero(), super::Errors::ZERO_AMOUNT);
            self.factory_parameters.write(factory_parameters);
        }

        fn _factory_parameters(self: @ContractState) -> FactoryParameters {
            return self.factory_parameters.read();
        }
    }
}

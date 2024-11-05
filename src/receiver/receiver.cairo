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
    pub const WRONG_ARRAY_SIZE: felt252 = 'Wrong array size';
    pub const VALIDATION_ERROR: felt252 = 'Invalid signature';
}

#[starknet::contract]
mod Receiver {
    use crate::receiver::interface::{IReceiverInitializer};
    use crate::nftfactory::interface::{INFTFactoryInfoDispatcher, INFTFactoryInfoDispatcherTrait};
    use core::{num::traits::Zero, ecdsa::check_ecdsa_signature, hash::HashStateTrait, pedersen::{PedersenTrait}};
    use starknet::{
        ContractAddress,
        get_caller_address,
        get_tx_info,
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
            erc721::ERC721ReceiverComponent,
            common::erc2981::{
                ERC2981Component,
                DefaultConfig
            }
        } 
    };

    component!(path: ERC721ReceiverComponent, storage: erc721receiver, event: ERC721ReceiverEvent);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);

    #[abi(embed_v0)]
    impl ERC721ReceiverMixinImplImpl = ERC721ReceiverComponent::ERC721ReceiverMixinImpl<ContractState>;

    impl ERC721ReceiverInternalImpl = ERC721ReceiverComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721receiver: ERC721ReceiverComponent::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721ReceiverEvent: ERC721ReceiverComponent::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState, 
    ) {
        self.erc721receiver.initializer();
    }

    #[abi(embed_v0)]
    impl InitializerImpl of IReceiverInitializer<ContractState> {
        fn initialize(
            ref self: ContractState,
        ) {
            // self._initialize(
            // );
        }
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
       
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
       
    }
}
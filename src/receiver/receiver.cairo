// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.17.0

mod Errors {
    pub const MAX_PAYEES_EXCEED: felt252 = 'Max amount of payees exceed';
    pub const SHARES_PAYEES_NOT_EQ: felt252 = 'Shares amount != Payees amount';
    pub const ZERO_AMOUNT: felt252 = 'Zero amount passed';
    pub const ACCOUNT_NOT_DUE_PAYMENT: felt252 = 'Account not due payment';
    
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
    use core::num::traits::Zero;
    use starknet::{
        ContractAddress,
        get_caller_address,
        get_contract_address,
        get_tx_info,
        event::EventEmitter,
        storage::{
            StoragePointerReadAccess, 
            StoragePointerWriteAccess, 
            Map,
            Vec,
            VecTrait,
            MutableVecTrait,
            StoragePathEntry,
            StorageMapReadAccess,
            StorageMapWriteAccess,
        }
    };
    use openzeppelin::{
        token::{
            erc20::interface::{
                IERC20Dispatcher,
                IERC20DispatcherTrait
            }
        } 
    };

    #[storage]
    struct Storage {
        payees: Vec<ContractAddress>,
        total_shares: u256,
        shares: Map<ContractAddress, u16>,
        total_released: u256,
        released: Map<ContractAddress, u256>
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        PaymentReleasedEvent: PaymentReleased
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    pub struct PaymentReleased {
        #[key]
        pub payment_token: ContractAddress,
        #[key]
        pub payee: ContractAddress,
        pub released: u256
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        payees: Span<ContractAddress>,
        shares: Span<u16>
    ) {
        assert(payees.len() <= 3, super::Errors::MAX_PAYEES_EXCEED);
        assert(shares.len() == payees.len(), super::Errors::SHARES_PAYEES_NOT_EQ);

        for i in 0..payees.len() {
            self.payees.append().write(*payees.at(i));

            let shares = *shares.at(i);
            assert(shares.is_non_zero(), super::Errors::ZERO_AMOUNT);
            self.shares.entry(*payees.at(i)).write(shares);

            let total_shares = self.total_shares.read();
            self.total_shares.write(total_shares + shares.into());
        };
    }

    // #[abi(embed_v0)]
    // impl InitializerImpl of IReceiverInitializer<ContractState> {
    //     // fn add_third_payee(
    //     //     ref self: ContractState,
    //     //     payee: ContractAddress,
    //     //     shares: u16
    //     // ) {
    //     //     let payees_len = self.payees.len();
    //     //     assert(payees_len + 1 == 3, super::Errors::MAX_PAYEES_EXCEED);

    //     //     let is_payee = false;
    //     //     for i in 0..payees_len {
    //     //         if get_caller_address() == self.payees.at(i).read() {
    //     //             is_payee = true;
    //     //             break;
    //     //         }
    //     //     };

    //     //     assert(is_payee, super::Errors::NOT_A_PAYEE_CALL);
    //     //     self.payees.append().write(payee);

    //     // }
    // }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        //TODO: add getters
        #[external(v0)]
        fn release_all(ref self: ContractState, payment_token: ContractAddress) {
            self._release_all(payment_token);
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _release_all(ref self: ContractState, payment_token: ContractAddress) {
            for i in 0..self.payees.len() {
                let payee = self.payees.at(i).read();
                let token = IERC20Dispatcher { contract_address: payment_token };

                let already_released = self.released.read(payee);
                let total_released = self.total_released.read();
                let total_received = (
                    token.balance_of(get_contract_address()) + total_released
                );

                let payment: u256 = 
                    total_received * self.shares.read(payee).into() / self.total_shares.read();

                let to_release = if payment <= already_released {
                    0
                } else {
                    payment - already_released
                };

                assert(to_release.is_non_zero(), super::Errors::ACCOUNT_NOT_DUE_PAYMENT);

                self.total_released.write(total_released + to_release);
                self.released.write(payee, to_release);

                token.transfer(payee, to_release);

                self.emit(Event::PaymentReleasedEvent(PaymentReleased { payment_token, payee, released: to_release }));
            };
        }
    }
}
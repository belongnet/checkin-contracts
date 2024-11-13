// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.17.0

mod Errors {
    pub const MAX_PAYEES_EXCEED: felt252 = 'Max amount of payees exceed';
    pub const SHARES_PAYEES_NOT_EQ: felt252 = 'Shares amount != Payees amount';
    pub const ZERO_AMOUNT: felt252 = 'Zero amount passed';
    pub const ACCOUNT_NOT_DUE_PAYMENT: felt252 = 'Account not due payment';
    pub const ONLY_PAYEE: felt252 = 'Only payee call';
    
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
    use crate::nftfactory::interface::{INFTFactoryInfoDispatcher, INFTFactoryInfoDispatcherTrait};
    use core::num::traits::Zero;
    use starknet::{
        ContractAddress,
        get_caller_address,
        get_contract_address,
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

    pub const ARRAY_SIZE: u8 = 3;
    pub const TOTAL_SHARES: u16 = 10000;
    pub const AMOUNT_TO_CREATOR: u16 = 8000;
    pub const AMOUNT_TO_PLATFORM: u16 = 2000;

    #[constructor]
    fn constructor(
        ref self: ContractState,
        referral_code: felt252,
        payees: Span<ContractAddress>
    ) {
        assert(payees.len() <= ARRAY_SIZE.into(), super::Errors::MAX_PAYEES_EXCEED);

        let referral_exist = payees.at(2).is_non_zero();

        let mut array_size: u32 = ARRAY_SIZE.into();
        if !referral_exist {
            array_size -= 1
        }

        let mut amount_to_platform: u256 = AMOUNT_TO_PLATFORM.into();
        let mut amount_to_referral: u256 = 0;

        if referral_exist {
            amount_to_referral = INFTFactoryInfoDispatcher { contract_address: get_caller_address() }.getReferralRate(
                *payees.at(0),
                referral_code,
                amount_to_platform
            );
            amount_to_platform -= amount_to_referral;
        }

        for i in 0..array_size {
            self.payees.append().write(*payees.at(i));
        };

        self.shares.entry(*payees.at(0)).write(AMOUNT_TO_CREATOR.into());
        self.shares.entry(*payees.at(1)).write(amount_to_platform.try_into().unwrap());
        self.shares.entry(*payees.at(2)).write(amount_to_referral.try_into().unwrap());
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        //TODO: add getters
        #[external(v0)]
        fn releaseAll(ref self: ContractState, payment_token: ContractAddress) {
            self._release_all(payment_token);
        }

        #[external(v0)]
        fn release(ref self: ContractState, payment_token: ContractAddress, to: ContractAddress) {
            self._only_to_payee(to);
            self._release(payment_token, to);
        }

        #[external(v0)]
        fn totalReleased(self: @ContractState) -> u256 {
            return self._total_released();
        }

        #[external(v0)]
        fn released(self: @ContractState, account: ContractAddress) -> u256 {
            return self._released(account);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _release_all(ref self: ContractState, payment_token: ContractAddress) {
            for i in 0..self.payees.len() {
                self._release(payment_token, self.payees.at(i).read());
            };
        }

        fn _release(ref self: ContractState, payment_token: ContractAddress, to: ContractAddress) {
            let token = IERC20Dispatcher { contract_address: payment_token };

            let already_released = self._released(to);
            let total_released = self._total_released();
            let total_received = (
                token.balance_of(get_contract_address()) + total_released
            );

            let payment: u256 = 
                total_received * self.shares.read(to).into() / TOTAL_SHARES.into();

            let to_release = if payment <= already_released {
                0
            } else {
                payment - already_released
            };

            assert(to_release.is_non_zero(), super::Errors::ACCOUNT_NOT_DUE_PAYMENT);

            self.total_released.write(total_released + to_release);
            self.released.write(to, to_release);

            token.transfer(to, to_release);

            self.emit(Event::PaymentReleasedEvent(PaymentReleased { payment_token, payee: to, released: to_release }));
            
        }

        fn _total_released(self: @ContractState) -> u256 {
            self.total_released.read()
        }

        fn _released(self: @ContractState, account: ContractAddress) -> u256 {
            self.released.read(account)
        }

        fn _only_to_payee(self: @ContractState, to: ContractAddress) {
            let mut is_payee = false;

            for i in 0..self.payees.len() {
                if to == self.payees.at(i).read() {
                    is_payee = true;
                    break;
                }
            };

            assert(is_payee, super::Errors::ONLY_PAYEE);
        }
    }
}
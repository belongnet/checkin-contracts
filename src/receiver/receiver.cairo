// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.17.0

mod Errors {
    pub const SHARES_PAYEES_NOT_EQ: felt252 = 'Shares amount != Payees amount';
    pub const ZERO_AMOUNT: felt252 = 'Zero amount passed';
    pub const ZERO_ADDRESS: felt252 = 'Zero address called';
    pub const ACCOUNT_NOT_DUE_PAYMENT: felt252 = 'Account not due payment';
    pub const ONLY_PAYEE: felt252 = 'Only payee call';
}

#[starknet::contract]
pub mod Receiver {
    use core::num::traits::Zero;
    use starknet::{
        ContractAddress, event::EventEmitter, get_caller_address, get_contract_address,
        storage::{
            StoragePointerReadAccess, StoragePointerWriteAccess, Map, Vec, VecTrait,
            MutableVecTrait, StoragePathEntry, StorageMapReadAccess, StorageMapWriteAccess,
        },
    };
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::{
        receiver::interface::IReceiver,
        nftfactory::interface::{INFTFactoryDispatcher, INFTFactoryDispatcherTrait},
    };

    #[storage]
    struct Storage {
        payees: Vec<ContractAddress>,
        shares: Map<ContractAddress, u16>,
        total_released: u256,
        released: Map<ContractAddress, u256>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        PaymentReleasedEvent: PaymentReleased,
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    pub struct PaymentReleased {
        #[key]
        pub payment_token: ContractAddress,
        #[key]
        pub payee: ContractAddress,
        pub released: u256,
    }

    pub const TOTAL_SHARES: u16 = 10000;
    pub const AMOUNT_TO_CREATOR: u16 = 8000;
    pub const AMOUNT_TO_PLATFORM: u16 = 2000;

    #[constructor]
    fn constructor(
        ref self: ContractState,
        referral_code: felt252,
        creator: ContractAddress,
        platform: ContractAddress,
        referral: ContractAddress,
    ) {
        let referral_exist = referral.is_non_zero() && referral_code.is_non_zero();

        let mut amount_to_platform: u256 = AMOUNT_TO_PLATFORM.into();
        let mut amount_to_referral: u256 = 0;

        if referral_exist {
            amount_to_referral = INFTFactoryDispatcher { contract_address: get_caller_address() }
                .getReferralRate(creator, referral_code, amount_to_platform);
            amount_to_platform -= amount_to_referral;

            self.shares.entry(referral).write(amount_to_referral.try_into().unwrap());
        }

        self.shares.entry(creator).write(AMOUNT_TO_CREATOR.into());
        self.shares.entry(platform).write(amount_to_platform.try_into().unwrap());

        self.payees.append().write(creator);
        self.payees.append().write(platform);
        self.payees.append().write(referral);
    }

    #[abi(embed_v0)]
    impl ReceiverImpl of IReceiver<ContractState> {
        fn releaseAll(ref self: ContractState, payment_token: ContractAddress) {
            self._release_all(payment_token);
        }

        fn released(self: @ContractState, account: ContractAddress) -> u256 {
            self.released.read(account)
        }

        fn totalReleased(self: @ContractState) -> u256 {
            self.total_released.read()
        }

        fn payees(self: @ContractState) -> Span<ContractAddress> {
            let mut payees = array![];

            for i in 0..self.payees.len() {
                payees.append(self.payees.at(i).read());
            };

            return payees.span();
        }

        fn shares(self: @ContractState, account: ContractAddress) -> u16 {
            return self.shares.read(account);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _release_all(ref self: ContractState, payment_token: ContractAddress) {
            for i in 0..self.payees.len() {
                self._release(payment_token, self.payees.at(i).read());
            };
        }

        fn _release(
            ref self: ContractState, payment_token: ContractAddress, to: ContractAddress,
        ) -> u256 {
            let token = IERC20Dispatcher { contract_address: payment_token };

            let total_released = self.total_released.read();
            let released = self.released.read(to);

            let to_release = self
                ._pending_payment(
                    to, token.balance_of(get_contract_address()) + total_released, released,
                );

            if to_release == 0 {
                return 0;
            }

            self.released.write(to, released + to_release);
            self.total_released.write(total_released + to_release);

            token.transfer(to, to_release);

            self
                .emit(
                    Event::PaymentReleasedEvent(
                        PaymentReleased { payment_token, payee: to, released: to_release },
                    ),
                );

            to_release
        }

        fn _pending_payment(
            self: @ContractState,
            account: ContractAddress,
            total_received: u256,
            already_released: u256,
        ) -> u256 {
            let payment = (total_received * self.shares.read(account).into()) / TOTAL_SHARES.into();

            if payment <= already_released {
                return 0;
            }

            return payment - already_released;
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

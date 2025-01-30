// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.19.0

#[starknet::contract]
pub mod ERC20Mock {
    use starknet::ContractAddress;
    use openzeppelin::token::erc20::{ERC20Component, ERC20HooksEmptyImpl};
    use crate::mocks::erc20mockinterface::IERC20Mintable;

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);

    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;

    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.erc20.initializer("ERC20Mock", "ERC20MOCK");
    }

    #[abi(embed_v0)]
    impl ExternalImpl of IERC20Mintable<ContractState> {
        fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            self.erc20.mint(recipient, amount);
        }
    }
}

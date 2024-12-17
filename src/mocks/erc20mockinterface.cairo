use starknet::ContractAddress;

#[starknet::interface]
pub trait IERC20Mintable<TState> {
    fn mint(ref self: TState, recipient: ContractAddress, amount: u256);
}

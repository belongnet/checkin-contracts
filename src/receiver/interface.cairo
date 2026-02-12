use starknet::ContractAddress;

#[starknet::interface]
pub trait IReceiver<TState> {
    fn releaseAll(ref self: TState, payment_token: ContractAddress);

    fn totalReleased(self: @TState) -> u256;

    fn released(self: @TState, account: ContractAddress) -> u256;

    fn payees(self: @TState) -> Span<ContractAddress>;

    fn shares(self: @TState, account: ContractAddress) -> u16;
}

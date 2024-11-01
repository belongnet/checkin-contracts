use starknet::ContractAddress;

#[starknet::interface]
pub trait INFTFactoryReadData<TState> {
    fn platform_params(self: @TState) -> (u256, ContractAddress);

    fn referral_rate(self: @TState, referral_user: ContractAddress, referral_code: felt252, amount: u256) -> u256;

    fn referral_creator(self: @TState, referral_code: felt252) -> ContractAddress;
}
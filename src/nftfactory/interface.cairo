use starknet::ContractAddress;

#[starknet::interface]
pub trait INFTFactoryInfo<TState> {
    fn max_array_size(self: @TState) -> u256;

    fn signer_public_key(self: @TState) -> felt252;

    fn platform_params(self: @TState) -> (u256, ContractAddress);

    fn referral_code(self: @TState, account: ContractAddress) -> felt252;

    fn getReferralRate(self: @TState, referral_user: ContractAddress, referral_code: felt252, amount: u256) -> u256;

    fn getReferralCreator(self: @TState, referral_code: felt252) -> ContractAddress;

    fn getReferralUsers(self: @TState, referral_code: felt252) -> Span<ContractAddress>;
}
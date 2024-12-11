use starknet::{ContractAddress, ClassHash};

#[derive(Drop, Serde, Copy, starknet::Store)]
pub struct FactoryParameters {
    pub signer: ContractAddress,
    pub default_payment_currency: ContractAddress,
    pub platform_address: ContractAddress,
    pub platform_commission: u256,
    pub max_array_size: u256,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct NftInfo {
    pub name: ByteArray,
    pub symbol: ByteArray,
    pub creator: ContractAddress,
    pub nft_address: ContractAddress,
    pub receiver_address: ContractAddress
}

#[derive(Clone, Drop, Serde)]
pub struct InstanceInfo {
    pub name: ByteArray,
    pub symbol: ByteArray,
    pub contract_uri: ByteArray,
    pub payment_token: ContractAddress,
    pub royalty_fraction: u128,
    pub transferrable: bool,
    pub max_total_supply: u256,         // The max total supply of a new collection
    pub mint_price: u256,               // Mint price of a token from a new collection
    pub whitelisted_mint_price: u256,     // Mint price for whitelisted users
    pub collection_expires: u256,       // Collection expiration period (timestamp)
    pub referral_code: felt252,
    pub signature: Array<felt252>
}

#[derive(Clone, Drop, Serde)]
pub struct SignatureRS {
    pub r: felt252,
    pub s: felt252,
}

#[starknet::interface]
pub trait INFTFactory<TState> {
    fn initialize(
        ref self: TState,
        nft_class_hash: ClassHash,
        receiver_class_hash: ClassHash,
        factory_parameters: FactoryParameters,
        percentages: Span<u16>
    );

    fn produce(ref self: TState, instance_info: InstanceInfo) -> (ContractAddress, ContractAddress);

    fn createReferralCode(ref self: TState) -> felt252;

    fn updateNftClassHash(ref self: TState, class_hash: ClassHash);

    fn updateReceiverClassHash(ref self: TState, class_hash: ClassHash);

    fn setFactoryParameters(ref self: TState, factory_parameters: FactoryParameters);

    fn setReferralPercentages(ref self: TState, percentages: Span<u16>);

    fn nftInfo(self: @TState, name: ByteArray, symbol: ByteArray) -> NftInfo;

    fn nftFactoryParameters(self: @TState) -> FactoryParameters;

    fn maxArraySize(self: @TState) -> u256;

    fn signer(self: @TState) -> ContractAddress;

    fn platformParams(self: @TState) -> (u256, ContractAddress);

    fn usedToPercentage(self: @TState, timesUsed: u8) -> u16;

    fn referralCode(self: @TState, account: ContractAddress) -> felt252;

    fn getReferralRate(self: @TState, referral_user: ContractAddress, referral_code: felt252, amount: u256) -> u256;

    fn getReferralCreator(self: @TState, referral_code: felt252) -> ContractAddress;

    fn getReferralUsers(self: @TState, referral_code: felt252) -> Span<ContractAddress>;
}
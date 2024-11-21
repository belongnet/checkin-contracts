use starknet::{ContractAddress, ClassHash};

#[derive(Drop, Serde, starknet::Store)]
pub struct FactoryParameters {
    pub signer_public_key: felt252,
    pub default_payment_currency: ContractAddress,
    pub platform_address: ContractAddress,
    pub platform_commission: u256,
    pub max_array_size: u256,
}

#[derive(Clone, Drop, Serde, starknet::Store)]
pub struct NftMetadata {
    pub name: ByteArray,
    pub symbol: ByteArray,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct NftInfo {
    pub nft_metadata: NftMetadata,
    pub creator: ContractAddress,
    pub nft_address: ContractAddress
}

#[derive(Clone, Drop, Serde, starknet::Store)]
pub struct InstanceInfo {
    pub nft_metadata: NftMetadata,
    pub contract_uri: felt252,
    pub payment_token: ContractAddress,
    pub fee_receiver: ContractAddress,
    pub royalty_fraction: felt252,
    pub transferrable: bool,
    pub max_total_supply: u256,         // The max total supply of a new collection
    pub mint_price: u256,               // Mint price of a token from a new collection
    pub whitelisted_mint_price: u256,     // Mint price for whitelisted users
    pub collection_expires: u256,       // Collection expiration period (timestamp)
    pub referral_code: felt252,
}

#[derive(Drop, Serde, starknet::Store)]
pub struct SignatureRS {
    pub r: felt252,
    pub s: felt252,
}

#[starknet::interface]
pub trait INFTFactory<TState> {
    fn produce(ref self: TState, instance_info: InstanceInfo, signature: SignatureRS) -> ContractAddress;

    fn update_nft_class_hash(ref self: TState, class_hash: ClassHash);

    fn update_receiver_class_hash(ref self: TState, class_hash: ClassHash);

    fn set_factory_parameters(ref self: TState, factory_parameters: FactoryParameters);

    fn set_referral_percentages(ref self: TState, percentages: Span<u16>);

    fn nft_info(self: @TState, nft_metadata: NftMetadata) -> NftInfo;

    fn nftFactoryParameters(self: @TState) -> FactoryParameters;

    fn max_array_size(self: @TState) -> u256;

    fn signer_public_key(self: @TState) -> felt252;

    fn platform_params(self: @TState) -> (u256, ContractAddress);

    fn referral_code(self: @TState, account: ContractAddress) -> felt252;

    fn getReferralRate(self: @TState, referral_user: ContractAddress, referral_code: felt252, amount: u256) -> u256;

    fn getReferralCreator(self: @TState, referral_code: felt252) -> ContractAddress;

    fn getReferralUsers(self: @TState, referral_code: felt252) -> Span<ContractAddress>;
}
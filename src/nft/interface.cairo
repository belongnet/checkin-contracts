use starknet::ContractAddress;

#[derive(Drop, Serde, Copy, starknet::Store)]
pub struct NftParameters {
    pub payment_token: ContractAddress,
    pub contract_uri: felt252,
    // Address of ERC20 paying token (
    //     STRK - 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
    //     ETH - 0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7
    // )
    pub mint_price: u256,               // Mint price of a token from a new collection
    pub whitelisted_mint_price: u256,     // Mint price for whitelisted users
    pub max_total_supply: u256,         // The max total supply of a new collection
    pub collection_expires: u256,       // Collection expiration period (timestamp)
    pub transferrable: bool,
    pub referral_code: felt252
}

#[starknet::interface]
pub trait INFTInitializer<TState> {
    fn initialize(
        ref self: TState,
        nft_parameters: NftParameters,
    ); 
}
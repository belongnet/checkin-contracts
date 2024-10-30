use starknet::ContractAddress;

#[starknet::interface]
pub trait INFTInitializer<TState> {
    fn initialize(
        ref self: TState,
        payment_token: ContractAddress,  
        mint_price: u256,
        whitelisted_mint_price: u256,
        max_total_supply: u256,
        collection_expires: u256,
        transferrable: bool,
        referral_code: ByteArray,
        signature: ByteArray,
    ); 
}
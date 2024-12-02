use starknet::{
    ContractAddress, get_tx_info, get_caller_address
};
use core::{
    poseidon::PoseidonTrait,
    hash::{
        HashStateExTrait, HashStateTrait
    }
};
use crate::utils::snip12::{
    StarknetDomain, SNIP12::StructHashStarknetDomain
};
use crate::utils::interfaces::{
    IMessageHash, IStructHash
};

pub const MESSAGE_TYPE_HASH: felt252 = selector!(
    "\"StaticPriceHash\"(
    \"receiver\":\"ContractAddress\",
    \"token_id\":\"u256\",
    \"whitelisted\":\"bool\",
    \"token_uri\":\"felt\")
    \"u256\"(\"low\":\"felt\",\"high\":\"felt\")"
);

#[derive(Hash, Drop, Copy)]
pub struct StaticPriceHash {
    pub receiver: ContractAddress,
    pub token_id: u256,
    pub whitelisted: bool,
    pub token_uri: felt252,
}

pub impl MessageStaticPriceHash of IMessageHash<StaticPriceHash> {
    fn get_message_hash(self: @StaticPriceHash) -> felt252 {
        let domain = StarknetDomain {
            name: 'NFT', version: '1', chain_id: get_tx_info().unbox().chain_id, revision: 1
        };
        let mut state = PoseidonTrait::new();
        state = state.update_with('StarkNet Message');
        state = state.update_with(domain.get_struct_hash());
        // This can be a field within the struct, it doesn't have to be get_caller_address().
        state = state.update_with(get_caller_address());
        state = state.update_with(self.get_struct_hash());
        state.finalize()
    }
}

impl StructStaticPriceHash of IStructHash<StaticPriceHash> {
    fn get_struct_hash(self: @StaticPriceHash) -> felt252 {
        let mut state = PoseidonTrait::new();
        state = state.update_with(MESSAGE_TYPE_HASH);
        state = state.update_with(*self);
        state.finalize()
    }
}
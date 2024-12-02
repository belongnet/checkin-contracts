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
    "\"DynamicPriceHash\"(
    \"receiver\":\"ContractAddress\",
    \"token_id\":\"u256\",
    \"price\":\"u256\",
    \"token_uri\":\"felt\")
    \"u256\"(\"low\":\"felt\",\"high\":\"felt\")"
);

#[derive(Hash, Drop, Copy)]
pub struct DynamicPriceHash {
    pub receiver: ContractAddress,
    pub token_id: u256,
    pub price: u256,
    pub token_uri: felt252,
}

pub impl MessageDynamicPriceHash of IMessageHash<DynamicPriceHash> {
    fn get_message_hash(self: @DynamicPriceHash) -> felt252 {
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

impl StructDynamicPriceHash of IStructHash<DynamicPriceHash> {
    fn get_struct_hash(self: @DynamicPriceHash) -> felt252 {
        let mut state = PoseidonTrait::new();
        state = state.update_with(MESSAGE_TYPE_HASH);
        state = state.update_with(*self);
        state.finalize()
    }
}
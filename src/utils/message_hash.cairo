use starknet::{get_tx_info, get_caller_address};
use core::{
    poseidon::PoseidonTrait,
    hash::{HashStateExTrait, HashStateTrait, Hash}
};
use crate::utils::snip12::{StarknetDomain, SNIP12::StructHashStarknetDomain};
use crate::utils::interfaces::{IOffChainMessageHash, IStructHash};

pub const MESSAGE_TYPE_HASH: felt252 = selector!(
    "\"MessageHash\"(
    \"name_hash\":\"felt\",
    \"symbol_hash\":\"felt\",
    \"contract_uri\":\"felt\",
    \"royalty_fraction\":\"u128\")"
);

#[derive(Copy, Drop, Hash)]
pub struct MessageHash {
    pub name_hash: felt252,
    pub symbol_hash: felt252,
    pub contract_uri: felt252,
    pub royalty_fraction: u128,
}

pub impl OffChainMessageHash of IOffChainMessageHash<MessageHash> {
    fn get_message_hash(self: @MessageHash) -> felt252 {
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

impl StructMessageHash of IStructHash<MessageHash> {
    fn get_struct_hash(self: @MessageHash) -> felt252 {
        let mut state = PoseidonTrait::new();
        state = state.update_with(MESSAGE_TYPE_HASH);
        state = state.update_with(*self);
        state.finalize()
    }
}
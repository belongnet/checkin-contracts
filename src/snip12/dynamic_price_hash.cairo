use starknet::{ContractAddress, get_tx_info, get_caller_address};
use core::{poseidon::PoseidonTrait, hash::{HashStateExTrait, HashStateTrait}};
use crate::snip12::{
    interfaces::{IMessageHash, IStructHash}, snip12::SNIP12::StarknetDomain,
    u256_hash::StructHashU256,
};

pub const MESSAGE_TYPE_HASH: felt252 = selector!(
    "\"DynamicPriceHash\"(\"receiver\":\"ContractAddress\",\"token_id\":\"u256\",\"price\":\"u256\",\"token_uri\":\"felt\")\"u256\"(\"low\":\"u128\",\"high\":\"u128\")",
);

#[derive(Hash, Drop, Copy)]
pub struct DynamicPriceHash {
    pub receiver: ContractAddress,
    pub token_id: u256,
    pub price: u256,
    pub token_uri: felt252,
}

pub impl MessageDynamicPriceHash of IMessageHash<DynamicPriceHash> {
    fn get_message_hash(self: @DynamicPriceHash, contract: ContractAddress) -> felt252 {
        let domain = StarknetDomain {
            name: 'NFT', version: '1', chain_id: get_tx_info().unbox().chain_id, revision: 1,
        };
        let mut state = PoseidonTrait::new();
        state = state.update_with('StarkNet Message');
        state = state.update_with(domain.get_struct_hash());
        // This can be a field within the struct, it doesn't have to be get_caller_address().
        state = state.update_with(contract);
        state = state.update_with(self.get_struct_hash());
        state.finalize()
    }
}

impl StructDynamicPriceHash of IStructHash<DynamicPriceHash> {
    fn get_struct_hash(self: @DynamicPriceHash) -> felt252 {
        let mut state = PoseidonTrait::new();
        state = state.update_with(MESSAGE_TYPE_HASH);
        state = state.update_with(*self.receiver);
        state = state.update_with(self.token_id.get_struct_hash());
        state = state.update_with(self.price.get_struct_hash());
        state = state.update_with(*self.token_uri);
        state.finalize()
    }
}

#[cfg(test)]
mod tests {
    use super::{DynamicPriceHash, IMessageHash};
    use snforge_std::start_cheat_caller_address_global;
    #[test]
    fn test_valid_hash() {
        // This value was computed using StarknetJS
        let message_hash = 0x6ab4badd6739b9e3b15e3f23ea0ca219a0b2277bbc62dd838efe06bd19e7fad;
        let dynamic_price_hash = DynamicPriceHash {
            receiver: 123.try_into().unwrap(), token_id: 456, price: 789, token_uri: 101112,
        };

        start_cheat_caller_address_global(1337.try_into().unwrap());
        assert_eq!(dynamic_price_hash.get_message_hash(1337.try_into().unwrap()), message_hash);
    }
}

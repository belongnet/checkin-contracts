use starknet::{
    ContractAddress, get_tx_info, get_caller_address
};
use core::{
    poseidon::PoseidonTrait,
    hash::{
        HashStateExTrait, HashStateTrait
    }
};
use crate::snip12::{
    interfaces::{
        IMessageHash, IStructHash
    },
    snip12::SNIP12::StarknetDomain,
    u256_hash::StructHashU256
};

pub const MESSAGE_TYPE_HASH: felt252 = selector!(
    "\"StaticPriceHash\"(\"receiver\":\"ContractAddress\",\"token_id\":\"u256\",\"whitelisted\":\"bool\",\"token_uri\":\"felt\")\"u256\"(\"low\":\"u128\",\"high\":\"u128\")"
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
        state = state.update_with(*self.receiver);
        state = state.update_with(self.token_id.get_struct_hash());
        state = state.update_with(*self.whitelisted);
        state = state.update_with(*self.token_uri);
        state.finalize()
    }
}

#[cfg(test)]
mod tests {
    use super::{StaticPriceHash, IMessageHash};
    use snforge_std::start_cheat_caller_address_global;
    #[test]
    fn test_valid_hash() {
        // This value was computed using StarknetJS
        let message_hash = 0x1aacaf53a0c9f07a6961b45899f2e7b939268219a48406f5905d1981f73b793;
        let dynamic_price_hash = StaticPriceHash { 
            receiver: 123.try_into().unwrap(),
            token_id: 456,
            whitelisted: true,
            token_uri: 101112 
        };

        start_cheat_caller_address_global(1337.try_into().unwrap());
        assert_eq!(dynamic_price_hash.get_message_hash(), message_hash);
    }
}
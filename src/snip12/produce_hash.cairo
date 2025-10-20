use core::{poseidon::PoseidonTrait, hash::{HashStateExTrait, HashStateTrait}};
use starknet::{ContractAddress, get_tx_info};
use crate::snip12::{snip12::SNIP12::StarknetDomain, interfaces::{IMessageHash, IStructHash}};

pub const MESSAGE_TYPE_HASH: felt252 = selector!(
    "\"ProduceHash\"(\"creator_address\":\"ContractAddress\",\"name_hash\":\"felt\",\"symbol_hash\":\"felt\",\"contract_uri\":\"felt\",\"royalty_fraction\":\"u128\")",
);

#[derive(Hash, Drop, Copy)]
pub struct ProduceHash {
    pub creator_address: ContractAddress,
    pub name_hash: felt252,
    pub symbol_hash: felt252,
    pub contract_uri_hash: felt252,
    pub royalty_fraction: u128,
}

pub impl MessageProduceHash of IMessageHash<ProduceHash> {
    fn get_message_hash(self: @ProduceHash, signer: ContractAddress) -> felt252 {
        let domain = StarknetDomain {
            name: 'NFTFactory', version: '1', chain_id: get_tx_info().unbox().chain_id, revision: 1,
        };
        let mut state = PoseidonTrait::new();
        state = state.update_with('StarkNet Message');
        state = state.update_with(domain.get_struct_hash());
        // This can be a field within the struct, it doesn't have to be get_caller_address().
        state = state.update_with(signer);
        state = state.update_with(self.get_struct_hash());
        state.finalize()
    }
}

impl StructProduceHash of IStructHash<ProduceHash> {
    fn get_struct_hash(self: @ProduceHash) -> felt252 {
        let mut state = PoseidonTrait::new();
        state = state.update_with(MESSAGE_TYPE_HASH);
        state = state.update_with(*self);
        state.finalize()
    }
}

#[cfg(test)]
mod tests {
    use super::{ProduceHash, IMessageHash};
    use snforge_std::start_cheat_caller_address_global;
    #[test]
    fn test_valid_hash() {
        // This value was computed using StarknetJS
        let message_hash = 0x55dd2dbd7ecf4c06a432bbb17fbb85d342958c428e198533f509250f5ef47e2;
        let produce_hash = ProduceHash {
            creator_address: 123.try_into().unwrap(),
            name_hash: 456,
            symbol_hash: 789,
            contract_uri_hash: 101112,
            royalty_fraction: 131415,
        };

        start_cheat_caller_address_global(1337.try_into().unwrap());
        assert_eq!(produce_hash.get_message_hash(1337.try_into().unwrap()), message_hash);
    }
}

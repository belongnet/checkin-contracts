use crate::utils::interfaces::IStructHash;

pub const STARKNET_DOMAIN_TYPE_HASH: felt252 =
selector!(
    "\"StarknetDomain\"(
    \"name\":\"shortstring\",
    \"version\":\"shortstring\",
    \"chainId\":\"shortstring\",
    \"revision\":\"shortstring\")"
);

/// @notice StarknetDomain using SNIP 12
#[derive(Hash, Drop, Copy)]
pub struct StarknetDomain {
    pub name: felt252,
    pub version: felt252,
    pub chain_id: felt252,
    pub revision: felt252,
}

pub mod SNIP12 {
    use core::poseidon::poseidon_hash_span;
    use super::{StarknetDomain, STARKNET_DOMAIN_TYPE_HASH};

    pub impl StructHashStarknetDomain of super::IStructHash<StarknetDomain> {
        fn get_struct_hash(self: @StarknetDomain) -> felt252 {
            poseidon_hash_span(
                array![
                    STARKNET_DOMAIN_TYPE_HASH,
                    *self.name,
                    *self.version,
                    *self.chain_id,
                    *self.revision
                ]
                    .span()
            )
        }
    }
}
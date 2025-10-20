/// Reference to SNIP-12: https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-12.md
use starknet::ContractAddress;

/// @notice Defines the function to generate the SNIP-12
pub trait IMessageHash<T> {
    fn get_message_hash(self: @T, signer: ContractAddress) -> felt252;
}

/// @notice Defines the function to generates the SNIP-12
pub trait IStructHash<T> {
    fn get_struct_hash(self: @T) -> felt252;
}

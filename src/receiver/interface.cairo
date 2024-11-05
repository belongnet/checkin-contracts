#[starknet::interface]
pub trait IReceiverInitializer<TState> {
    fn initialize(
        ref self: TState
    ); 
}
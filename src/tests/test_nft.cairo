use crate::nft::interface::{INFTDispatcher, INFTDispatcherTrait};
use crate::nft::nft::{NFT};
// Import the deploy syscall to be able to deploy the contract.
use starknet::{ContractAddress, SyscallResultTrait, syscalls::deploy_syscall, get_contract_address, contract_address_const};
// Use starknet test utils to fake the contract_address
use starknet::testing::set_contract_address;
use openzeppelin::token::erc721::interface::{ERC721ABIDispatcher, ERC721ABIDispatcherTrait};

// Deploy the contract and return its dispatcher.
fn deploy(
    creator: ContractAddress,
    factory: ContractAddress,
    name: felt252, 
    symbol: felt252,
    fee_receiver: ContractAddress,
    royalty_fraction: u128
) -> ContractAddress {
    // Declare and deploy
    let (contract_address, _) = deploy_syscall(
        NFT::TEST_CLASS_HASH.try_into().unwrap(),
        0,
        array![
            creator.into(),
            factory.into(),
            name,
            symbol,
            fee_receiver.into(),
            royalty_fraction.into()
            ].span(),
        false
    ).unwrap_syscall();

    contract_address
}

#[test]
fn test_deploy() {
    // Fake the contract address to creator
    let creator = contract_address_const::<'creator'>();
    let factory = contract_address_const::<'factory'>();
    let fee_receiver = contract_address_const::<'fee_receiver'>();

    let contract = deploy(
        creator,
        factory,
        'Name',
        'Symbol',
        fee_receiver,
        600
    );

    let nft = ERC721ABIDispatcher {contract_address: contract};

    assert_eq!(nft.name(), "Name");
    assert_eq!(nft.symbol(), "Symbol");
}

// pub fn NAME() -> ByteArray {
//     "NAME"
// }
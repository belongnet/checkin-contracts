use crate::nft::interface::{INFTDispatcher, INFTDispatcherTrait};
use crate::nft::nft::{NFT};
// Import the deploy syscall to be able to deploy the contract.
use starknet::{ContractAddress, SyscallResultTrait, get_contract_address, contract_address_const};
// Use starknet test utils to fake the contract_address
use starknet::testing::set_contract_address;
use openzeppelin::{
    utils::serde::SerializedAppend,
    token::erc721::interface::{ERC721ABIDispatcher, ERC721ABIDispatcherTrait},
    access::ownable::interface::{IOwnableDispatcher, IOwnableDispatcherTrait}
};
use snforge_std::{declare, ContractClassTrait, DeclareResultTrait};
use crate::utils as utils;

// Deploy the contract and return its dispatcher.
fn deploy() -> ContractAddress {
    let contract = declare("NFT").unwrap().contract_class();

    let mut calldata = array![];
    calldata.append_serde(utils::CREATOR());
    calldata.append_serde(utils::FACTORY());
    calldata.append_serde(utils::NAME());
    calldata.append_serde(utils::SYMBOL());
    calldata.append_serde(utils::RECEIVER());
    calldata.append_serde(utils::FRACTION());

    // Declare and deploy
    let (contract_address, _) = contract.deploy(
        @calldata
    ).unwrap();

    contract_address
}

#[test]
fn test_deploy() {
    let contract = deploy();

    let nft = ERC721ABIDispatcher {contract_address: contract};
    let ownable = IOwnableDispatcher {contract_address: contract};
    let contract = INFTDispatcher {contract_address: contract};

    assert_eq!(nft.name(), utils::NAME());
    assert_eq!(nft.symbol(), utils::SYMBOL());
    assert_eq!(contract.creator(), utils::CREATOR());
    assert_eq!(contract.factory(), utils::FACTORY());
    assert_eq!(ownable.owner(), utils::CREATOR());
}
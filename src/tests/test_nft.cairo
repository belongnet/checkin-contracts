use crate::nft::interface::{INFTDispatcher, INFTDispatcherTrait, NftParameters};
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
use snforge_std::{
    declare,
    start_cheat_caller_address,
    stop_cheat_caller_address,
    spy_events,
    EventSpyAssertionsTrait,
    ContractClassTrait,
    DeclareResultTrait
};
use crate::utils::constants as constants;

// Deploy the contract and return its dispatcher.
fn deploy() -> ContractAddress {
    let contract = declare("NFT").unwrap().contract_class();

    let mut calldata = array![];
    calldata.append_serde(constants::CREATOR());
    calldata.append_serde(constants::FACTORY());
    calldata.append_serde(constants::NAME());
    calldata.append_serde(constants::SYMBOL());
    calldata.append_serde(constants::RECEIVER());
    calldata.append_serde(constants::FRACTION());

    // Declare and deploy
    let (contract_address, _) = contract.deploy(
        @calldata
    ).unwrap();

    contract_address
}

#[test]
fn test_deploy() {
    let contract = deploy();

    let erc721 = ERC721ABIDispatcher {contract_address: contract};
    let ownable = IOwnableDispatcher {contract_address: contract};
    let nft = INFTDispatcher {contract_address: contract};

    assert_eq!(erc721.name(), constants::NAME());
    assert_eq!(erc721.symbol(), constants::SYMBOL());
    assert_eq!(nft.creator(), constants::CREATOR());
    assert_eq!(nft.factory(), constants::FACTORY());
    assert_eq!(ownable.owner(), constants::CREATOR());
}

#[test]
#[should_panic(expected: 'Only Factory can call')]
fn test_initialize() {
    let contract = deploy();

    let nft = INFTDispatcher {contract_address: contract};

    let nft_parameters = NftParameters {
        payment_token: contract_address_const::<0>(),
        contract_uri: 'uri/uri',
        mint_price: 200,
        whitelisted_mint_price: 100,
        max_total_supply: 1000,
        collection_expires: 1010101010110010100,
        transferrable: true,
        referral_code: '0x000',
    };

    nft.initialize(nft_parameters);

    start_cheat_caller_address(contract, constants::FACTORY());

    nft.initialize(nft_parameters);

    assert_eq!(nft.nftParameters().payment_token, nft_parameters.payment_token);
    assert_eq!(nft.nftParameters().contract_uri, nft_parameters.contract_uri);
    assert_eq!(nft.nftParameters().mint_price, nft_parameters.mint_price);
    assert_eq!(nft.nftParameters().whitelisted_mint_price, nft_parameters.whitelisted_mint_price);
    assert_eq!(nft.nftParameters().max_total_supply, nft_parameters.max_total_supply);
    assert_eq!(nft.nftParameters().max_total_supply, nft_parameters.max_total_supply);
    assert_eq!(nft.nftParameters().collection_expires, nft_parameters.collection_expires);
    assert_eq!(nft.nftParameters().transferrable, nft_parameters.transferrable);
    assert_eq!(nft.nftParameters().referral_code, nft_parameters.referral_code);
}

#[test]
#[should_panic(expected: 'Initialize only once')]
fn should_call_once_initialize() {
    let contract = deploy();

    let nft = INFTDispatcher {contract_address: contract};

    let nft_parameters = NftParameters {
        payment_token: contract_address_const::<0>(),
        contract_uri: 'uri/uri',
        mint_price: 200,
        whitelisted_mint_price: 100,
        max_total_supply: 1000,
        collection_expires: 1010101010110010100,
        transferrable: true,
        referral_code: '0x000',
    };

    start_cheat_caller_address(contract, constants::FACTORY());

    nft.initialize(nft_parameters);

    nft.initialize(nft_parameters);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_setPaymentInfo() {
    let contract = deploy();

    let nft = INFTDispatcher {contract_address: contract};

    nft.setPaymentInfo(contract_address_const::<1>(), 3000, 0);

    start_cheat_caller_address(contract, constants::CREATOR());

    let mut spy = spy_events();

    nft.setPaymentInfo(contract_address_const::<1>(), 3000, 0);

    spy
        .assert_emitted(
            @array![
                (
                    contract,
                    NFT::Event::PaymentInfoChangedEvent(
                        NFT::PaymentInfoChanged { 
                            payment_token: contract_address_const::<1>(),
                            mint_price: 3000,
                            whitelisted_mint_price: 0
                        }
                    )
                )
            ]
        );

    assert_eq!(nft.nftParameters().payment_token, contract_address_const::<1>());
    assert_eq!(nft.nftParameters().mint_price, 3000);
    assert_eq!(nft.nftParameters().whitelisted_mint_price, 0);
}

#[test]
#[should_panic(expected: 'Zero address passed')]
fn should_not_paste_zero_addr_setPaymentInfo() {
    let contract = deploy();

    let nft = INFTDispatcher {contract_address: contract};

    start_cheat_caller_address(contract, constants::CREATOR());

    nft.setPaymentInfo(contract_address_const::<0>(), 3000, 0);
}

#[test]
#[should_panic(expected: 'Zero amount passed')]
fn should_not_paste_zero_amount_setPaymentInfo() {
    let contract = deploy();

    let nft = INFTDispatcher {contract_address: contract};

    let nft_parameters = NftParameters {
        payment_token: contract_address_const::<0>(),
        contract_uri: 'uri/uri',
        mint_price: 200,
        whitelisted_mint_price: 100,
        max_total_supply: 1000,
        collection_expires: 1010101010110010100,
        transferrable: true,
        referral_code: '0x000',
    };

    start_cheat_caller_address(contract, constants::FACTORY());

    nft.initialize(nft_parameters);

    stop_cheat_caller_address(contract);

    start_cheat_caller_address(contract, constants::CREATOR());

    nft.setPaymentInfo(contract_address_const::<1>(), 0, 0);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_addWhitelisted() {
    let contract = deploy();

    let nft = INFTDispatcher {contract_address: contract};

    nft.addWhitelisted(contract_address_const::<1>());

    start_cheat_caller_address(contract, constants::CREATOR());

    nft.addWhitelisted(contract_address_const::<1>());

    assert_eq!(nft.isWhitelisted(contract_address_const::<1>()), true);
}

#[test]
#[should_panic(expected: 'Address is already whitelisted')]
fn should_not_whitelisted_twice_addWhitelisted() {
    let contract = deploy();

    let nft = INFTDispatcher {contract_address: contract};

    start_cheat_caller_address(contract, constants::CREATOR());

    nft.addWhitelisted(contract_address_const::<1>());

    nft.addWhitelisted(contract_address_const::<1>());
}
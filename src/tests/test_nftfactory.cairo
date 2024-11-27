use crate::nftfactory::interface::{INFTFactoryDispatcher, INFTFactoryDispatcherTrait, FactoryParameters};
use crate::nftfactory::nftfactory::{NFTFactory};
// Import the deploy syscall to be able to deploy the contract.
use starknet::{
    ContractAddress,
    SyscallResultTrait,
    get_contract_address,
    contract_address_const,
    // Use starknet test utils to fake the contract_address
    testing::set_contract_address
};
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
use crate::utils as utils;

// Deploy the contract and return its dispatcher.
fn deploy() -> ContractAddress {
    let contract = declare("NFTFactory").unwrap().contract_class();

    let mut calldata = array![];
    calldata.append_serde(utils::OWNER());

    // Declare and deploy
    let (contract_address, _) = contract.deploy(
        @calldata
    ).unwrap();

    contract_address
}

#[test]
fn test_deploy() {
    let contract = deploy();

    let ownable = IOwnableDispatcher {contract_address: contract};

    assert_eq!(ownable.owner(), utils::CREATOR());
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_initialize() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};
    
    let nft_class_hash = utils::NFT_CLASS_HASH();
    let receiver_class_hash = utils::RECEIVER_CLASS_HASH();

    let factory_parameters = FactoryParameters {
        signer_public_key: 'pk/pk',
        default_payment_currency: utils::CURRENCY(),
        platform_address: utils::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };

    nft_factory.initialize(nft_class_hash, receiver_class_hash, factory_parameters);

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.initialize(nft_class_hash, receiver_class_hash, factory_parameters.clone());

    assert_eq!(nft_factory.nftFactoryParameters().signer_public_key, factory_parameters.signer_public_key);
    assert_eq!(nft_factory.nftFactoryParameters().default_payment_currency, factory_parameters.default_payment_currency);
    assert_eq!(nft_factory.nftFactoryParameters().platform_address, factory_parameters.platform_address);
    assert_eq!(nft_factory.nftFactoryParameters().platform_commission, factory_parameters.platform_commission);
    assert_eq!(nft_factory.nftFactoryParameters().max_array_size, factory_parameters.max_array_size);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_update_nft_class_hash() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};
    
    let nft_class_hash = utils::NFT_CLASS_HASH();

    nft_factory.update_nft_class_hash(nft_class_hash);

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.update_nft_class_hash(nft_class_hash);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_update_receiver_class_hash() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};
    
    let receiver_class_hash = utils::RECEIVER_CLASS_HASH();

    nft_factory.update_receiver_class_hash(receiver_class_hash);

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.update_receiver_class_hash(receiver_class_hash);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_setFactoryParameters() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let factory_parameters = FactoryParameters {
        signer_public_key: 'pk/pk',
        default_payment_currency: utils::CURRENCY(),
        platform_address: utils::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };
    
    nft_factory.setFactoryParameters(factory_parameters);

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.setFactoryParameters(factory_parameters);

    assert_eq!(nft_factory.nftFactoryParameters().signer_public_key, factory_parameters.signer_public_key);
    assert_eq!(nft_factory.nftFactoryParameters().default_payment_currency, factory_parameters.default_payment_currency);
    assert_eq!(nft_factory.nftFactoryParameters().platform_address, factory_parameters.platform_address);
    assert_eq!(nft_factory.nftFactoryParameters().platform_commission, factory_parameters.platform_commission);
    assert_eq!(nft_factory.nftFactoryParameters().max_array_size, factory_parameters.max_array_size);
}

#[test]
#[should_panic(expected: 'Zero address passed')]
fn should_not_paste_singer_pk_0_setFactoryParameters() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let factory_parameters = FactoryParameters {
        signer_public_key: 0,
        default_payment_currency: utils::CURRENCY(),
        platform_address: utils::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.setFactoryParameters(factory_parameters);
}

#[test]
#[should_panic(expected: 'Zero address passed')]
fn should_not_paste_platform_address_0_setFactoryParameters() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let factory_parameters = FactoryParameters {
        signer_public_key: 'dadada',
        default_payment_currency: utils::CURRENCY(),
        platform_address: utils::ZERO_ADDRESS(),
        platform_commission: 100,
        max_array_size: 10,
    };

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.setFactoryParameters(factory_parameters);
}

#[test]
#[should_panic(expected: 'Zero amount passed')]
fn should_not_paste_platform_commission_0_setFactoryParameters() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let factory_parameters = FactoryParameters {
        signer_public_key: 'dadada',
        default_payment_currency: utils::CURRENCY(),
        platform_address: utils::PLATFORM(),
        platform_commission: 0,
        max_array_size: 10,
    };

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.setFactoryParameters(factory_parameters);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_setReferralPercentages() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let percentages = array![10, 20, 30, 40, 50].span();
    
    nft_factory.setReferralPercentages(percentages);

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.setReferralPercentages(percentages);

    for i in 0..percentages.len() {
        assert_eq!(nft_factory.usedToPercentage(i.into()), percentages[i.into()]);
    };
}

#[should_panic(expected: 'Wrong percentages length')]
fn should_paste_correct_array_size_setReferralPercentages() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let percentages = array![10, 20, 30, 40].span();
    
    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.setReferralPercentages(percentages);
}
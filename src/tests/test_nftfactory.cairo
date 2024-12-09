use crate::nftfactory::interface::{INFTFactoryDispatcher, INFTFactoryDispatcherTrait, FactoryParameters, InstanceInfo};
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

fn deploy_mocks() -> ContractAddress {
    let contract = declare("ERC20Mock").unwrap().contract_class();

    let calldata = array![];

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

    assert_eq!(ownable.owner(), utils::OWNER());
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_initialize() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};
    
    let nft_class_hash = utils::NFT_CLASS_HASH();
    let receiver_class_hash = utils::RECEIVER_CLASS_HASH();

    let factory_parameters = FactoryParameters {
        signer: utils::SIGNER(),
        default_payment_currency: utils::CURRENCY(),
        platform_address: utils::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };

    nft_factory.initialize(nft_class_hash, receiver_class_hash, factory_parameters);

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.initialize(nft_class_hash, receiver_class_hash, factory_parameters);

    assert_eq!(nft_factory.nftFactoryParameters().signer, factory_parameters.signer);
    assert_eq!(nft_factory.nftFactoryParameters().default_payment_currency, factory_parameters.default_payment_currency);
    assert_eq!(nft_factory.nftFactoryParameters().platform_address, factory_parameters.platform_address);
    assert_eq!(nft_factory.nftFactoryParameters().platform_commission, factory_parameters.platform_commission);
    assert_eq!(nft_factory.nftFactoryParameters().max_array_size, factory_parameters.max_array_size);

    let (platform_commission, platform_address) = nft_factory.platformParams();
    assert_eq!(nft_factory.maxArraySize(), factory_parameters.max_array_size);
    assert_eq!(nft_factory.signer(), factory_parameters.signer);
    assert_eq!(platform_commission, factory_parameters.platform_commission);
    assert_eq!(platform_address, factory_parameters.platform_address);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_updateNftClassHash() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};
    
    let nft_class_hash = utils::NFT_CLASS_HASH();

    nft_factory.updateNftClassHash(nft_class_hash);

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.updateNftClassHash(nft_class_hash);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_updateReceiverClassHash() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};
    
    let receiver_class_hash = utils::RECEIVER_CLASS_HASH();

    nft_factory.updateReceiverClassHash(receiver_class_hash);

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.updateReceiverClassHash(receiver_class_hash);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_setFactoryParameters() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let factory_parameters = FactoryParameters {
        signer: utils::SIGNER(),
        default_payment_currency: utils::CURRENCY(),
        platform_address: utils::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };
    
    nft_factory.setFactoryParameters(factory_parameters);

    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.setFactoryParameters(factory_parameters);

    assert_eq!(nft_factory.nftFactoryParameters().signer, factory_parameters.signer);
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
        signer: utils::ZERO_ADDRESS(),
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
        signer: utils::SIGNER(),
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
        signer: utils::SIGNER(),
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

    assert_eq!(nft_factory.usedToPercentage(0), *percentages[0]);
    assert_eq!(nft_factory.usedToPercentage(1), *percentages[1]);
    assert_eq!(nft_factory.usedToPercentage(2), *percentages[2]);
    assert_eq!(nft_factory.usedToPercentage(3), *percentages[3]);
    assert_eq!(nft_factory.usedToPercentage(4), *percentages[4]);
}

#[test]
#[should_panic(expected: 'Wrong percentages length')]
fn should_paste_correct_array_size_setReferralPercentages() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let percentages = array![10, 20, 30, 40].span();
    
    start_cheat_caller_address(contract, utils::OWNER());

    nft_factory.setReferralPercentages(percentages);
}

#[test]
#[should_panic(expected: 'User code did not used code')]
fn test_createReferralCode() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    start_cheat_caller_address(contract, utils::CREATOR());

    let mut spy = spy_events();

    let code = nft_factory.createReferralCode();

    spy
        .assert_emitted(
            @array![
                (
                    contract,
                    NFTFactory::Event::ReferralCodeCreatedEvent(
                        NFTFactory::ReferralCodeCreated { 
                            referral_creator: utils::CREATOR(),
                            referral_code: code,
                        }
                    )
                )
            ]
        );

    assert_eq!(code, nft_factory.referralCode(utils::CREATOR()));
    assert_eq!(nft_factory.getReferralCreator(code), utils::CREATOR());

    nft_factory.createReferralCode();
}

#[test]
#[should_panic(expected: 'User code did not used code')]
fn test_produce() {
    let contract = deploy();
    let erc20mock = deploy_mocks();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let instance_info = InstanceInfo {
        name: utils::NAME(),
        symbol: utils::SYMBOL(),
        contract_uri: utils::COUNTRACT_URI(),
        payment_token: erc20mock,
        royalty_fraction: utils::FRACTION(),
        transferrable: true,
        max_total_supply: utils::MAX_TOTAL_SUPPLY(),
        mint_price: utils::MINT_PRICE(),
        whitelisted_mint_price: utils::WL_MINT_PRICE(),
        collection_expires: utils::EXPIRES(),
        referral_code: utils::REFERRAL_CODE(),
        signature: utils::REFERRAL_CODE()
    };

    start_cheat_caller_address(contract, utils::CREATOR());

    let mut spy = spy_events();

    let code = nft_factory.produce();

    spy
        .assert_emitted(
            @array![
                (
                    contract,
                    NFTFactory::Event::ReferralCodeCreatedEvent(
                        NFTFactory::ReferralCodeCreated { 
                            referral_creator: utils::CREATOR(),
                            referral_code: code,
                        }
                    )
                )
            ]
        );

    assert_eq!(code, nft_factory.referralCode(utils::CREATOR()));
    assert_eq!(nft_factory.getReferralCreator(code), utils::CREATOR());

    nft_factory.createReferralCode();
}
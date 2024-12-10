use crate::nftfactory::interface::{INFTFactoryDispatcher, INFTFactoryDispatcherTrait, FactoryParameters, InstanceInfo};
use crate::nftfactory::nftfactory::{NFTFactory};
use crate::snip12::produce_hash::{ProduceHash, MessageProduceHash};
use core::poseidon::poseidon_hash_span;
// Import the deploy syscall to be able to deploy the contract.
use starknet::{
    ContractAddress,
    SyscallResultTrait,
    get_contract_address,
    get_caller_address,
    contract_address_const,
    // Use starknet test utils to fake the contract_address
    testing::set_contract_address,
    secp256k1::{
        Secp256k1Point
    }
};
use openzeppelin::{
    utils::{
        serde::SerializedAppend,
        bytearray::{
            ByteArrayExtImpl, ByteArrayExtTrait
        }
    },
    access::ownable::interface::{IOwnableDispatcher, IOwnableDispatcherTrait}
};
use snforge_std::{
    declare,
    start_cheat_caller_address,
    stop_cheat_caller_address,
    start_cheat_caller_address_global,
    stop_cheat_caller_address_global,
    spy_events,
    EventSpyAssertionsTrait,
    ContractClassTrait,
    DeclareResultTrait,
    signature::stark_curve::{
        StarkCurveKeyPairImpl, StarkCurveSignerImpl, StarkCurveVerifierImpl
    }
};
use crate::utils::signing::StarkSerializedSigning;
use crate::utils::constants as constants;

// Deploy the contract and return its dispatcher.
fn deploy() -> ContractAddress {
    let contract = declare("NFTFactory").unwrap().contract_class();

    let mut calldata = array![];
    calldata.append_serde(constants::OWNER());

    // Declare and deploy
    let (contract_address, _) = contract.deploy(
        @calldata
    ).unwrap();

    contract_address
}

fn deploy_initialize(signer: ContractAddress) -> ContractAddress {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let nft_class = declare("NFT").unwrap().contract_class();
    let receiver_class = declare("Receiver").unwrap().contract_class();

    let factory_parameters = FactoryParameters {
        signer: signer,
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.initialize(*nft_class.class_hash, *receiver_class.class_hash, factory_parameters);

    contract
}

pub fn deploy_account_mock() -> ContractAddress {
    let contract = declare("DualCaseAccountMock").unwrap().contract_class();

    let calldata = array![constants::stark::KEY_PAIR().public_key];

    // Declare and deploy
    let (contract_address, _) = contract.deploy(
        @calldata
    ).unwrap();

    contract_address
}


fn deploy_erc20_mock() -> ContractAddress {
    let contract = declare("ERC20Mock").unwrap().contract_class();

    let calldata = array![];

    // Declare and deploy
    let (contract_address, _) = contract.deploy(
        @calldata
    ).unwrap();

    contract_address
}

fn sign_message(msg_hash: felt252) -> Array<felt252> {
    return constants::stark::KEY_PAIR().serialized_sign(msg_hash);
}

#[test]
fn test_deploy() {
    let contract = deploy();

    let ownable = IOwnableDispatcher {contract_address: contract};

    assert_eq!(ownable.owner(), constants::OWNER());
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_initialize() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};
    
    let nft_class_hash = constants::NFT_CLASS_HASH();
    let receiver_class_hash = constants::RECEIVER_CLASS_HASH();

    let factory_parameters = FactoryParameters {
        signer: constants::SIGNER(),
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };

    nft_factory.initialize(nft_class_hash, receiver_class_hash, factory_parameters);

    start_cheat_caller_address(contract, constants::OWNER());

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
    
    let nft_class_hash = constants::NFT_CLASS_HASH();

    nft_factory.updateNftClassHash(nft_class_hash);

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.updateNftClassHash(nft_class_hash);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_updateReceiverClassHash() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};
    
    let receiver_class_hash = constants::RECEIVER_CLASS_HASH();

    nft_factory.updateReceiverClassHash(receiver_class_hash);

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.updateReceiverClassHash(receiver_class_hash);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_setFactoryParameters() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let factory_parameters = FactoryParameters {
        signer: constants::SIGNER(),
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };
    
    nft_factory.setFactoryParameters(factory_parameters);

    start_cheat_caller_address(contract, constants::OWNER());

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
        signer: constants::ZERO_ADDRESS(),
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.setFactoryParameters(factory_parameters);
}

#[test]
#[should_panic(expected: 'Zero address passed')]
fn should_not_paste_platform_address_0_setFactoryParameters() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let factory_parameters = FactoryParameters {
        signer: constants::SIGNER(),
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::ZERO_ADDRESS(),
        platform_commission: 100,
        max_array_size: 10,
    };

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.setFactoryParameters(factory_parameters);
}

#[test]
#[should_panic(expected: 'Zero amount passed')]
fn should_not_paste_platform_commission_0_setFactoryParameters() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let factory_parameters = FactoryParameters {
        signer: constants::SIGNER(),
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::PLATFORM(),
        platform_commission: 0,
        max_array_size: 10,
    };

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.setFactoryParameters(factory_parameters);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_setReferralPercentages() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let percentages = array![10, 20, 30, 40, 50].span();
    
    nft_factory.setReferralPercentages(percentages);

    start_cheat_caller_address(contract, constants::OWNER());

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
    
    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.setReferralPercentages(percentages);
}

#[test]
#[should_panic(expected: 'Referral code is already exists')]
fn test_createReferralCode() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    start_cheat_caller_address(contract, constants::CREATOR());

    let mut spy = spy_events();

    let code = nft_factory.createReferralCode();

    spy
        .assert_emitted(
            @array![
                (
                    contract,
                    NFTFactory::Event::ReferralCodeCreatedEvent(
                        NFTFactory::ReferralCodeCreated { 
                            referral_creator: constants::CREATOR(),
                            referral_code: code,
                        }
                    )
                )
            ]
        );

    assert_eq!(code, nft_factory.referralCode(constants::CREATOR()));
    assert_eq!(nft_factory.getReferralCreator(code), constants::CREATOR());

    nft_factory.createReferralCode();
}

#[test]
#[ignore]
// #[should_panic(expected: 'User code did not used code')]
fn test_produce() {
    let account = deploy_account_mock();
    let contract = deploy_initialize(account);
    let erc20mock = deploy_erc20_mock();

    let nft_factory = INFTFactoryDispatcher {contract_address: contract};

    let fraction = 0;
    let produce_hash = ProduceHash { 
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri: constants::CONTRACT_URI().hash(),
        royalty_fraction: fraction
    };
    start_cheat_caller_address_global(account);

    let signature = sign_message(produce_hash.get_message_hash(contract));

    let instance_info = InstanceInfo {
        name: constants::NAME(),
        symbol: constants::SYMBOL(),
        contract_uri: constants::CONTRACT_URI(),
        payment_token: erc20mock,
        royalty_fraction: fraction,
        transferrable: true,
        max_total_supply: constants::MAX_TOTAL_SUPPLY(),
        mint_price: constants::MINT_PRICE(),
        whitelisted_mint_price: constants::WL_MINT_PRICE(),
        collection_expires: constants::EXPIRES(),
        referral_code: '',
        signature
    };

    stop_cheat_caller_address_global();
    start_cheat_caller_address(contract, constants::CREATOR());

    let mut spy = spy_events();

    let call:felt252 = get_caller_address().into();
    println!("Caller 3: {}", call);

    let nft = nft_factory.produce(instance_info);

    spy
        .assert_emitted(
            @array![
                (
                    contract,
                    NFTFactory::Event::NFTCreatedEvent(
                        NFTFactory::NFTCreated { 
                            deployed_address: nft,
                            creator: constants::CREATOR(),
                            name: constants::NAME(),    
                            symbol: constants::SYMBOL(),
                        }
                    )
                )
            ]
        );

    assert_eq!(nft_factory.nftInfo(constants::NAME(), constants::SYMBOL()).name, constants::NAME());
    assert_eq!(nft_factory.nftInfo(constants::NAME(), constants::SYMBOL()).symbol, constants::SYMBOL());
    assert_eq!(nft_factory.nftInfo(constants::NAME(), constants::SYMBOL()).creator, constants::CREATOR());
    assert_eq!(nft_factory.nftInfo(constants::NAME(), constants::SYMBOL()).nft_address, nft);

    nft_factory.createReferralCode();
}
use starknet::{ContractAddress, get_tx_info, contract_address_const};
use openzeppelin::{
    utils::{serde::SerializedAppend, bytearray::{ByteArrayExtImpl, ByteArrayExtTrait}},
    access::ownable::interface::{IOwnableDispatcher, IOwnableDispatcherTrait},
};
use snforge_std::{
    EventSpyAssertionsTrait, ContractClassTrait, DeclareResultTrait,
    signature::stark_curve::{StarkCurveKeyPairImpl, StarkCurveSignerImpl, StarkCurveVerifierImpl},
    declare, start_cheat_caller_address, stop_cheat_caller_address,
    start_cheat_caller_address_global, stop_cheat_caller_address_global, spy_events,
    start_cheat_chain_id_global,
};
use crate::{
    nftfactory::{
        nftfactory::NFTFactory,
        interface::{
            INFTFactoryDispatcher, INFTFactoryDispatcherTrait, FactoryParameters, InstanceInfo,
        },
    },
    snip12::{
        interfaces::SignatureProtection,
        produce_hash::{ProduceHash, MessageProduceHash},
    },
    utils::{constants as constants, signing::SerializedSigning},
};


// Deploy the contract and return its dispatcher.
fn deploy() -> ContractAddress {
    start_cheat_chain_id_global('SN_SEPOLIA');

    let contract = declare("NFTFactory").unwrap().contract_class();

    let mut calldata = array![];
    calldata.append_serde(constants::OWNER());

    // Declare and deploy
    let (contract_address, _) = contract.deploy(@calldata).unwrap();

    contract_address
}

fn deploy_initialize(signer: ContractAddress) -> ContractAddress {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let nft_class = declare("NFT").unwrap().contract_class();
    let receiver_class = declare("Receiver").unwrap().contract_class();

    let factory_parameters = FactoryParameters {
        signer: signer,
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };

    let percentages = array![0, 5000, 3000, 1500, 500].span();

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory
        .initialize(
            *nft_class.class_hash, *receiver_class.class_hash, factory_parameters, percentages,
        );

    stop_cheat_caller_address(contract);

    contract
}

fn deploy_initialize_produce(
    signer: ContractAddress,
) -> (ContractAddress, ContractAddress, ContractAddress) {
    let account = deploy_account_mock();
    let contract = deploy_initialize(account);
    let erc20mock = deploy_erc20_mock();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let fraction = 0;
    let produce_hash = ProduceHash {
        verifying_contract: contract,
        nonce: 0,
        deadline: 0,
        creator_address: constants::CREATOR(),
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri_hash: constants::CONTRACT_URI().hash(),
        royalty_fraction: fraction,
    };
    start_cheat_caller_address_global(account);

    let signature = sign_message(produce_hash.get_message_hash(account));

    let instance_info = InstanceInfo {
        creator_address: constants::CREATOR(),
        name: constants::NAME(),
        symbol: constants::SYMBOL(),
        contract_uri: constants::CONTRACT_URI(),
        payment_token: erc20mock,
        royalty_fraction: fraction,
        transferrable: true,
        max_total_supply: constants::MAX_TOTAL_SUPPLY(),
        mint_price: constants::MINT_PRICE(),
        whitelisted_mint_price: constants::WL_MINT_PRICE(),
        referral_code: '',
    };

    let signature_protection = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature,
    };

    start_cheat_caller_address(contract, constants::CREATOR());

    let (nft, receiver) = nft_factory.produce(signature_protection, instance_info.clone());

    stop_cheat_caller_address_global();
    stop_cheat_caller_address(contract);

    (contract, nft, receiver)
}

pub fn deploy_account_mock() -> ContractAddress {
    let contract = declare("DualCaseAccountMock").unwrap().contract_class();

    // Deploy with owner public key and no guardian
    let public_key = constants::stark::KEY_PAIR().public_key;
    let (contract_address, _) = contract
        .deploy(@array![public_key]) // owner: Signer, guardian: Option<Signer> (None)
        .unwrap();

    // Log the deployed address for debugging
    let felt_address: felt252 = contract_address.into();
    println!("Deployed account_address (hex): 0x{:x}", felt_address);

    // start_cheat_caller_address_global(contract_address);
    contract_address
}

fn deploy_erc20_mock() -> ContractAddress {
    let contract = declare("ERC20Mock").unwrap().contract_class();

    // Declare and deploy
    let (contract_address, _) = contract.deploy(@array![]).unwrap();

    contract_address
}

fn sign_message(msg_hash: felt252) -> Array<felt252> {
    return constants::stark::KEY_PAIR().serialized_sign(msg_hash);
}

#[test]
fn test_deploy() {
    let contract = deploy();

    let ownable = IOwnableDispatcher { contract_address: contract };

    assert_eq!(ownable.owner(), constants::OWNER());
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_initialize() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let nft_class_hash = constants::NFT_CLASS_HASH();
    let receiver_class_hash = constants::RECEIVER_CLASS_HASH();

    let factory_parameters = FactoryParameters {
        signer: constants::SIGNER(),
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };
    let percentages = array![0, 5000, 3000, 1500, 500].span();

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.initialize(nft_class_hash, receiver_class_hash, factory_parameters, percentages);

    assert_eq!(nft_factory.nftFactoryParameters().signer, factory_parameters.signer);
    assert_eq!(
        nft_factory.nftFactoryParameters().default_payment_currency,
        factory_parameters.default_payment_currency,
    );
    assert_eq!(
        nft_factory.nftFactoryParameters().platform_address, factory_parameters.platform_address,
    );
    assert_eq!(
        nft_factory.nftFactoryParameters().platform_commission,
        factory_parameters.platform_commission,
    );
    assert_eq!(
        nft_factory.nftFactoryParameters().max_array_size, factory_parameters.max_array_size,
    );

    let (platform_commission, platform_address) = nft_factory.platformParams();
    assert_eq!(nft_factory.maxArraySize(), factory_parameters.max_array_size);
    assert_eq!(nft_factory.signer(), factory_parameters.signer);
    assert_eq!(platform_commission, factory_parameters.platform_commission);
    assert_eq!(platform_address, factory_parameters.platform_address);

    start_cheat_caller_address(contract, constants::CREATOR());
    // Throws: 'Caller is not the owner'
    nft_factory.initialize(nft_class_hash, receiver_class_hash, factory_parameters, percentages);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_updateNftClassHash() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let nft_class_hash = constants::NFT_CLASS_HASH();

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.updateNftClassHash(nft_class_hash);

    start_cheat_caller_address(contract, constants::CREATOR());
    // Throws: 'Caller is not the owner'
    nft_factory.updateNftClassHash(nft_class_hash);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_updateReceiverClassHash() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let receiver_class_hash = constants::RECEIVER_CLASS_HASH();

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.updateReceiverClassHash(receiver_class_hash);

    start_cheat_caller_address(contract, constants::CREATOR());
    // Throws: 'Caller is not the owner'
    nft_factory.updateReceiverClassHash(receiver_class_hash);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_setFactoryParameters() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let factory_parameters = FactoryParameters {
        signer: constants::SIGNER(),
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::PLATFORM(),
        platform_commission: 100,
        max_array_size: 10,
    };

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.setFactoryParameters(factory_parameters);

    assert_eq!(nft_factory.nftFactoryParameters().signer, factory_parameters.signer);
    assert_eq!(
        nft_factory.nftFactoryParameters().default_payment_currency,
        factory_parameters.default_payment_currency,
    );
    assert_eq!(
        nft_factory.nftFactoryParameters().platform_address, factory_parameters.platform_address,
    );
    assert_eq!(
        nft_factory.nftFactoryParameters().platform_commission,
        factory_parameters.platform_commission,
    );
    assert_eq!(
        nft_factory.nftFactoryParameters().max_array_size, factory_parameters.max_array_size,
    );

    start_cheat_caller_address(contract, constants::CREATOR());
    // Throws: 'Caller is not the owner'
    nft_factory.setFactoryParameters(factory_parameters);
}

#[test]
#[should_panic(expected: 'Zero address passed')]
fn test_setFactoryParameters_signer_zero_address() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

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
fn test_setFactoryParameters_platform_zero_address() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

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
#[should_panic(expected: 'Wrong platform commission set')]
fn test_setFactoryParameters_zero_amount() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

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

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let percentages = array![0, 5000, 3000, 1500, 500].span();

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.setReferralPercentages(percentages);

    assert_eq!(nft_factory.usedToPercentage(0), *percentages[0]);
    assert_eq!(nft_factory.usedToPercentage(1), *percentages[1]);
    assert_eq!(nft_factory.usedToPercentage(2), *percentages[2]);
    assert_eq!(nft_factory.usedToPercentage(3), *percentages[3]);
    assert_eq!(nft_factory.usedToPercentage(4), *percentages[4]);

    start_cheat_caller_address(contract, constants::CREATOR());
    // Throws: 'Caller is not the owner'
    nft_factory.setReferralPercentages(percentages);
}

#[test]
#[should_panic(expected: 'Wrong percentages length')]
fn test_setReferralPercentages_percentages_length() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let percentages = array![0, 5000, 3000, 1500].span();

    start_cheat_caller_address(contract, constants::OWNER());

    nft_factory.setReferralPercentages(percentages);
}

#[test]
#[should_panic(expected: 'Referral code is already exists')]
fn test_createReferralCode() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    start_cheat_caller_address(contract, constants::CREATOR());

    let mut spy = spy_events();

    let code: felt252 = nft_factory.createReferralCode();

    spy
        .assert_emitted(
            @array![
                (
                    contract,
                    NFTFactory::Event::ReferralCodeCreatedEvent(
                        NFTFactory::ReferralCodeCreated {
                            referral_creator: constants::CREATOR(), referral_code: code,
                        },
                    ),
                ),
            ],
        );

    assert_eq!(code, nft_factory.referralCode(constants::CREATOR()));
    let referral_creator: ContractAddress = nft_factory.getReferralCreator(code);
    assert_eq!(referral_creator, constants::CREATOR());

    // Throws: 'Referral code is already exists'
    nft_factory.createReferralCode();
}

#[test]
#[should_panic(expected: 'NFT is already exists')]
fn test_produce() {
    let account = deploy_account_mock();
    let contract = deploy_initialize(account);
    let erc20mock = deploy_erc20_mock();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    start_cheat_caller_address(contract, constants::REFERRAL());
    let referral_code = nft_factory.createReferralCode();

    let fraction = constants::FRACTION();
    let produce_hash = ProduceHash {
        verifying_contract: contract,
        nonce: 0,
        deadline: 0,
        creator_address: constants::CREATOR(),
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri_hash: constants::CONTRACT_URI().hash(),
        royalty_fraction: fraction,
    };
    // let target_address: ContractAddress = contract_address_const::<
    //     0x06dea05d53bbab0ea3849b0799b225670f4796b9db3066971e6f0266c9184719,
    // >();
    start_cheat_caller_address_global(account);
    // let felt_address: felt252 = account.into();
    // println!("target_address (hex): 0x{:x}", target_address);
    let signature = sign_message(produce_hash.get_message_hash(account));
    // let signature = sign_message(produce_hash.get_message_hash(target_address));
    // let pubk: felt252 = constants::stark::KEY_PAIR().public_key.into();
    // let privk: felt252 = constants::stark::KEY_PAIR().secret_key.into();
    // println!("chain_id (hex): 0x{:x}", get_tx_info().unbox().chain_id);
    // println!("PubKey (hex): 0x{:x}", pubk);
    // println!("PrivKey (hex): 0x{:x}", privk);
    // println!("Name {}", constants::NAME());
    // println!("Hash (hex): 0x{:x}", constants::NAME().hash());
    // println!("Symbol {}", constants::SYMBOL());
    // println!("Hash (hex): 0x{:x}", constants::SYMBOL().hash());
    // println!("URI {}", constants::CONTRACT_URI());
    // println!("Hash (hex): 0x{:x}", constants::CONTRACT_URI().hash());
    // println!("Signature");
    // for i in 0..signature.len() {
    //     println!("{}", i);
    //     println!("{}", signature[i]);
    // };

    let signature_protection = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature,
    };

    let instance_info = InstanceInfo {
        creator_address: constants::CREATOR(),
        name: constants::NAME(),
        symbol: constants::SYMBOL(),
        contract_uri: constants::CONTRACT_URI(),
        payment_token: erc20mock,
        royalty_fraction: fraction,
        transferrable: true,
        max_total_supply: constants::MAX_TOTAL_SUPPLY(),
        mint_price: constants::MINT_PRICE(),
        whitelisted_mint_price: constants::WL_MINT_PRICE(),
        referral_code,
    };

    stop_cheat_caller_address_global();
    start_cheat_caller_address(contract, constants::CREATOR());

    let mut spy = spy_events();

    let (nft, receiver) = nft_factory.produce(signature_protection.clone(), instance_info.clone());

    spy
        .assert_emitted(
            @array![
                (
                    contract,
                    NFTFactory::Event::ProducedEvent(
                        NFTFactory::Produced {
                            nft_address: nft,
                            creator: constants::CREATOR(),
                            receiver_address: receiver,
                            name: constants::NAME(),
                            symbol: constants::SYMBOL(),
                        },
                    ),
                ),
            ],
        );

    assert_eq!(nft_factory.nftInfo(constants::NAME(), constants::SYMBOL()).name, constants::NAME());
    assert_eq!(
        nft_factory.nftInfo(constants::NAME(), constants::SYMBOL()).symbol, constants::SYMBOL(),
    );
    assert_eq!(
        nft_factory.nftInfo(constants::NAME(), constants::SYMBOL()).creator, constants::CREATOR(),
    );
    assert_eq!(nft_factory.nftInfo(constants::NAME(), constants::SYMBOL()).nft_address, nft);
    assert_eq!(
        nft_factory.nftInfo(constants::NAME(), constants::SYMBOL()).receiver_address, receiver,
    );

    // Throws: 'NFT is already exists'
    nft_factory.produce(signature_protection, instance_info);
}

#[test]
#[should_panic(expected: 'Invalid signature')]
fn test_produce_signature() {
    let account = deploy_account_mock();
    let contract = deploy_initialize(account);
    let erc20mock = deploy_erc20_mock();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let fraction = 0;
    let produce_hash = ProduceHash {
        verifying_contract: contract,
        nonce: 0,
        deadline: 0,
        creator_address: constants::CREATOR(),
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri_hash: constants::CONTRACT_URI().hash(),
        royalty_fraction: fraction,
    };
    start_cheat_caller_address_global(account);

    let signature = sign_message(produce_hash.get_message_hash(account));

    let signature_protection = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature,
    };

    let instance_info = InstanceInfo {
        creator_address: constants::CREATOR(),
        name: constants::NAME(),
        symbol: constants::SYMBOL(),
        contract_uri: constants::CONTRACT_URI(),
        payment_token: erc20mock,
        royalty_fraction: fraction + 1,
        transferrable: true,
        max_total_supply: constants::MAX_TOTAL_SUPPLY(),
        mint_price: constants::MINT_PRICE(),
        whitelisted_mint_price: constants::WL_MINT_PRICE(),
        referral_code: '',
    };

    stop_cheat_caller_address_global();
    start_cheat_caller_address(contract, constants::CREATOR());

    // Throws: 'Invalid signature'
    nft_factory.produce(signature_protection, instance_info);
}

#[test]
fn test_produce_with_referral_code() {
    let account = deploy_account_mock();
    let contract = deploy_initialize(account);
    let erc20mock = deploy_erc20_mock();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let fraction = 0;
    let produce_hash = ProduceHash {
        verifying_contract: contract,
        nonce: 0,
        deadline: 0,
        creator_address: constants::CREATOR(),
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri_hash: constants::CONTRACT_URI().hash(),
        royalty_fraction: fraction,
    };

    start_cheat_caller_address_global(account);
    let signature = sign_message(produce_hash.get_message_hash(account));
    stop_cheat_caller_address_global();

    let signature_protection = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature,
    };

    start_cheat_caller_address(contract, constants::REFERRAL());
    let code = nft_factory.createReferralCode();

    let instance_info = InstanceInfo {
        creator_address: constants::CREATOR(),
        name: constants::NAME(),
        symbol: constants::SYMBOL(),
        contract_uri: constants::CONTRACT_URI(),
        payment_token: erc20mock,
        royalty_fraction: fraction,
        transferrable: true,
        max_total_supply: constants::MAX_TOTAL_SUPPLY(),
        mint_price: constants::MINT_PRICE(),
        whitelisted_mint_price: constants::WL_MINT_PRICE(),
        referral_code: code,
    };

    start_cheat_caller_address(contract, constants::CREATOR());

    let mut spy = spy_events();

    nft_factory.produce(signature_protection, instance_info);

    spy
        .assert_emitted(
            @array![
                (
                    contract,
                    NFTFactory::Event::ReferralCodeUsedEvent(
                        NFTFactory::ReferralCodeUsed {
                            referral_user: constants::CREATOR(), referral_code: code,
                        },
                    ),
                ),
            ],
        );

    let amount = 10;
    assert_eq!(nft_factory.getReferralRate(constants::CREATOR(), code, amount), amount / 2);
}

#[test]
#[should_panic(expected: 'Can not refer to self')]
fn test_produce_with_referral_code_refer_to_self() {
    let account = deploy_account_mock();
    let contract = deploy_initialize(account);
    let erc20mock = deploy_erc20_mock();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let fraction = 0;
    let produce_hash = ProduceHash {
        verifying_contract: contract,
        nonce: 0,
        deadline: 0,
        creator_address: constants::CREATOR(),
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri_hash: constants::CONTRACT_URI().hash(),
        royalty_fraction: fraction,
    };

    start_cheat_caller_address_global(account);
    let signature = sign_message(produce_hash.get_message_hash(account));
    stop_cheat_caller_address_global();

    let signature_protection = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature,
    };

    start_cheat_caller_address(contract, constants::CREATOR());
    let code = nft_factory.createReferralCode();

    let instance_info = InstanceInfo {
        creator_address: constants::CREATOR(),
        name: constants::NAME(),
        symbol: constants::SYMBOL(),
        contract_uri: constants::CONTRACT_URI(),
        payment_token: erc20mock,
        royalty_fraction: fraction,
        transferrable: true,
        max_total_supply: constants::MAX_TOTAL_SUPPLY(),
        mint_price: constants::MINT_PRICE(),
        whitelisted_mint_price: constants::WL_MINT_PRICE(),
        referral_code: code,
    };

    nft_factory.produce(signature_protection, instance_info);
}

#[test]
#[should_panic(expected: 'Referral code does not exist')]
fn test_produce_referral_code_exist() {
    let account = deploy_account_mock();
    let contract = deploy_initialize(account);
    let erc20mock = deploy_erc20_mock();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let fraction = 0;
    let produce_hash = ProduceHash {
        verifying_contract: contract,
        nonce: 0,
        deadline: 0,
        creator_address: constants::CREATOR(),
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri_hash: constants::CONTRACT_URI().hash(),
        royalty_fraction: fraction,
    };

    start_cheat_caller_address_global(account);
    let signature = sign_message(produce_hash.get_message_hash(account));
    stop_cheat_caller_address_global();

    let signature_protection = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature,
    };

    start_cheat_caller_address(contract, constants::REFERRAL());

    let instance_info = InstanceInfo {
        creator_address: constants::CREATOR(),
        name: constants::NAME(),
        symbol: constants::SYMBOL(),
        contract_uri: constants::CONTRACT_URI(),
        payment_token: erc20mock,
        royalty_fraction: fraction,
        transferrable: true,
        max_total_supply: constants::MAX_TOTAL_SUPPLY(),
        mint_price: constants::MINT_PRICE(),
        whitelisted_mint_price: constants::WL_MINT_PRICE(),
        referral_code: constants::REFERRAL_CODE(),
    };

    // Throws: 'Referral code does not exist'
    nft_factory.produce(signature_protection, instance_info);
}

#[test]
fn test_produce_with_multiple_referral_code_usage() {
    let account = deploy_account_mock();
    let contract = deploy_initialize(account);
    let erc20mock = deploy_erc20_mock();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let fraction = 0;
    let produce_hash = ProduceHash {
        verifying_contract: contract,
        nonce: 0,
        deadline: 0,
        creator_address: constants::CREATOR(),
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri_hash: constants::CONTRACT_URI().hash(),
        royalty_fraction: fraction,
    };

    let mut produce_hash_2 = produce_hash.clone();
    produce_hash_2.name_hash = constants::NAME_2().hash();

    let mut produce_hash_3 = produce_hash.clone();
    produce_hash_3.symbol_hash = constants::SYMBOL_2().hash();

    let mut produce_hash_4 = produce_hash.clone();
    produce_hash_4.name_hash = constants::NAME_2().hash();
    produce_hash_4.symbol_hash = constants::SYMBOL_2().hash();

    let mut produce_hash_5 = produce_hash.clone();
    produce_hash_5.name_hash = constants::NAME_3().hash();

    start_cheat_caller_address_global(account);
    let signature = sign_message(produce_hash.get_message_hash(account));
    let signature_2 = sign_message(produce_hash_2.get_message_hash(account));
    let signature_3 = sign_message(produce_hash_3.get_message_hash(account));
    let signature_4 = sign_message(produce_hash_4.get_message_hash(account));
    let signature_5 = sign_message(produce_hash_5.get_message_hash(account));
    stop_cheat_caller_address_global();

    let signature_protection = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature,
    };
    let signature_protection_2 = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature: signature_2,
    };
    let signature_protection_3 = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature: signature_3,
    };
    let signature_protection_4 = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature: signature_4,
    };
    let signature_protection_5 = SignatureProtection {
        nonce: 0,
        deadline: 0,
        signature: signature_5,
    };

    start_cheat_caller_address(contract, constants::REFERRAL());
    let code = nft_factory.createReferralCode();

    let mut instance_info = InstanceInfo {
        creator_address: constants::CREATOR(),
        name: constants::NAME(),
        symbol: constants::SYMBOL(),
        contract_uri: constants::CONTRACT_URI(),
        payment_token: erc20mock,
        royalty_fraction: fraction,
        transferrable: true,
        max_total_supply: constants::MAX_TOTAL_SUPPLY(),
        mint_price: constants::MINT_PRICE(),
        whitelisted_mint_price: constants::WL_MINT_PRICE(),
        referral_code: code,
    };

    let mut instance_info_2 = instance_info.clone();
    instance_info_2.name = constants::NAME_2();

    let mut instance_info_3 = instance_info.clone();
    instance_info_3.symbol = constants::SYMBOL_2();

    let mut instance_info_4 = instance_info.clone();
    instance_info_4.name = constants::NAME_2();
    instance_info_4.symbol = constants::SYMBOL_2();

    let mut instance_info_5 = instance_info.clone();
    instance_info_5.name = constants::NAME_3();

    start_cheat_caller_address(contract, constants::CREATOR());

    let amount = 10000;

    nft_factory.produce(signature_protection, instance_info);
    assert_eq!(nft_factory.getReferralRate(constants::CREATOR(), code, amount), 5000);

    nft_factory.produce(signature_protection_2, instance_info_2);
    assert_eq!(nft_factory.getReferralRate(constants::CREATOR(), code, amount), 3000);

    nft_factory.produce(signature_protection_3, instance_info_3);
    assert_eq!(nft_factory.getReferralRate(constants::CREATOR(), code, amount), 1500);

    nft_factory.produce(signature_protection_4, instance_info_4);
    assert_eq!(nft_factory.getReferralRate(constants::CREATOR(), code, amount), 500);

    nft_factory.produce(signature_protection_5, instance_info_5);
    assert_eq!(nft_factory.getReferralRate(constants::CREATOR(), code, amount), 500);
}

#[test]
fn test_produceHash() {
    let contract = deploy();

    let nft_factory = INFTFactoryDispatcher { contract_address: contract };

    let (name_hash, symbol_hash, contract_uri_hash) = nft_factory
        .produceHash(constants::NAME(), constants::SYMBOL(), constants::CONTRACT_URI());

    println!("name_hash: 0x{:x}", name_hash);
    println!("symbol_hash: 0x{:x}", symbol_hash);
    println!("contract_uri_hash: 0x{:x}", contract_uri_hash);

    assert_eq!(constants::NAME().hash(), name_hash);
    assert_eq!(constants::SYMBOL().hash(), symbol_hash);
    assert_eq!(constants::CONTRACT_URI().hash(), contract_uri_hash);
}

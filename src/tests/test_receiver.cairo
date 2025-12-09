// Import the deploy syscall to be able to deploy the contract.
use starknet::{
    ContractAddress, SyscallResultTrait, get_contract_address, contract_address_const,
    testing::set_contract_address,
};
use core::traits::Into;
use openzeppelin::{
    utils::{serde::SerializedAppend, bytearray::{ByteArrayExtImpl, ByteArrayExtTrait}},
    token::{
        erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait},
        erc721::interface::{ERC721ABIDispatcher, ERC721ABIDispatcherTrait},
    },
    access::ownable::interface::{IOwnableDispatcher, IOwnableDispatcherTrait},
};
use snforge_std::{
    EventSpyAssertionsTrait, ContractClassTrait, DeclareResultTrait, declare,
    start_cheat_caller_address, stop_cheat_caller_address, start_cheat_caller_address_global,
    stop_cheat_caller_address_global, spy_events,
};
use crate::{
    receiver::{receiver::Receiver, interface::{IReceiverDispatcher, IReceiverDispatcherTrait}},
    nftfactory::interface::{
        INFTFactoryDispatcher, INFTFactoryDispatcherTrait, FactoryParameters, InstanceInfo,
    },
    nft::interface::{
        INFTDispatcher, INFTDispatcherTrait, NftParameters, DynamicPriceParameters,
        StaticPriceParameters,
    },
    snip12::{
        interfaces::SignatureProtection,
        produce_hash::{ProduceHash, MessageProduceHash},
        dynamic_price_hash::{DynamicPriceHash, MessageDynamicPriceHash},
        static_price_hash::{StaticPriceHash, MessageStaticPriceHash},
    },
    utils::{signing::StarkSerializedSigning, constants as constants},
    mocks::erc20mockinterface::{IERC20MintableDispatcher, IERC20MintableDispatcherTrait},
};


// Deploy the contract and return its dispatcher.

fn deploy_factory_nft_receiver_erc20(
    is_referral: bool, transferrable: bool,
) -> (ContractAddress, ContractAddress, ContractAddress, ContractAddress) {
    let signer = deploy_account_mock();
    let factory_class = declare("NFTFactory").unwrap().contract_class();
    let nft_class = declare("NFT").unwrap().contract_class();
    let receiver_class = declare("Receiver").unwrap().contract_class();
    let erc20mock_class = declare("ERC20Mock").unwrap().contract_class();

    let (erc20mock, _) = erc20mock_class.deploy(@array![]).unwrap();

    let mut calldata = array![];
    calldata.append_serde(constants::OWNER());
    let (factory, _) = factory_class.deploy(@calldata).unwrap();

    let nft_factory = INFTFactoryDispatcher { contract_address: factory };

    let factory_parameters = FactoryParameters {
        signer,
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::PLATFORM(),
        platform_commission: 100,
        max_array_size: 2,
    };

    let percentages = array![0, 5000, 3000, 1500, 500].span();

    start_cheat_caller_address(factory, constants::OWNER());
    nft_factory
        .initialize(
            *nft_class.class_hash, *receiver_class.class_hash, factory_parameters, percentages,
        );

    start_cheat_caller_address(factory, constants::REFERRAL());
    let referral_code = if is_referral {
        nft_factory.createReferralCode()
    } else {
        0
    };

    let royalty_fraction = constants::FRACTION();

    let produce_hash = ProduceHash {
        verifying_contract: factory,
        nonce: 0,
        deadline: 0,
        creator_address: constants::CREATOR(),
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri_hash: constants::CONTRACT_URI().hash(),
        royalty_fraction,
    };
    start_cheat_caller_address_global(signer);

    let signature = sign_message(produce_hash.get_message_hash(signer));

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
        royalty_fraction,
        transferrable,
        max_total_supply: constants::MAX_TOTAL_SUPPLY(),
        mint_price: constants::MINT_PRICE(),
        whitelisted_mint_price: constants::WL_MINT_PRICE(),
        referral_code
    };

    stop_cheat_caller_address_global();
    start_cheat_caller_address(factory, constants::CREATOR());

    let (nft, receiver) = nft_factory.produce(signature_protection, instance_info.clone());

    start_cheat_caller_address(erc20mock, signer);
    IERC20MintableDispatcher { contract_address: erc20mock }.mint(signer, 100000000);
    IERC20Dispatcher { contract_address: erc20mock }.approve(nft, 100000000);

    stop_cheat_caller_address(factory);
    stop_cheat_caller_address_global();

    (factory, nft, receiver, erc20mock)
}

pub fn deploy_account_mock() -> ContractAddress {
    let contract = declare("DualCaseAccountMock").unwrap().contract_class();

    // Declare and deploy
    let (contract_address, _) = contract
        .deploy(@array![constants::stark::KEY_PAIR().public_key])
        .unwrap();

    contract_address
}

pub fn deploy_account_mock_2() -> ContractAddress {
    let contract = declare("DualCaseAccountMock").unwrap().contract_class();

    // Declare and deploy
    let (contract_address, _) = contract
        .deploy(@array![constants::stark::KEY_PAIR_2().public_key])
        .unwrap();

    contract_address
}

fn sign_message(msg_hash: felt252) -> Array<felt252> {
    return constants::stark::KEY_PAIR().serialized_sign(msg_hash);
}


#[test]
fn test_deploy() {
    let (_, _, _receiver, _) = deploy_factory_nft_receiver_erc20(false, true);

    let receiver = IReceiverDispatcher { contract_address: _receiver };

    let payees = array![constants::CREATOR(), constants::PLATFORM(), constants::ZERO_ADDRESS()];

    let AMOUNT_TO_CREATOR: u16 = 8000;
    let AMOUNT_TO_PLATFORM: u16 = 2000;

    assert_eq!(receiver.payees(), payees.span());
    assert_eq!(receiver.shares(constants::CREATOR()), AMOUNT_TO_CREATOR);
    assert_eq!(receiver.shares(constants::PLATFORM()), AMOUNT_TO_PLATFORM);
}

#[test]
fn test_deploy_referral() {
    let (_, _, _receiver, _) = deploy_factory_nft_receiver_erc20(true, true);

    let receiver = IReceiverDispatcher { contract_address: _receiver };

    let payees = array![constants::CREATOR(), constants::PLATFORM(), constants::REFERRAL()];

    let AMOUNT_TO_CREATOR: u16 = 8000;
    let AMOUNT_TO_PLATFORM: u16 = 1000;
    let AMOUNT_TO_REFERRAL: u16 = 1000;

    assert_eq!(receiver.payees(), payees.span());
    assert_eq!(receiver.shares(constants::CREATOR()), AMOUNT_TO_CREATOR);
    assert_eq!(receiver.shares(constants::PLATFORM()), AMOUNT_TO_PLATFORM);
    assert_eq!(receiver.shares(constants::REFERRAL()), AMOUNT_TO_REFERRAL);
}

#[test]
fn test_releaseAll() {
    let (_, _, _receiver, erc20) = deploy_factory_nft_receiver_erc20(true, true);
    IERC20MintableDispatcher { contract_address: erc20 }.mint(_receiver, 100000);

    let receiver = IReceiverDispatcher { contract_address: _receiver };

    receiver.releaseAll(erc20);

    assert_eq!(receiver.released(constants::CREATOR()), 80000);
    assert_eq!(receiver.released(constants::PLATFORM()), 10000);
    assert_eq!(receiver.released(constants::REFERRAL()), 10000);
    assert_eq!(receiver.totalReleased(), 100000);
}

#[test]
fn test_releaseAll_without_referral() {
    let (_, _, _receiver, erc20) = deploy_factory_nft_receiver_erc20(false, true);
    IERC20MintableDispatcher { contract_address: erc20 }.mint(_receiver, 100000);

    let receiver = IReceiverDispatcher { contract_address: _receiver };

    start_cheat_caller_address(_receiver, constants::CREATOR());

    receiver.releaseAll(erc20);

    assert_eq!(receiver.released(constants::CREATOR()), 80000);
    assert_eq!(receiver.released(constants::PLATFORM()), 20000);
    assert_eq!(receiver.released(constants::REFERRAL()), 0);
    assert_eq!(receiver.totalReleased(), 100000);
}

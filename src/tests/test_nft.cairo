use crate::nft::interface::{
    INFTDispatcher, INFTDispatcherTrait, NftParameters, DynamicPriceParameters, StaticPriceParameters
};
use crate::nft::nft::NFT;
use crate::nftfactory::interface::{INFTFactoryDispatcher, INFTFactoryDispatcherTrait, FactoryParameters, InstanceInfo};
use crate::snip12::produce_hash::{ProduceHash, MessageProduceHash};
use crate::snip12::dynamic_price_hash::{DynamicPriceHash, MessageDynamicPriceHash};
use crate::snip12::static_price_hash::{StaticPriceHash, MessageStaticPriceHash};
use crate::mocks::erc20mockinterface::{IERC20MintableDispatcher, IERC20MintableDispatcherTrait};
// Import the deploy syscall to be able to deploy the contract.
use starknet::{ContractAddress, SyscallResultTrait, get_contract_address, contract_address_const};
// Use starknet test utils to fake the contract_address
use starknet::testing::set_contract_address;
use core::traits::Into;
use openzeppelin::{
    utils::{
        serde::SerializedAppend,
        bytearray::{
            ByteArrayExtImpl, ByteArrayExtTrait
        }
    },
    token::{
        erc20::interface::{IERC20Dispatcher,IERC20DispatcherTrait},
        erc721::interface::{ERC721ABIDispatcher, ERC721ABIDispatcherTrait}
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
    DeclareResultTrait
};
use crate::utils::signing::StarkSerializedSigning;
use crate::utils::constants as constants;

// Deploy the contract and return its dispatcher.
fn deploy() -> ContractAddress {
    let contract = declare("NFT").unwrap().contract_class();

    let mut calldata = array![];
    calldata.append_serde(constants::CREATOR());
    calldata.append_serde(constants::FACTORY());
    calldata.append_serde(constants::NAME());
    calldata.append_serde(constants::SYMBOL());
    calldata.append_serde(constants::FEE_RECEIVER());
    calldata.append_serde(constants::FRACTION());

    // Declare and deploy
    let (contract_address, _) = contract.deploy(
        @calldata
    ).unwrap();

    contract_address
}

fn deploy_factory_nft_receiver_erc20(signer: ContractAddress, is_referral: bool, transferrable: bool)
    -> (
        ContractAddress, ContractAddress, ContractAddress, ContractAddress
    ) {
    let factory_class = declare("NFTFactory").unwrap().contract_class();
    let nft_class = declare("NFT").unwrap().contract_class();
    let receiver_class = declare("Receiver").unwrap().contract_class();
    let erc20mock_class = declare("ERC20Mock").unwrap().contract_class();

    let (erc20mock, _) = erc20mock_class.deploy(
        @array![]
    ).unwrap();

    let mut calldata = array![];
    calldata.append_serde(constants::OWNER());
    let (factory, _) = factory_class.deploy(
        @calldata
    ).unwrap();

    let nft_factory = INFTFactoryDispatcher {contract_address: factory};

    let factory_parameters = FactoryParameters {
        signer,
        default_payment_currency: constants::CURRENCY(),
        platform_address: constants::PLATFORM(),
        platform_commission: 100,
        max_array_size: 2,
    };

    let percentages = array![0, 5000, 3000, 1500, 500].span();

    start_cheat_caller_address(factory, constants::OWNER());
    nft_factory.initialize(
        *nft_class.class_hash, *receiver_class.class_hash, factory_parameters, percentages
    );

    start_cheat_caller_address(factory, constants::REFERRAL());
    let referral = if is_referral {
        nft_factory.createReferralCode()
    } else {
        ''
    };

    let royalty_fraction = if is_referral {
        constants::FRACTION()
    } else {
        0
    };

    let produce_hash = ProduceHash { 
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri: constants::CONTRACT_URI().hash(),
        royalty_fraction
    };
    start_cheat_caller_address_global(signer);

    let signature = sign_message(produce_hash.get_message_hash(factory));

    let instance_info = InstanceInfo {
        name: constants::NAME(),
        symbol: constants::SYMBOL(),
        contract_uri: constants::CONTRACT_URI(),
        payment_token: erc20mock,
        royalty_fraction,
        transferrable,
        max_total_supply: constants::MAX_TOTAL_SUPPLY(),
        mint_price: constants::MINT_PRICE(),
        whitelisted_mint_price: constants::WL_MINT_PRICE(),
        collection_expires: constants::EXPIRES(),
        referral_code: referral,
        signature
    };

    stop_cheat_caller_address_global();
    start_cheat_caller_address(factory, constants::CREATOR());

    let (nft, receiver) = nft_factory.produce(instance_info.clone());

    start_cheat_caller_address(erc20mock, signer);
    IERC20MintableDispatcher {contract_address: erc20mock}.mint(signer, 100000000);
    IERC20Dispatcher{contract_address: erc20mock}.approve(nft, 100000000);

    (factory, nft, receiver, erc20mock)
}

pub fn deploy_account_mock() -> ContractAddress {
    let contract = declare("DualCaseAccountMock").unwrap().contract_class();

    // Declare and deploy
    let (contract_address, _) = contract.deploy(
        @array![constants::stark::KEY_PAIR().public_key]
    ).unwrap();

    contract_address
}

pub fn deploy_account_mock_2() -> ContractAddress {
    let contract = declare("DualCaseAccountMock").unwrap().contract_class();

    // Declare and deploy
    let (contract_address, _) = contract.deploy(
        @array![constants::stark::KEY_PAIR_2().public_key]
    ).unwrap();

    contract_address
}

fn sign_message(msg_hash: felt252) -> Array<felt252> {
    return constants::stark::KEY_PAIR().serialized_sign(msg_hash);
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

    start_cheat_caller_address(contract, constants::RECEIVER());
    // Throws: 'Only Factory can call'
    nft.initialize(nft_parameters);
}

#[test]
#[should_panic(expected: 'Initialize only once')]
fn test_initialize_only_once() {
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

    // Throws: 'Initialize only once'
    nft.initialize(nft_parameters);
}

#[test]
#[should_panic(expected: 'Caller is not the owner')]
fn test_setPaymentInfo() {
    let contract = deploy();

    let nft = INFTDispatcher {contract_address: contract};

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

    start_cheat_caller_address(contract, constants::RECEIVER());
    // Throws: 'Caller is not the owner'
    nft.setPaymentInfo(contract_address_const::<1>(), 3000, 0);
}

#[test]
#[should_panic(expected: 'Zero address passed')]
fn test_setPaymentInfo_zero_address() {
    let contract = deploy();

    let nft = INFTDispatcher {contract_address: contract};

    start_cheat_caller_address(contract, constants::CREATOR());

    nft.setPaymentInfo(contract_address_const::<0>(), 3000, 0);
}

#[test]
#[should_panic(expected: 'Zero amount passed')]
fn test_setPaymentInfo_zero_amount() {
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

    start_cheat_caller_address(contract, constants::CREATOR());

    nft.addWhitelisted(contract_address_const::<1>());

    assert_eq!(nft.isWhitelisted(contract_address_const::<1>()), true);

    start_cheat_caller_address(contract, constants::RECEIVER());
    // Throws: 'Caller is not the owner'
    nft.addWhitelisted(contract_address_const::<1>());
}

#[test]
#[should_panic(expected: 'Address is already whitelisted')]
fn test_addWhitelisted_whitelisted_already() {
    let contract = deploy();

    let nft = INFTDispatcher {contract_address: contract};

    start_cheat_caller_address(contract, constants::CREATOR());

    nft.addWhitelisted(contract_address_const::<1>());

    // Throws: 'Address is already whitelisted'
    nft.addWhitelisted(contract_address_const::<1>());
}

#[test]
#[should_panic(expected: 'Wrong array size')]
fn test_mintDynamicPrice() {
    let signer = deploy_account_mock();
    let (_, _nft, _, erc20mock) = deploy_factory_nft_receiver_erc20(signer, false, true);
    let nft = INFTDispatcher {contract_address: _nft};
    let erc20 = IERC20Dispatcher{contract_address: erc20mock};

    let receiver = signer;
    let token_id: u256 = 0;
    let price: u256 = 1000;
    let token_uri = constants::TOKEN_URI();

    let dynamic_price_hash = DynamicPriceHash { 
        receiver,
        token_id: token_id,
        price: price,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(dynamic_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let dynamic_params = DynamicPriceParameters {
        receiver,
        token_id,
        price,
        token_uri,
        signature
    };

    let mut dynamic_params_array = array![dynamic_params];

    let signer_balance_before = erc20.balance_of(signer);
    let platfrom_balance_before = erc20.balance_of(constants::PLATFORM());
    let creator_balance_before = erc20.balance_of(constants::CREATOR());

    let mut spy = spy_events();

    start_cheat_caller_address(_nft, signer);
    nft.mintDynamicPrice(dynamic_params_array, erc20mock);

    spy
    .assert_emitted(
        @array![
            (
                _nft,
                NFT::Event::PaidEvent(
                    NFT::Paid { 
                        user: signer,
                        payment_token: erc20mock,
                        amount: price
                    }
                )
            )
        ]
    );

    let signer_balance_after = erc20.balance_of(signer);
    let platfrom_balance_after = erc20.balance_of(constants::PLATFORM());
    let creator_balance_after = erc20.balance_of(constants::CREATOR());

    println!("platfrom_balance_after should be 10 % from price: {}", platfrom_balance_after);
    println!("creator_balance_after should be without 10 % from price: {}", creator_balance_after);
    assert_eq!(signer_balance_before - price, signer_balance_after);
    assert_eq!(
        creator_balance_before + (price - (platfrom_balance_after - platfrom_balance_before)), creator_balance_after
    );
    assert_eq!(ERC721ABIDispatcher{contract_address: _nft}.owner_of(token_id), signer);

    dynamic_params_array = array![dynamic_params, dynamic_params, dynamic_params];
    // Throws: 'Wrong array size'
    nft.mintDynamicPrice(dynamic_params_array, erc20mock);
}

#[test]
#[should_panic(expected: 'Total supply limit reached')]
fn test_mintDynamicPrice_total_supply_limit() {
    let signer = deploy_account_mock();
    let (_, _nft, _, erc20mock) = deploy_factory_nft_receiver_erc20(signer, false, true);
    let nft = INFTDispatcher {contract_address: _nft};

    let receiver = signer;
    let token_id: u256 = 100000;
    let price: u256 = 1000;
    let token_uri = constants::TOKEN_URI();

    let dynamic_price_hash = DynamicPriceHash { 
        receiver,
        token_id: token_id,
        price: price,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(dynamic_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let dynamic_params = DynamicPriceParameters {
        receiver,
        token_id,
        price,
        token_uri,
        signature
    };

    let mut dynamic_params_array = array![dynamic_params];

    start_cheat_caller_address(_nft, signer);
    nft.mintDynamicPrice(dynamic_params_array, erc20mock);
}

#[test]
#[should_panic(expected: 'Invalid signature')]
fn test_mintDynamicPrice_signature() {
    let signer = deploy_account_mock();
    let (_, _nft, _, erc20mock) = deploy_factory_nft_receiver_erc20(signer, false, true);
    let nft = INFTDispatcher {contract_address: _nft};

    let receiver = signer;
    let token_id: u256 = 100000;
    let price: u256 = 1000;
    let token_uri = constants::TOKEN_URI();

    let dynamic_price_hash = DynamicPriceHash { 
        receiver,
        token_id: token_id,
        price: price,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(dynamic_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let dynamic_params = DynamicPriceParameters {
        receiver,
        token_id: token_id + 1,
        price,
        token_uri,
        signature
    };

    let mut dynamic_params_array = array![dynamic_params];

    start_cheat_caller_address(_nft, signer);
    nft.mintDynamicPrice(dynamic_params_array, erc20mock);
}

#[test]
#[should_panic(expected: 'Token not equals to existent')]
fn test_mintDynamicPrice_expected_token() {
    let signer = deploy_account_mock();
    let (_, _nft, _, _) = deploy_factory_nft_receiver_erc20(signer, false, true);
    let nft = INFTDispatcher {contract_address: _nft};

    let receiver = signer;
    let token_id: u256 = 0;
    let price: u256 = 1000;
    let token_uri = constants::TOKEN_URI();

    let dynamic_price_hash = DynamicPriceHash { 
        receiver,
        token_id: token_id,
        price: price,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(dynamic_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let dynamic_params = DynamicPriceParameters {
        receiver,
        token_id,
        price,
        token_uri,
        signature
    };

    let mut dynamic_params_array = array![dynamic_params];

    start_cheat_caller_address(_nft, signer);
    nft.mintDynamicPrice(dynamic_params_array, _nft);
}

#[test]
fn test_mintDynamicPrice_referral() {
    let signer = deploy_account_mock();
    let (_, _nft, _, erc20mock) = deploy_factory_nft_receiver_erc20(signer, true, true);
    let nft = INFTDispatcher {contract_address: _nft};
    let erc20 = IERC20Dispatcher{contract_address: erc20mock};

    let receiver = signer;
    let token_id: u256 = 0;
    let price: u256 = 1000;
    let token_uri = constants::TOKEN_URI();

    let dynamic_price_hash = DynamicPriceHash { 
        receiver,
        token_id: token_id,
        price: price,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(dynamic_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let dynamic_params = DynamicPriceParameters {
        receiver,
        token_id,
        price,
        token_uri,
        signature
    };

    let mut dynamic_params_array = array![dynamic_params];

    let signer_balance_before = erc20.balance_of(signer);
    let platfrom_balance_before = erc20.balance_of(constants::PLATFORM());
    let referral_balance_before = erc20.balance_of(constants::REFERRAL());
    let creator_balance_before = erc20.balance_of(constants::CREATOR());

    let mut spy = spy_events();

    start_cheat_caller_address(_nft, signer);
    nft.mintDynamicPrice(dynamic_params_array, erc20mock);

    spy
    .assert_emitted(
        @array![
            (
                _nft,
                NFT::Event::PaidEvent(
                    NFT::Paid { 
                        user: signer,
                        payment_token: erc20mock,
                        amount: price
                    }
                )
            )
        ]
    );

    let signer_balance_after = erc20.balance_of(signer);
    let platfrom_balance_after = erc20.balance_of(constants::PLATFORM());
    let referral_balance_after = erc20.balance_of(constants::REFERRAL());
    let creator_balance_after = erc20.balance_of(constants::CREATOR());

    println!(
        "platfrom_balance_after + referral_balance_after should be 10 % from price: {}", 
        platfrom_balance_after + referral_balance_after
    );
    println!("platfrom_balance_after should be 5 % from price: {}", platfrom_balance_after);
    println!("referral_balance_after should be 5 % from price: {}", referral_balance_after);
    println!("creator_balance_after should be without 10 % from price: {}", creator_balance_after);
    assert_eq!(signer_balance_before - price, signer_balance_after);
    assert_eq!(
        creator_balance_before + 
            (price - (
                (platfrom_balance_after - platfrom_balance_before) + (referral_balance_after - referral_balance_before)
            )
        ),
        creator_balance_after
    );
    assert_eq!(ERC721ABIDispatcher{contract_address: _nft}.owner_of(token_id), signer);
}

#[test]
#[ignore]
#[should_panic(expected: 'Wrong array size')]
fn test_mintStaticPrice() {
    let signer = deploy_account_mock();
    let (_, _nft, _, erc20mock) = deploy_factory_nft_receiver_erc20(signer, false, true);
    let nft = INFTDispatcher {contract_address: _nft};
    let erc20 = IERC20Dispatcher{contract_address: erc20mock};

    let receiver = signer;
    let token_id: u256 = 0;
    let whitelisted: bool = false;
    let token_uri = constants::TOKEN_URI();

    let static_price_hash = StaticPriceHash { 
        receiver,
        token_id: token_id,
        whitelisted,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(static_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let static_params = StaticPriceParameters {
        receiver,
        token_id,
        whitelisted,
        token_uri,
        signature
    };

    let mut static_params_array = array![static_params];

    let signer_balance_before = erc20.balance_of(signer);
    let platfrom_balance_before = erc20.balance_of(constants::PLATFORM());
    let creator_balance_before = erc20.balance_of(constants::CREATOR());

    let mut spy = spy_events();

    start_cheat_caller_address(_nft, signer);
    nft.mintStaticPrice(static_params_array, erc20mock, constants::MINT_PRICE());

    spy
    .assert_emitted(
        @array![
            (
                _nft,
                NFT::Event::PaidEvent(
                    NFT::Paid { 
                        user: signer,
                        payment_token: erc20mock,
                        amount: constants::MINT_PRICE()
                    }
                )
            )
        ]
    );

    let signer_balance_after = erc20.balance_of(signer);
    let platfrom_balance_after = erc20.balance_of(constants::PLATFORM());
    let creator_balance_after = erc20.balance_of(constants::CREATOR());

    println!("platfrom_balance_after should be 10 % from price: {}", platfrom_balance_after);
    println!("creator_balance_after should be without 10 % from price: {}", creator_balance_after);
    assert_eq!(signer_balance_before - constants::MINT_PRICE(), signer_balance_after);
    assert_eq!(
        creator_balance_before + (constants::MINT_PRICE() - (platfrom_balance_after - platfrom_balance_before)), creator_balance_after
    );
    assert_eq!(ERC721ABIDispatcher{contract_address: _nft}.owner_of(token_id), signer);

    static_params_array = array![static_params, static_params, static_params];
    // Throws: 'Wrong array size'
    nft.mintStaticPrice(static_params_array, erc20mock, constants::MINT_PRICE());
}

#[test]
#[ignore]
fn test_mintStaticPrice_whitelitsed() {
    let signer = deploy_account_mock();
    let (_, _nft, _, erc20mock) = deploy_factory_nft_receiver_erc20(signer, false, true);
    let nft = INFTDispatcher {contract_address: _nft};
    let erc20 = IERC20Dispatcher{contract_address: erc20mock};

    let receiver = signer;
    let token_id: u256 = 0;
    let whitelisted: bool = true;
    let token_uri = constants::TOKEN_URI();

    let static_price_hash = StaticPriceHash { 
        receiver,
        token_id: token_id,
        whitelisted,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(static_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let static_params = StaticPriceParameters {
        receiver,
        token_id,
        whitelisted,
        token_uri,
        signature
    };

    let mut static_params_array = array![static_params];

    let signer_balance_before = erc20.balance_of(signer);
    let platfrom_balance_before = erc20.balance_of(constants::PLATFORM());
    let creator_balance_before = erc20.balance_of(constants::CREATOR());

    let mut spy = spy_events();

    start_cheat_caller_address(_nft, signer);
    nft.mintStaticPrice(static_params_array, erc20mock, constants::WL_MINT_PRICE());

    spy
    .assert_emitted(
        @array![
            (
                _nft,
                NFT::Event::PaidEvent(
                    NFT::Paid { 
                        user: signer,
                        payment_token: erc20mock,
                        amount: constants::WL_MINT_PRICE()
                    }
                )
            )
        ]
    );

    let signer_balance_after = erc20.balance_of(signer);
    let platfrom_balance_after = erc20.balance_of(constants::PLATFORM());
    let creator_balance_after = erc20.balance_of(constants::CREATOR());

    println!("platfrom_balance_after should be 10 % from price: {}", platfrom_balance_after);
    println!("creator_balance_after should be without 10 % from price: {}", creator_balance_after);
    assert_eq!(signer_balance_before - constants::WL_MINT_PRICE(), signer_balance_after);
    assert_eq!(
        creator_balance_before + (constants::WL_MINT_PRICE() - (platfrom_balance_after - platfrom_balance_before)), creator_balance_after
    );
    assert_eq!(ERC721ABIDispatcher{contract_address: _nft}.owner_of(token_id), signer);
}

#[test]
#[should_panic(expected: 'Invalid signature')]
fn test_mintStaticPrice_signature() {
    let signer = deploy_account_mock();
    let (_, _nft, _, erc20mock) = deploy_factory_nft_receiver_erc20(signer, false, true);
    let nft = INFTDispatcher {contract_address: _nft};

    let receiver = signer;
    let token_id: u256 = 0;
    let whitelisted: bool = true;
    let token_uri = constants::TOKEN_URI();

    let static_price_hash = StaticPriceHash { 
        receiver,
        token_id,
        whitelisted,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(static_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let static_params = StaticPriceParameters {
        receiver,
        token_id: token_id + 1,
        whitelisted,
        token_uri,
        signature
    };

    let mut static_params_array = array![static_params];

    start_cheat_caller_address(_nft, signer);
    nft.mintStaticPrice(static_params_array, erc20mock, constants::WL_MINT_PRICE());
}

#[test]
#[should_panic(expected: 'Price not equals to existent')]
fn test_mintStaticPrice_expected_price() {
    let signer = deploy_account_mock();
    let (_, _nft, _, erc20mock) = deploy_factory_nft_receiver_erc20(signer, false, true);
    let nft = INFTDispatcher {contract_address: _nft};

    let receiver = signer;
    let token_id: u256 = 0;
    let whitelisted: bool = true;
    let token_uri = constants::TOKEN_URI();

    let static_price_hash = StaticPriceHash { 
        receiver,
        token_id,
        whitelisted,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(static_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let static_params = StaticPriceParameters {
        receiver,
        token_id,
        whitelisted,
        token_uri,
        signature
    };

    let mut static_params_array = array![static_params];

    start_cheat_caller_address(_nft, signer);
    nft.mintStaticPrice(static_params_array, erc20mock, constants::MINT_PRICE());
}

#[test]
fn test_transfer_transferrable() {
    let signer = deploy_account_mock();
    let account_2 = deploy_account_mock_2();
    let (_, _nft, _, erc20mock) = deploy_factory_nft_receiver_erc20(signer, false, true);
    let nft = INFTDispatcher {contract_address: _nft};

    let receiver = signer;
    let token_id: u256 = 0;
    let whitelisted: bool = false;
    let token_uri = constants::TOKEN_URI();

    let static_price_hash = StaticPriceHash { 
        receiver,
        token_id: token_id,
        whitelisted,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(static_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let static_params = StaticPriceParameters {
        receiver,
        token_id,
        whitelisted,
        token_uri,
        signature
    };

    let mut static_params_array = array![static_params];

    start_cheat_caller_address(_nft, signer);
    nft.mintStaticPrice(static_params_array, erc20mock, constants::MINT_PRICE());

    assert_eq!(ERC721ABIDispatcher{contract_address: _nft}.owner_of(token_id), signer);

    ERC721ABIDispatcher{contract_address: _nft}.transfer_from(signer, account_2, token_id);

    assert_eq!(ERC721ABIDispatcher{contract_address: _nft}.owner_of(token_id), account_2);
}

#[test]
#[should_panic(expected: 'Not transferrable')]
fn test_transfer_not_transferrable() {
    let signer = deploy_account_mock();
    let account_2 = deploy_account_mock_2();
    let (_, _nft, _, erc20mock) = deploy_factory_nft_receiver_erc20(signer, false, false);
    let nft = INFTDispatcher {contract_address: _nft};

    let receiver = signer;
    let token_id: u256 = 0;
    let whitelisted: bool = false;
    let token_uri = constants::TOKEN_URI();

    let static_price_hash = StaticPriceHash { 
        receiver,
        token_id: token_id,
        whitelisted,
        token_uri
    };
    start_cheat_caller_address_global(signer);
    let signature: Span<felt252> = sign_message(static_price_hash.get_message_hash(_nft)).into();
    stop_cheat_caller_address_global();

    let static_params = StaticPriceParameters {
        receiver,
        token_id,
        whitelisted,
        token_uri,
        signature
    };

    let mut static_params_array = array![static_params];

    start_cheat_caller_address(_nft, signer);
    nft.mintStaticPrice(static_params_array, erc20mock, constants::MINT_PRICE());

    ERC721ABIDispatcher{contract_address: _nft}.transfer_from(signer, account_2, token_id);
}
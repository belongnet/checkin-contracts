use crate::nft::interface::{INFTDispatcher, INFTDispatcherTrait, NftParameters};
use crate::nft::nft::{NFT};
use crate::nftfactory::interface::{INFTFactoryDispatcher, INFTFactoryDispatcherTrait, FactoryParameters, InstanceInfo};
use crate::snip12::produce_hash::{ProduceHash, MessageProduceHash};
// Import the deploy syscall to be able to deploy the contract.
use starknet::{ContractAddress, SyscallResultTrait, get_contract_address, contract_address_const};
// Use starknet test utils to fake the contract_address
use starknet::testing::set_contract_address;
use openzeppelin::{
    utils::{
        serde::SerializedAppend,
        bytearray::{
            ByteArrayExtImpl, ByteArrayExtTrait
        }
    },
    token::erc721::interface::{ERC721ABIDispatcher, ERC721ABIDispatcherTrait},
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
    calldata.append_serde(constants::RECEIVER());
    calldata.append_serde(constants::FRACTION());

    // Declare and deploy
    let (contract_address, _) = contract.deploy(
        @calldata
    ).unwrap();

    contract_address
}

fn deploy_factory_nft_receiver_erc20(signer: ContractAddress) 
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
        max_array_size: 10,
    };

    let percentages = array![0, 5000, 3000, 1500, 500].span();

    start_cheat_caller_address(factory, constants::OWNER());
    nft_factory.initialize(
        *nft_class.class_hash, *receiver_class.class_hash, factory_parameters, percentages
    );

    let fraction = 0;
    let produce_hash = ProduceHash { 
        name_hash: constants::NAME().hash(),
        symbol_hash: constants::SYMBOL().hash(),
        contract_uri: constants::CONTRACT_URI().hash(),
        royalty_fraction: fraction
    };
    start_cheat_caller_address_global(signer);

    let signature = constants::stark::KEY_PAIR().serialized_sign(
        produce_hash.get_message_hash(factory)
    );

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
    start_cheat_caller_address(factory, constants::CREATOR());

    let (nft, receiver) = nft_factory.produce(instance_info.clone());

    (factory, nft, receiver, erc20mock)
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
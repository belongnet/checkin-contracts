// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.17.0
mod Errors {
    pub const INITIALIZED: felt252 = 'Contract is already initialized';
    pub const ZERO_ADDRESS: felt252 = 'Zero address passed';
    pub const ZERO_AMOUNT: felt252 = 'Zero amount passed';
    pub const EMPTY_NAME: felt252 = 'Name is empty';
    pub const EMPTY_SYMBOL: felt252 = 'Symbol is empty';
    pub const NFT_EXISTS: felt252 = 'NFT is already exists';
    pub const NFT_NOT_EXISTS: felt252 = 'NFT is not exists';
    pub const REFFERAL_CODE_EXISTS: felt252 = 'Referral code is already exists';
    pub const REFFERAL_CODE_NOT_EXISTS: felt252 = 'Referral code is not exists';
    pub const CAN_NOT_REFER_SELF: felt252 = 'Can not refer to self';
    pub const REFFERAL_CODE_NOT_USED_BY_USER: felt252 = 'User code did not used';
    pub const VALIDATION_ERROR: felt252 = 'Invalid signature';
    pub const WRONG_PERCENTAGES_LEN: felt252 = 'Wrong percentages length';
}

#[starknet::contract]
pub mod NFTFactory {
    use crate::nftfactory::interface::{
        INFTFactory, FactoryParameters, NftInfo, InstanceInfo
    };
    use crate::snip12::produce_hash::{
        MessageProduceHash, ProduceHash
    };
    use crate::nft::interface::{
        INFTDispatcher, INFTDispatcherTrait, NftParameters
    };
    use core::{
        traits::Into, num::traits::Zero, poseidon::poseidon_hash_span
    };
    use starknet::{
        ContractAddress,
        contract_address_const,
        ClassHash,
        SyscallResultTrait,
        get_caller_address,
        get_contract_address,
        get_tx_info,
        syscalls::deploy_syscall,
        event::EventEmitter,
        storage::{
            StoragePointerReadAccess, 
            StoragePointerWriteAccess, 
            Map,
            StorageMapReadAccess,
            StorageMapWriteAccess,
            Vec,
            VecTrait,
            MutableVecTrait,
            StoragePathEntry,
        }
    };
    use openzeppelin::{
        utils::{
            serde::SerializedAppend,
            bytearray::{
                ByteArrayExtImpl, ByteArrayExtTrait
            }
        },
        access::ownable::OwnableComponent, 
        upgrades::{
            UpgradeableComponent, interface::IUpgradeable
        },
        account::interface::{
            ISRC6Dispatcher, ISRC6DispatcherTrait
        }
    };

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: UpgradeableComponent, storage: upgradeable, event: UpgradeableEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;

    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl UpgradeableInternalImpl = UpgradeableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        upgradeable: UpgradeableComponent::Storage,

        factory_parameters: FactoryParameters,
        /// Store the class hash of the contract to deploy
        nft_class_hash: ClassHash,
        receiver_class_hash: ClassHash,

        nft_info: Map<(felt252, felt252), NftInfo>,

        referrals: Map<felt252, ReferralsParametersNode>,
        used_code: Map<ContractAddress, Map<felt252, u8>>,
        used_to_percentage: Vec<u16>
    }

    #[starknet::storage_node]
    struct ReferralsParametersNode {
        referral_creator: ContractAddress,
        referral_users: Vec<ContractAddress>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        UpgradeableEvent: UpgradeableComponent::Event,
        NFTCreatedEvent: NFTCreated,
        ReferralCodeCreatedEvent: ReferralCodeCreated,
        ReferralCodeUsedEvent: ReferralCodeUsed
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    pub struct NFTCreated {
        #[key]
        pub deployed_address: ContractAddress,
        #[key]
        pub creator: ContractAddress,
        pub name: ByteArray,
        pub symbol: ByteArray,
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    pub struct ReferralCodeCreated {
        #[key]
        pub referral_creator: ContractAddress,
        #[key]
        pub referral_code: felt252,
    }
    
    #[derive(Drop, PartialEq, starknet::Event)]
    pub struct ReferralCodeUsed {
        #[key]
        pub referral_user: ContractAddress,
        #[key]
        pub referral_code: felt252,
    }

    pub const SKALING_FACTOR: u256 = 10000; // 100 %

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.ownable.initializer(owner);
    }

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.upgradeable.upgrade(new_class_hash);
        }
    }

    #[abi(embed_v0)]
    impl NFTFactoryImpl of INFTFactory<ContractState> {
        fn initialize(
            ref self: ContractState,
            nft_class_hash: ClassHash,
            receiver_class_hash: ClassHash,
            factory_parameters: FactoryParameters
        ) {
            self.ownable.assert_only_owner();
            assert(self.factory_parameters.platform_address.read().is_zero(), super::Errors::INITIALIZED);

            self.nft_class_hash.write(nft_class_hash);
            self.receiver_class_hash.write(receiver_class_hash);
            self._set_factory_parameters(factory_parameters);
        }

        fn produce(ref self: ContractState, instance_info: InstanceInfo) -> ContractAddress {
            let deployed_address = self._produce(instance_info);
            deployed_address
        }

        fn createReferralCode(ref self: ContractState) -> felt252 {
            return self._create_referral_code();
        }

        fn updateNftClassHash(ref self: ContractState, class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.nft_class_hash.write(class_hash);
        }

        fn updateReceiverClassHash(ref self: ContractState, class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.receiver_class_hash.write(class_hash);
        }

        fn setFactoryParameters(ref self: ContractState, factory_parameters: FactoryParameters) {
            self.ownable.assert_only_owner();
            self._set_factory_parameters(factory_parameters);
        }

        fn setReferralPercentages(ref self: ContractState, percentages: Span<u16>) {
            self.ownable.assert_only_owner();
            self._set_referral_percentages(percentages);
        }

        fn nftInfo(self: @ContractState, name: ByteArray, symbol: ByteArray) -> NftInfo {
            return self._nft_info(name, symbol);
        }

        fn nftFactoryParameters(self: @ContractState) -> FactoryParameters {
            return self.factory_parameters.read();
        }

        fn maxArraySize(self: @ContractState) -> u256 {
            return self.factory_parameters.max_array_size.read();
        }

        fn signer(self: @ContractState) -> ContractAddress {
            return self.factory_parameters.signer.read();
        }

        fn platformParams(self: @ContractState) -> (u256, ContractAddress) {
            return (self.factory_parameters.platform_commission.read(), self.factory_parameters.platform_address.read());
        }

        fn usedToPercentage(self: @ContractState, timesUsed: u8) -> u16 {
            return self.used_to_percentage.at(timesUsed.into()).read();
        }

        fn referralCode(self: @ContractState, account: ContractAddress) -> felt252 {
            let hash = poseidon_hash_span(
                array![account.into(), get_contract_address().into(), get_tx_info().unbox().chain_id].span()
            );
            self._check_referral_code(hash);

            hash
        }

        fn getReferralCreator(self: @ContractState, referral_code: felt252) -> ContractAddress {
            let referalCreator = self._get_referral_creator(referral_code);
            referalCreator
        }

        fn getReferralUsers(self: @ContractState, referral_code: felt252) -> Span<ContractAddress> {
            self._check_referral_code(referral_code);

            let mut users = array![];

            for i in 0..self.referrals.entry(referral_code).referral_users.len() {
                users.append(self.referrals.entry(referral_code).referral_users.at(i).read());
            };

            users.span()
        }

        fn getReferralRate(self: @ContractState, referral_user: ContractAddress, referral_code: felt252, amount: u256) -> u256 {
            let used = self.used_code.entry(referral_user).entry(referral_code).read();

            assert(used > 0, super::Errors::REFFERAL_CODE_NOT_USED_BY_USER);

            let rate = amount * self.used_to_percentage.at(used.into()).read().into() / SKALING_FACTOR;

            rate
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _produce(ref self: ContractState, instance_info: InstanceInfo) -> ContractAddress {
            let info = instance_info.clone();

            assert(info.name.len().is_non_zero(), super::Errors::EMPTY_NAME);
            assert(info.symbol.len().is_non_zero(), super::Errors::EMPTY_SYMBOL);

            let metadata_name_hash: felt252 = info.name.hash();
            let metadata_symbol_hash: felt252 = info.symbol.hash();
            let contract_uri_hash: felt252 = info.contract_uri.hash();
        
            assert(self.nft_info.entry((metadata_name_hash, metadata_symbol_hash)).nft_address.read().is_zero(), super::Errors::NFT_EXISTS);
            
            let message = ProduceHash {
                name_hash: metadata_name_hash,
                symbol_hash: metadata_symbol_hash,
                contract_uri: contract_uri_hash,
                royalty_fraction: info.royalty_fraction
            };

            let hash = message.get_message_hash(get_contract_address());
            let is_valid_signature_felt = 
                ISRC6Dispatcher { contract_address: self.factory_parameters.signer.read() }.is_valid_signature(hash, info.signature);
            // Check either 'VALID' or True for backwards compatibility
            let is_valid_signature = is_valid_signature_felt == starknet::VALIDATED
                || is_valid_signature_felt == 1;
            assert(is_valid_signature, super::Errors::VALIDATION_ERROR);

            let payment_token = if info.payment_token.is_zero() {
                self.factory_parameters.default_payment_currency.read()
            } else {
                info.payment_token
            };

            let nft_parameters = NftParameters {
                payment_token,
                contract_uri: contract_uri_hash,
                mint_price: info.mint_price,
                whitelisted_mint_price: info.whitelisted_mint_price,
                max_total_supply: info.max_total_supply,
                collection_expires: info.collection_expires,
                transferrable: info.transferrable,
                referral_code: info.referral_code,
            };

            println!("here: {}", 1);
            // Zero address
            let mut receiver_address: ContractAddress = contract_address_const::<0>();
            self._set_referral_user(info.referral_code, get_caller_address());
            if info.royalty_fraction.is_non_zero() {
                let referral_creator = self._get_referral_creator(info.referral_code);
                let receiver_constructor_calldata: Array<felt252> = array![
                    info.referral_code,
                    get_caller_address().into(),
                    self.factory_parameters.platform_address.read().into(),
                    referral_creator.into()
                ];

                let (address, _) = deploy_syscall(
                    self.receiver_class_hash.read(), 0, receiver_constructor_calldata.span(), false
                ).unwrap_syscall();
                receiver_address = address;
            }
            println!("here: {}", 2);
            let mut nft_constructor_calldata: Array<felt252> = array![];
            nft_constructor_calldata.append_serde(get_caller_address());
            nft_constructor_calldata.append_serde(get_contract_address());
            nft_constructor_calldata.append_serde(info.name.clone());
            nft_constructor_calldata.append_serde(info.symbol.clone());
            nft_constructor_calldata.append_serde(receiver_address);
            nft_constructor_calldata.append_serde(info.royalty_fraction);
            println!("here: {}", 3);
            let (nft_address, _) = deploy_syscall(
                self.nft_class_hash.read(), 0, nft_constructor_calldata.span(), false
            ).unwrap_syscall();
            println!("here: {}", 4);
            INFTDispatcher { contract_address: nft_address }.initialize(
                nft_parameters
            );

            self.nft_info.write(
                (metadata_name_hash,metadata_symbol_hash), 
                NftInfo {
                    name: info.name.clone(),
                    symbol: info.symbol.clone(),
                    creator: get_caller_address(),
                    nft_address: nft_address
                }
            );

            self.emit( 
                Event::NFTCreatedEvent(
                    NFTCreated { 
                        deployed_address: nft_address,
                        creator: get_caller_address(),
                        name: info.name,    
                        symbol: info.symbol,
                    }
                )
            );

            nft_address
        }

        fn _create_referral_code(ref self: ContractState) -> felt252 {
            let mut referral_code = poseidon_hash_span(
                array![get_caller_address().into(), get_contract_address().into(), get_tx_info().unbox().chain_id].span()
            );

            assert(self.referrals.entry(referral_code).referral_creator.read().is_zero(), super::Errors::REFFERAL_CODE_EXISTS);
            
            self.referrals.entry(referral_code).referral_creator.write(get_caller_address());

            self.emit(
                Event::ReferralCodeCreatedEvent(
                    ReferralCodeCreated { 
                        referral_creator: get_caller_address(),
                        referral_code
                    }
                )
            );

            referral_code
        }

        fn _set_referral_user(ref self: ContractState, referral_code: felt252, referral_user: ContractAddress) {
            if(referral_code.is_zero()) {
                return;
            }

            let referrals = self.referrals.entry(referral_code);

            assert(referrals.referral_creator.read().is_non_zero(), super::Errors::REFFERAL_CODE_NOT_EXISTS);
            assert(referral_user != referrals.referral_creator.read(), super::Errors::CAN_NOT_REFER_SELF);

            let mut inArray = false;
            for i in 0..referrals.referral_users.len() {
                if referrals.referral_users.at(i).read() == referral_user {
                    inArray = true;
                    break;
                }
            };

            if(!inArray) {
                self.referrals.entry(referral_code).referral_users.append().write(referral_user);
            }

            let used_code = self.used_code.entry(referral_user).entry(referral_code).read();
            if used_code < 4 {
                self.used_code.entry(referral_user).entry(referral_code).write(used_code + 1);
            }

            self.emit(
                Event::ReferralCodeUsedEvent(
                    ReferralCodeUsed {
                        referral_user,
                        referral_code,
                    }
                )
            );
        }

        fn _set_factory_parameters(ref self: ContractState, factory_parameters: FactoryParameters) {
            assert(factory_parameters.signer.is_non_zero(), super::Errors::ZERO_ADDRESS);
            assert(factory_parameters.platform_address.is_non_zero(), super::Errors::ZERO_ADDRESS);
            assert(factory_parameters.platform_commission.is_non_zero(), super::Errors::ZERO_AMOUNT);
            self.factory_parameters.write(factory_parameters);
        }

        fn _set_referral_percentages(ref self: ContractState, percentages: Span<u16>) {
            assert(percentages.len() == 5, super::Errors::WRONG_PERCENTAGES_LEN);

            for i in 0..percentages.len() {
                self.used_to_percentage.append().write(*percentages.at(i));
            };
        }

        fn _nft_info(self: @ContractState, name: ByteArray, symbol: ByteArray) -> NftInfo {
            let metadata_name_hash: felt252 = name.hash();
            let metadata_symbol_hash: felt252 = symbol.hash();
        
            let nft_info = self.nft_info.read((metadata_name_hash, metadata_symbol_hash));
            assert(nft_info.nft_address.is_non_zero(), super::Errors::NFT_NOT_EXISTS);

            nft_info
        }

        fn _check_referral_code(self: @ContractState, referral_code: felt252) {
            assert(
                self.referrals.entry(referral_code).referral_creator.read().is_non_zero(),
                super::Errors::REFFERAL_CODE_NOT_EXISTS
            );
        }

        fn _get_referral_creator(self: @ContractState, referral_code: felt252) -> ContractAddress {
            self._check_referral_code(referral_code);

            let creator = self.referrals.entry(referral_code).referral_creator.read();

            creator
        }
    }
}
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
    pub const REFFERAL_CODE_NOT_EXISTS: felt252 = 'Referral code does not exist';
    pub const CAN_NOT_REFER_SELF: felt252 = 'Can not refer to self';
    pub const REFFERAL_CODE_NOT_USED_BY_USER: felt252 = 'User code did not used';
    pub const VALIDATION_ERROR: felt252 = 'Invalid signature';
    pub const WRONG_PERCENTAGES_LEN: felt252 = 'Wrong percentages length';
    pub const WRONG_PLATFORM_COMMISSION: felt252 = 'Wrong platform commission set';
    pub const WRONG_PERCENTAGE: felt252 = 'Wrong percentage value';
}

#[starknet::contract]
pub mod NFTFactory {
    use core::{num::traits::Zero, traits::Into, poseidon::poseidon_hash_span};
    use starknet::{
        ContractAddress, ClassHash, SyscallResultTrait, event::EventEmitter, contract_address_const,
        get_caller_address, get_contract_address, get_tx_info, syscalls::deploy_syscall,
        storage::{
            StoragePointerReadAccess, StoragePointerWriteAccess, Map, StorageMapReadAccess,
            StorageMapWriteAccess, Vec, VecTrait, MutableVecTrait, StoragePathEntry,
        },
    };
    use openzeppelin::{
        utils::{serde::SerializedAppend, bytearray::{ByteArrayExtImpl, ByteArrayExtTrait}},
        access::ownable::OwnableComponent,
        upgrades::{UpgradeableComponent, interface::IUpgradeable},
        account::interface::{ISRC6Dispatcher, ISRC6DispatcherTrait},
        token::common::erc2981::DefaultConfig,
    };
    use crate::{
        snip12::{
            produce_hash::{MessageProduceHash, ProduceHash},
            interfaces::SignatureProtection
        },
        nftfactory::interface::{INFTFactory, FactoryParameters, NftInfo, InstanceInfo},
        nft::interface::{INFTDispatcher, INFTDispatcherTrait, NftParameters},
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
        used_to_percentage: Vec<u16>,
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
        ProducedEvent: Produced,
        ReferralCodeCreatedEvent: ReferralCodeCreated,
        ReferralCodeUsedEvent: ReferralCodeUsed,
    }

    #[derive(Drop, PartialEq, starknet::Event)]
    pub struct Produced {
        #[key]
        pub nft_address: ContractAddress,
        #[key]
        pub creator: ContractAddress,
        pub receiver_address: ContractAddress,
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
            factory_parameters: FactoryParameters,
            percentages: Span<u16>,
        ) {
            self.ownable.assert_only_owner();
            assert(
                self.factory_parameters.platform_address.read().is_zero(),
                super::Errors::INITIALIZED,
            );

            self.nft_class_hash.write(nft_class_hash);
            self.receiver_class_hash.write(receiver_class_hash);
            self._set_factory_parameters(factory_parameters);
            self._set_referral_percentages(percentages);
        }

        fn produce(
            ref self: ContractState, signature_protection: SignatureProtection, instance_info: InstanceInfo,
        ) -> (ContractAddress, ContractAddress) {
            let (deployed_address, receiver_address) = self._produce(signature_protection, instance_info);
            (deployed_address, receiver_address)
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
            return (
                self.factory_parameters.platform_commission.read(),
                self.factory_parameters.platform_address.read(),
            );
        }

        fn usedToPercentage(self: @ContractState, timesUsed: u8) -> u16 {
            return self.used_to_percentage.at(timesUsed.into()).read();
        }

        fn referralCode(self: @ContractState, account: ContractAddress) -> felt252 {
            let hash = poseidon_hash_span(
                array![
                    account.into(), get_contract_address().into(), get_tx_info().unbox().chain_id,
                ]
                    .span(),
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

        fn getReferralRate(
            self: @ContractState,
            referral_user: ContractAddress,
            referral_code: felt252,
            amount: u256,
        ) -> u256 {
            let used = self.used_code.entry(referral_user).entry(referral_code).read();

            assert(used > 0, super::Errors::REFFERAL_CODE_NOT_USED_BY_USER);

            let rate = amount
                * self.used_to_percentage.at(used.into()).read().into()
                / SKALING_FACTOR;

            rate
        }

        fn produceHash(
            self: @ContractState, name: ByteArray, symbol: ByteArray, contract_uri: ByteArray,
        ) -> (felt252, felt252, felt252) {
            let (name_hash, symbol_hash, contract_uri_hash) = self
                ._produce_hash(name, symbol, contract_uri);

            return (name_hash, symbol_hash, contract_uri_hash);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _produce(
            ref self: ContractState, signature_protection: SignatureProtection, instance_info: InstanceInfo,
        ) -> (ContractAddress, ContractAddress) {
            let info = instance_info.clone();

            assert(info.name.len().is_non_zero(), super::Errors::EMPTY_NAME);
            assert(info.symbol.len().is_non_zero(), super::Errors::EMPTY_SYMBOL);

            let metadata_name_hash: felt252 = info.name.hash();
            let metadata_symbol_hash: felt252 = info.symbol.hash();
            let contract_uri_hash: felt252 = info.contract_uri.hash();

            assert(
                self
                    .nft_info
                    .entry((metadata_name_hash, metadata_symbol_hash))
                    .nft_address
                    .read()
                    .is_zero(),
                super::Errors::NFT_EXISTS,
            );

            let signerAddress = self.factory_parameters.signer.read();
            let signer = ISRC6Dispatcher { contract_address: signerAddress };

            let message = ProduceHash {
                verifying_contract: get_contract_address(),
                nonce: signature_protection.nonce,
                deadline: signature_protection.deadline,
                name_hash: metadata_name_hash,
                symbol_hash: metadata_symbol_hash,
                contract_uri_hash: contract_uri_hash,
                royalty_fraction: info.royalty_fraction,
                creator_address: info.creator_address,
            };

            let hash = message.get_message_hash(signerAddress);
            let is_valid_signature_felt = signer.is_valid_signature(hash, signature_protection.signature);
            assert(
                is_valid_signature_felt == starknet::VALIDATED || is_valid_signature_felt == 1,
                super::Errors::VALIDATION_ERROR,
            );

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
                transferrable: info.transferrable,
                referral_code: info.referral_code,
            };

            // Generate a unique salt for the deployment
            let salt = poseidon_hash_span(
                array![
                    metadata_name_hash,
                    metadata_symbol_hash,
                    info.creator_address.into(),
                    get_tx_info().unbox().nonce,
                ]
                    .span(),
            );

            // Deploy receiver contract if royalty_fraction is non-zero
            let mut receiver_address: ContractAddress = contract_address_const::<0>();
            self._set_referral_user(info.referral_code, info.creator_address);
            if info.royalty_fraction.is_non_zero() {
                let referral_creator = self._get_referral_creator(info.referral_code);
                let receiver_constructor_calldata: Array<felt252> = array![
                    info.referral_code,
                    info.creator_address.into(),
                    self.factory_parameters.platform_address.read().into(),
                    referral_creator.into(),
                ];

                let (address, _) = deploy_syscall(
                    self.receiver_class_hash.read(),
                    salt,
                    receiver_constructor_calldata.span(),
                    false,
                )
                    .unwrap_syscall();
                receiver_address = address;
            }

            let mut nft_constructor_calldata: Array<felt252> = array![];
            nft_constructor_calldata.append_serde(info.creator_address);
            nft_constructor_calldata.append_serde(get_contract_address());
            nft_constructor_calldata.append_serde(info.name.clone());
            nft_constructor_calldata.append_serde(info.symbol.clone());
            nft_constructor_calldata.append_serde(receiver_address);
            nft_constructor_calldata.append_serde(info.royalty_fraction);

            let (nft_address, _) = deploy_syscall(
                self.nft_class_hash.read(), salt, nft_constructor_calldata.span(), false,
            )
                .unwrap_syscall();

            INFTDispatcher { contract_address: nft_address }.initialize(nft_parameters);

            self
                .nft_info
                .write(
                    (metadata_name_hash, metadata_symbol_hash),
                    NftInfo {
                        name: info.name.clone(),
                        symbol: info.symbol.clone(),
                        creator: info.creator_address,
                        nft_address,
                        receiver_address,
                    },
                );

            self
                .emit(
                    Event::ProducedEvent(
                        Produced {
                            nft_address,
                            creator: info.creator_address,
                            receiver_address,
                            name: info.name,
                            symbol: info.symbol,
                        },
                    ),
                );

            (nft_address, receiver_address)
        }

        fn _create_referral_code(ref self: ContractState) -> felt252 {
            let mut referral_code = poseidon_hash_span(
                array![
                    get_caller_address().into(),
                    get_contract_address().into(),
                    get_tx_info().unbox().chain_id,
                ]
                    .span(),
            );

            assert(
                self.referrals.entry(referral_code).referral_creator.read().is_zero(),
                super::Errors::REFFERAL_CODE_EXISTS,
            );

            self.referrals.entry(referral_code).referral_creator.write(get_caller_address());

            self
                .emit(
                    Event::ReferralCodeCreatedEvent(
                        ReferralCodeCreated {
                            referral_creator: get_caller_address(), referral_code,
                        },
                    ),
                );

            referral_code
        }

        fn _set_referral_user(
            ref self: ContractState, referral_code: felt252, referral_user: ContractAddress,
        ) {
            if (referral_code.is_zero()) {
                return;
            }

            let referrals = self.referrals.entry(referral_code);

            assert(
                referrals.referral_creator.read().is_non_zero(),
                super::Errors::REFFERAL_CODE_NOT_EXISTS,
            );
            assert(
                referral_user != referrals.referral_creator.read(),
                super::Errors::CAN_NOT_REFER_SELF,
            );

            let mut inArray = false;
            for i in 0..referrals.referral_users.len() {
                if referrals.referral_users.at(i).read() == referral_user {
                    inArray = true;
                    break;
                }
            };

            if (!inArray) {
                self.referrals.entry(referral_code).referral_users.append().write(referral_user);
            }

            let used_code = self.used_code.entry(referral_user).entry(referral_code).read();
            if used_code < 4 {
                self.used_code.entry(referral_user).entry(referral_code).write(used_code + 1);
            }

            self
                .emit(
                    Event::ReferralCodeUsedEvent(ReferralCodeUsed { referral_user, referral_code }),
                );
        }

        fn _set_factory_parameters(ref self: ContractState, factory_parameters: FactoryParameters) {
            assert(factory_parameters.signer.is_non_zero(), super::Errors::ZERO_ADDRESS);
            assert(factory_parameters.platform_address.is_non_zero(), super::Errors::ZERO_ADDRESS);
            assert(
                factory_parameters.platform_commission.is_non_zero() &&
                factory_parameters.platform_commission <= DefaultConfig::FEE_DENOMINATOR.into(),
                super::Errors::WRONG_PLATFORM_COMMISSION,
            );
            self.factory_parameters.write(factory_parameters);
        }

        fn _set_referral_percentages(ref self: ContractState, percentages: Span<u16>) {
            assert(percentages.len() == 5, super::Errors::WRONG_PERCENTAGES_LEN);

            // Remove all existing entries by popping until empty (clear() is not available on storage Vec)
            while self.used_to_percentage.len().is_non_zero() {
                let _ = self.used_to_percentage.pop();
            };

            let scaling_factor: u16 = 10000;
            for i in 0..percentages.len() {
                let percentage_val = *percentages.at(i);
                assert(
                    percentage_val.is_non_zero() && percentage_val <= scaling_factor,
                    super::Errors::WRONG_PERCENTAGE,
                );

                self.used_to_percentage.push(percentage_val);
            };
        }

        fn _nft_info(self: @ContractState, name: ByteArray, symbol: ByteArray) -> NftInfo {
            let metadata_name_hash: felt252 = name.hash();
            let metadata_symbol_hash: felt252 = symbol.hash();

            let nft_info = self.nft_info.read((metadata_name_hash, metadata_symbol_hash));
            assert(nft_info.nft_address.is_non_zero(), super::Errors::NFT_NOT_EXISTS);

            nft_info
        }

        fn _produce_hash(
            self: @ContractState, name: ByteArray, symbol: ByteArray, contract_uri: ByteArray,
        ) -> (felt252, felt252, felt252) {
            let name_hash: felt252 = name.hash();
            let symbol_hash: felt252 = symbol.hash();
            let contract_uri_hash: felt252 = contract_uri.hash();

            return (name_hash, symbol_hash, contract_uri_hash);
        }

        fn _check_referral_code(self: @ContractState, referral_code: felt252) {
            assert(
                self.referrals.entry(referral_code).referral_creator.read().is_non_zero(),
                super::Errors::REFFERAL_CODE_NOT_EXISTS,
            );
        }

        fn _get_referral_creator(self: @ContractState, referral_code: felt252) -> ContractAddress {
            let creator = self.referrals.entry(referral_code).referral_creator.read();

            creator
        }
    }
}

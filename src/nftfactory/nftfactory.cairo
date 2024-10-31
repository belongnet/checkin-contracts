// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.17.0

mod Errors {
    pub const ZERO_ADDRESS: felt252 = 'Zero address passed';
    pub const ZERO_AMOUNT: felt252 = 'Zero amount passed';
    pub const EMPTY_NAME: felt252 = 'Name is empty';
    pub const EMPTY_SYMBOL: felt252 = 'Symbol is empty';
    pub const NFT_EXISTS: felt252 = 'NFT is already exists';
    pub const NFT_NOT_EXISTS: felt252 = 'NFT is not exists';
    pub const REFFERAL_CODE_EXISTS: felt252 = 'Referral code is already exists';
    pub const REFFERAL_CODE_NOT_EXISTS: felt252 = 'Referral code is not exists';
    pub const CAN_NOT_REFER_SELF: felt252 = 'Can not refer to self';
    pub const REFFERAL_CODE_NOT_USED_BY_USER: felt252 = 'User code did not used code';
}

#[starknet::contract]
mod NFTFactory {
    use crate::nft::interface::{
        INFTInitializerDispatcher,
        INFTInitializerDispatcherTrait
    };
    use core::{
        traits::Into,
        num::traits::Zero,
        starknet::event::EventEmitter,
        pedersen::pedersen
    };
    use starknet::{
        ContractAddress,
        ClassHash,
        SyscallResultTrait,
        get_caller_address,
        get_contract_address,
        syscalls::deploy_syscall,
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
        access::ownable::OwnableComponent,
        upgrades::{
            UpgradeableComponent,
            interface::IUpgradeable
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
        
        /// Store the class hash of the contract to deploy
        nft_class_hash: ClassHash,

        nft_info: Map<felt252, NftInfo>,
        factory_parameters: FactoryParameters,

        referrals: Map<felt252, ReferralsParametersNode>,
        used_code: Map<ContractAddress, Map<felt252, u8>>,
        used_to_percentage: Vec<u16>
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct NftMetadata {
        name: felt252,
        symbol: felt252,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct NftInfo {
        nft_metadata: NftMetadata,
        creator: ContractAddress,
        nft_address: ContractAddress
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct InstanceInfo {
        nft_metadata: NftMetadata,
        payment_token: ContractAddress,
        fee_receiver: ContractAddress,
        royalty_fraction: felt252,
        transferrable: bool,
        max_total_supply: u256,         // The max total supply of a new collection
        mint_price: u256,               // Mint price of a token from a new collection
        whitelisted_mint_price: u256,     // Mint price for whitelisted users
        collection_expires: u256,       // Collection expiration period (timestamp)
        referral_code: felt252,
        signature: felt252,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct FactoryParameters {
        signer_address: ContractAddress,
        default_payment_currency: ContractAddress,
        platform_address: ContractAddress,
        platform_commission: u256,
    }

    #[starknet::storage_node]
    struct ReferralsParametersNode {
        referral_creator: ContractAddress,
        referral_users: Vec<ContractAddress>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
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
        pub name: felt252,
        pub symbol: felt252,
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
    fn constructor(ref self: ContractState, owner: ContractAddress, class_hash: ClassHash, factory_parameters: FactoryParameters) {
        self.nft_class_hash.write(class_hash);
        self.factory_parameters.write(factory_parameters);

        self.ownable.initializer(owner);
    }

    #[abi(embed_v0)]
    impl UpgradeableImpl of IUpgradeable<ContractState> {
        fn upgrade(ref self: ContractState, new_class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self.upgradeable.upgrade(new_class_hash);
        }
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        // fn create_counter_at(ref self: ContractState, init_value: u128) -> ContractAddress {
        //     // Constructor arguments
        //     let mut constructor_calldata: Array::<felt252> = array![init_value.into()];

        //     // Contract deployment
        //     let (deployed_address, _) = deploy_syscall(
        //         self.nft_class_hash.read(), 0, constructor_calldata.span(), false
        //     )
        //         .unwrap_syscall();

        //     deployed_address
        // }

        #[external(v0)]
        fn update_nft_class_hash(ref self: ContractState, class_hash: ClassHash) {
            self.ownable.assert_only_owner();
            self._update_nft_class_hash(class_hash);
        }

        #[external(v0)]
        fn set_factory_parameters(ref self: ContractState, factory_parameters: FactoryParameters) {
            self.ownable.assert_only_owner();
            self._set_factory_parameters(factory_parameters);
        }

        #[external(v0)]
        fn set_referral_percentages(ref self: ContractState, percentages: Array<u16>) {
            self.ownable.assert_only_owner();
            self._set_referral_percentages(percentages);
        }

        #[external(v0)]
        fn nft_info(self: @ContractState, nft_metadata: NftMetadata) -> NftInfo {
            return self._nft_info(nft_metadata);
        }

        #[external(v0)]
        fn factory_parameters(self: @ContractState) -> FactoryParameters {
            return self._factory_parameters();
        }

        #[external(v0)]
        fn referral_code(self: @ContractState, account: ContractAddress) -> felt252 {
            return self._referral_code(account);
        }

        #[external(v0)]
        fn referral_creator(self: @ContractState, referral_code: felt252) -> ContractAddress {
            return self._referral_creator(referral_code);
        }

        #[external(v0)]
        fn referral_users(self: @ContractState, referral_code: felt252) -> Array<ContractAddress> {
            return self._referral_users(referral_code);
        }

        #[external(v0)]
        fn referral_rate(self: @ContractState, referral_user: ContractAddress, referral_code: felt252, amount: u256) -> u256 {
            return self._referral_rate(referral_user, referral_code, amount);
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _produce(ref self: ContractState, instance_info: InstanceInfo) -> ContractAddress {
            assert(instance_info.nft_metadata.name.is_zero(), super::Errors::EMPTY_NAME);
            assert(instance_info.nft_metadata.symbol.is_zero(), super::Errors::EMPTY_SYMBOL);

            let name = instance_info.nft_metadata.name;
            let symbol = instance_info.nft_metadata.symbol;

            let hash = pedersen(name, symbol);
            assert(self.nft_info.read(hash).nft_address.is_non_zero(), super::Errors::NFT_EXISTS);

            // TODO: add signature checkers

            let payment_token = if instance_info.payment_token.is_zero() {
                self.factory_parameters.default_payment_currency.read()
            } else {
                instance_info.payment_token
            };

            // Constructor arguments
            let mut constructor_calldata: Array::<felt252> = array![
                get_caller_address().into(),
                get_contract_address().into(),
                name, 
                symbol,
                instance_info.fee_receiver.into(),
                instance_info.royalty_fraction,
            ];

            let (deployed_address, _) = deploy_syscall(
                self.nft_class_hash.read(), 0, constructor_calldata.span(), false
            ).unwrap_syscall();

            INFTInitializerDispatcher { contract_address: deployed_address }.initialize(
                payment_token,
                instance_info.mint_price,
                instance_info.whitelisted_mint_price,
                instance_info.max_total_supply,
                instance_info.collection_expires,
                instance_info.transferrable,
                instance_info.referral_code,
                instance_info.signature,
            );

            self.nft_info.write(
                hash, 
                NftInfo {
                    nft_metadata: instance_info.nft_metadata,
                    creator: get_caller_address(),
                    nft_address: deployed_address
                }
            );

            self._set_referral_user(instance_info.referral_code, get_caller_address());

            self.emit(
                Event::NFTCreatedEvent(
                    NFTCreated { 
                        deployed_address,
                        creator: get_caller_address(),
                        name,
                        symbol,
                    }
                )
            );

            deployed_address
        }

        fn _create_referral_code(ref self: ContractState) -> felt252 {
            let referral_code = pedersen(get_caller_address().into(), get_contract_address().into());
            assert(self.referrals.entry(referral_code).referral_creator.read().is_non_zero(), super::Errors::REFFERAL_CODE_EXISTS);
            
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

            assert(referrals.referral_creator.read().is_zero(), super::Errors::REFFERAL_CODE_NOT_EXISTS);
            assert(referral_user == referrals.referral_creator.read(), super::Errors::CAN_NOT_REFER_SELF);

            // let referral_users = referrals.referral_users.len();
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

        fn _update_nft_class_hash(ref self: ContractState, nft_class_hash: ClassHash) {
            self.nft_class_hash.write(nft_class_hash);
        }

        fn _set_factory_parameters(ref self: ContractState, factory_parameters: FactoryParameters) {
            assert(factory_parameters.signer_address.is_zero(), super::Errors::ZERO_ADDRESS);
            assert(factory_parameters.platform_address.is_zero(), super::Errors::ZERO_ADDRESS);
            assert(factory_parameters.platform_commission.is_zero(), super::Errors::ZERO_AMOUNT);
            self.factory_parameters.write(factory_parameters);
        }

        fn _set_referral_percentages(ref self: ContractState, percentages: Array<u16>) {
            for i in 0..percentages.len() {
                self.used_to_percentage.append().write(*percentages.at(i));
            };
        }

        fn _factory_parameters(self: @ContractState) -> FactoryParameters {
            return self.factory_parameters.read();
        }

        fn _nft_info(self: @ContractState, nft_metadata: NftMetadata) -> NftInfo {
            let hash = pedersen(nft_metadata.name, nft_metadata.symbol);
            assert(self.nft_info.read(hash).nft_address.is_zero(), super::Errors::NFT_NOT_EXISTS);

            return self.nft_info.read(hash);
        }

        fn _referral_code(self: @ContractState, account: ContractAddress) -> felt252 {
            let hash = pedersen(account.into(), get_contract_address().into());
            self._check_referral_code(hash);

            hash
        }

        fn _referral_creator(self: @ContractState, referral_code: felt252) -> ContractAddress {
            self._check_referral_code(referral_code);

            let creator = self.referrals.entry(referral_code).referral_creator.read();

            creator
        }

        fn _referral_users(self: @ContractState, referral_code: felt252) -> Array<ContractAddress> {
            self._check_referral_code(referral_code);

            let mut users = array![];

            for i in 0..self.referrals.entry(referral_code).referral_users.len() {
                users.append(self.referrals.entry(referral_code).referral_users.at(i).read());
            };

            users
        }

        fn _check_referral_code(self: @ContractState, referral_code: felt252) {
            assert(self.referrals.entry(referral_code).referral_creator.read().is_zero(), super::Errors::REFFERAL_CODE_NOT_EXISTS);
        }

        fn _referral_rate(self: @ContractState, referral_user: ContractAddress, referral_code: felt252, amount: u256) -> u256 {
            let used = self.used_code.entry(referral_user).entry(referral_code).read();

            assert(used == 0, super::Errors::REFFERAL_CODE_NOT_USED_BY_USER);

            let rate = amount * self.used_to_percentage.at(used.into()).read().into() / SKALING_FACTOR;

            rate
        }
    }
}

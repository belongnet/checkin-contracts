mod Errors {
    pub const ZERO_ADDRESS: felt252 = 'Zero address passed';
    pub const ZERO_AMOUNT: felt252 = 'Zero amount passed';
    pub const EMPTY_NAME: felt252 = 'Name is empty';
    pub const EMPTY_SYMBOL: felt252 = 'Symbol is empty';
}


#[starknet::contract]
pub mod NFTFactory {
    use core::{
        num::traits::Zero,
        starknet::event::EventEmitter
    };
    use starknet::{
        ContractAddress,
        ClassHash,
        SyscallResultTrait,
        syscalls::deploy_syscall,
        storage::{
            StoragePointerReadAccess, 
            StoragePointerWriteAccess, 
            Map,
            StorageMapReadAccess,
            StorageMapWriteAccess,
        }
    };
    use openzeppelin::access::ownable::OwnableComponent;

    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);

    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;

    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        
        /// Store the class hash of the contract to deploy
        counter_class_hash: ClassHash,
        factory_parameters: FactoryParameters,
        platform_parameters: PlatfromParameters,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct NftParameters {
        name: ByteArray,
        symbol: ByteArray,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct FactoryParameters {
        signer_address: ContractAddress,
        default_payment_currency: ContractAddress,
    }

    #[derive(Drop, Serde, starknet::Store)]
    struct PlatfromParameters {
        platform_address: ContractAddress,
        platform_commission: u256,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        OwnableEvent: OwnableComponent::Event
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, class_hash: ClassHash, factory_parameters: FactoryParameters, platform_parameters: PlatfromParameters) {
        self.counter_class_hash.write(class_hash);
        self.factory_parameters.write(factory_parameters);
        self.platform_parameters.write(platform_parameters);

        self.ownable.initializer(owner);
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        // fn create_counter_at(ref self: ContractState, init_value: u128) -> ContractAddress {
        //     // Constructor arguments
        //     let mut constructor_calldata: Array::<felt252> = array![init_value.into()];

        //     // Contract deployment
        //     let (deployed_address, _) = deploy_syscall(
        //         self.counter_class_hash.read(), 0, constructor_calldata.span(), false
        //     )
        //         .unwrap_syscall();

        //     deployed_address
        // }

        // fn create_counter(ref self: ContractState) -> ContractAddress {
        //     self.create_counter_at(self.init_value.read())
        // }

        // fn update_init_value(ref self: ContractState, init_value: u128) {
        //     self.init_value.write(init_value);
        // }

        fn update_counter_class_hash(ref self: ContractState, counter_class_hash: ClassHash) {
            self.counter_class_hash.write(counter_class_hash);
        }

        fn set_factory_parameters(ref self: ContractState, factory_parameters: FactoryParameters) {
            self._set_factory_parameters(factory_parameters);
        }

        fn setFactoryParameters(ref self: ContractState, factoryParameters: FactoryParameters) {
            self._set_factory_parameters(factoryParameters);
        }

        fn set_platform_parameters(ref self: ContractState, platform_parameters: PlatfromParameters) {
            self._set_platform_parameters(platform_parameters);
        }

        fn setPlatformParameters(ref self: ContractState, platformParameters: PlatfromParameters) {
            self._set_platform_parameters(platformParameters);
        }

        fn factory_parameters(ref self: ContractState) -> FactoryParameters {
            return self._factory_parameters();
        }

        fn factoryParameters(ref self: ContractState) -> FactoryParameters {
            return self._factory_parameters();
        }

        fn platform_parameters(ref self: ContractState) -> PlatfromParameters {
            return self._platform_parameters();
        }

        fn platformParameters(ref self: ContractState) -> PlatfromParameters {
            return self._platform_parameters();
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn _produce(ref self: ContractState, nft_parameters: NftParameters, referralCode: ByteArray) -> ContractAddress {
            assert(nft_parameters.name.is_non_zero(), super::Errors::EMPTY_NAME);
            assert(nft_parameters.symbol.is_non_zero(), super::Errors::EMPTY_SYMBOL);
            //TODO: hash (name, symbol)

            
        }

        fn _set_factory_parameters(ref self: ContractState, factory_parameters: FactoryParameters) {
            assert(factory_parameters.signer_address.is_non_zero(), super::Errors::ZERO_ADDRESS);
            self.factory_parameters.write(factory_parameters);
        }

        fn _set_platform_parameters(ref self: ContractState, platform_parameters: PlatfromParameters) {
            assert(platform_parameters.platform_address.is_non_zero(), super::Errors::ZERO_ADDRESS);
            assert(platform_parameters.platform_commission.is_non_zero(), super::Errors::ZERO_AMOUNT);
            self.platform_parameters.write(platform_parameters);
        }

        fn _factory_parameters(self: @ContractState) -> FactoryParameters {
            return self.factory_parameters.read();
        }

        fn _platform_parameters(self: @ContractState) -> PlatfromParameters {
            return self.platform_parameters.read();
        }
    }
}

// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts for Cairo ^0.15.0

#[starknet::contract]
mod NFT {
    use openzeppelin::{
        access::ownable::OwnableComponent,
        introspection::src5::SRC5Component,
        token::{
            erc721::{
                ERC721Component,
                ERC721HooksEmptyImpl,
            },
            erc2981::ERC2981Component
        }
    };
    use starknet::ContractAddress;
    use ecdsa::check_ecdsa_signature;
    use keccak_u256s_be_inputs::keccak;

    component!(path: ERC721Component, storage: erc721, event: ERC721Event);
    component!(path: SRC5Component, storage: src5, event: SRC5Event);
    component!(path: OwnableComponent, storage: ownable, event: OwnableEvent);
    component!(path: ERC2981Component, storage: erc2981, event: ERC2981Event);

    #[abi(embed_v0)]
    impl ERC721MixinImpl = ERC721Component::ERC721MixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl OwnableMixinImpl = OwnableComponent::OwnableMixinImpl<ContractState>;
    #[abi(embed_v0)]
    impl ERC2981MixinImpl = ERC2981Component::ERC2981MixinImpl<ContractState>;

    impl ERC721InternalImpl = ERC721Component::InternalImpl<ContractState>;
    impl OwnableInternalImpl = OwnableComponent::InternalImpl<ContractState>;
    impl ERC2981InternalImpl = ERC2981Component::InternalImpl<ContractState>;

    const ETH_ADDRESS: ContractAddress = ContractAddress::new(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc721: ERC721Component::Storage,
        #[substorage(v0)]
        src5: SRC5Component::Storage,
        #[substorage(v0)]
        ownable: OwnableComponent::Storage,
        #[substorage(v0)]
        erc2981: ERC2981Component::Storage,
        
        total_supply: u256, 
        metadata_uri: Dict<u256, ByteArray>, // mapping(uint256 => string)

        nft_parameters: NftParameters,
    }

    #[derive(Copy, Drop)]
    struct InstanceInfo {
        name: ByteArray,                // The name of the collection
        symbol: ByteArray,              // The symbol of the collection
        contract_uri: ByteArray,        // Contract URI of a new collection
        paying_token: ContractAddress,  // Address of ERC20 paying token or ETH-like address (0xEeeee...)
        mint_price: u256,               // Mint price of a token from a new collection
        whitelist_mint_price: u256,     // Mint price for whitelisted users
        transferable: felt252,          // 1 for true, 0 for false (if tokens will be transferable or not)
        max_total_supply: u256,         // The max total supply of a new collection
        fee_numerator: u128,             // Royalty fraction for platform + creator
        fee_receiver: ContractAddress,  // The royalties receiver address
        collection_expires: u256,       // Collection expiration period (timestamp)
        signature: Span<felt252>,       // BE's signature
    }

    #[derive(Copy, Drop)]
    struct NftParameters {
        storage_contract: ContractAddress,  // Address of the storage contract
        info: InstanceInfo,                 // The instance info struct
        creator: ContractAddress,           // Creator's address
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC721Event: ERC721Component::Event,
        #[flat]
        SRC5Event: SRC5Component::Event,
        #[flat]
        OwnableEvent: OwnableComponent::Event,
        #[flat]
        ERC2981Event: ERC2981Component::Event,

        PayingTokenChanged {
            paying_token: ContractAddress,
            mint_price: u256,
            whitelist_mint_price: u256,
        },
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, nft_parameters: NftParameters) {
        zero_address_check(nft_parameters.info.paying_token);
        zero_address_check(nft_parameters.info.fee_receiver);
        zero_address_check(nft_parameters.storage_contract);
        zero_address_check(nft_parameters.creator);

        self.total_supply = u256::zero();
        self.nft_parameters = nft_parameters;

        self.erc721.initializer(nft_parameters.info.name, nft_parameters.info.symbol, nft_parameters.info.contract_uri);
        self.ownable.initializer(nft_parameters.creator);
        self.erc2981.initializer(nft_parameters.info.fee_receiver, nft_parameters.info.fee_numerator); // 10000 = 100% royalties
    }

    #[generate_trait]
    #[abi(per_item)]
    impl ExternalImpl of ExternalTrait {
        #[external(v0)]
        fn safe_mint(
            ref self: ContractState,
            recipient: ContractAddress,
            token_uri: ByteArray,
            whitelisted: felt252, // 1 = true, 0 - false,
            signature_r: felt252, 
            signature_s: felt252,
            data: Span<felt252>,
        ) {
            self.ownable.assert_only_owner();
            // Zero address check
            zero_address_check(recipient);

            let token_id = self.total_supply;
            let parameters = self.nft_parameters;

            // Signature verification
            let receiver_u256 = convert_address_to_u256(recipient);
            let whitelisted_u256 = convert_bool_to_u256(whitelisted);
            let token_uri_u256 = convert_bytearray_to_u256(token_uri);

            let mut inputs = Array::<u256>::new();
            inputs.append(receiver_u256);
            inputs.append(token_id);
            inputs.append(token_uri_u256);
            inputs.append(whitelisted_u256);
            inputs.append(block_chainid());

            let message = keccak_u256s_be_inputs(inputs.span());
            let expected_signer = self.storage_contract.factory().signer();

            if !check_ecdsa_signature(message, expected_signer, signature_r, signature_s) {
                panic!("InvalidSignature");
            }

            if (token_id + u256::from(1) > parameters.info.max_total_supply) {
                panic!("TotalSupplyLimitReached");
            }

            let price = if whitelisted == felt252::one() {
                parameters.info.whitelist_mint_price
            } else {
                parameters.info.mint_price
            };

            let isEth = parameters.paying_token == ETH_ADDRESS;

            let amount = if isEth {
                if msg_value() != price {
                    panic!("NotEnoughETHSent");
                }
            } else {
                price
            };

            let comission = self.storage_contract.factory().platform_comission();
            let fee = amount * comission / self.fee_denominator();
            let amount_to_creator = amount - fee;

            let plaform = self.storage_contract.factory().platform_address();

            if isEth {
                if fee > u256::zero() {
                    plaform.safe_transfer_eth(fee);
                }

                parameters.creator.safe_transfer_eth(amount_to_creator);
            } else {
                if fee > u256::zero() {
                    parameters.info.paying_token.safe_transfer_from(msg_sender(), platform_address, fee);
                }

                parameters.info.paying_token.safe_transfer_from(msg_sender(), platform_address, amount_to_creator);
            }

            // Increment the total supply
            self.total_supply = self.total_supply + u256::from(1);

            // Mint the token
            self.erc721.safe_mint(recipient, token_id, data);

            // Set the metadata URI for this token ID
            self.metadata_uri.write(token_id, metadata_uri);
        }

        #[external(v0)]
        fn safeMint(
            ref self: ContractState,
            recipient: ContractAddress,
            tokenId: u256,
            data: Span<felt252>,
            metadata_uri: ByteArray
        ) {
            self.safe_mint(recipient, tokenId, data, metadata_uri);
        }

        // Function to set royalties for a specific token
        #[external(v0)]
        fn set_token_royalty(
            ref self: ContractState,
            token_id: u256,
            recipient: ContractAddress,
            percentage: u64, // e.g., 500 for 5%
        ) {
            self.erc2981.set_token_royalty(token_id, recipient, percentage);
        }

        // Sets paying token
        #[external(v0)]
        fn set_paying_token(
            ref self: ContractState,
            paying_token: ContractAddress,
            mint_price: u256,
            whitelist_mint_price: u256
        ) {
            self.nft_parameters.info.paying_token = paying_token;
            self.nft_parameters.info.mint_price = mint_price;
            self.nft_parameters.info.whitelist_mint_price = whitelist_mint_price;

            emit!(
                PayingTokenChanged {
                    paying_token: paying_token,
                    mint_price: mint_price,
                    whitelist_mint_price: whitelist_mint_price,
                },
            );
        }

        // Function to retrieve royalty info
        #[external(v0)]
        fn royalty_info(
            ref self: ContractState,
            token_id: u256,
            sale_price: u256,
        ) -> (ContractAddress, u256) {
            self.erc2981.royalty_info(token_id, sale_price)
        }

        // Function to retrieve metadata URI for a token
        #[external(v0)]
        fn token_uri(ref self: ContractState, token_id: u256) -> ByteArray {
            self._require_owned(token_id);
            self.metadata_uri.read(token_id)
        }

        // Function to get the total supply
        #[external(v0)]
        fn get_total_supply(ref self: ContractState) -> u256 {
            self.total_supply
        }
    }

    impl ERC721InternalImpl of ERC721Component::InternalImpl<ContractState> {
        fn _update(
            ref self: ContractState,
            to: ContractAddress,
            token_id: u256,
            auth: ContractAddress
        ) -> ContractAddress {
            // Call the parent ERC721 _update function
            let from = super::_update(to, token_id, auth);

            // Check if this is not a mint or burn (i.e., from and to are both non-zero addresses)
            if from != ContractAddress::default() && to != ContractAddress::default() {
                // Check if tokens are transferable (1 means transferable, 0 means non-transferable)
                if self.nft_parameters.info.transferable == felt252::zero() {
                    // If not transferable, revert the transaction with an error
                    panic!("NotTransferable");
                }
            }

            // Return the `from` address after the update
            return from;
        }
    }

    // Zero address check function
    fn zero_address_check(address: ContractAddress) {
        if address == ContractAddress::default() {
            panic!("ZeroAddressPasted");
        }
    }

    fn convert_address_to_u256(address: ContractAddress) -> u256 {
        // Convert the ContractAddress to a u256 value.
        // In this case, treat the address as a felt252, and convert it into a u256.
        u256 { low: address.to_felt(), high: 0 }
    }   

    fn convert_bool_to_u256(value: felt252) -> u256 {
        // Convert a boolean-like value (1 for true, 0 for false) to u256.
        u256 { low: value, high: 0 }
    }

    fn convert_bytearray_to_u256(bytearray: ByteArray) -> u256 {
        let mut res_low: u128 = 0;
        let mut res_high: u128 = 0;

        for(i, byte) in bytearray.into_iter().enumerate() {
            if i < 16 {
                res_low = res_low | ((byte as u128) << (i * 8));
            } else {
                res_high = res_high | ((byte as u128) << ((i - 16) * 8);
            }
        }

        u256 { low: res_low, high: res_high }
    }
}

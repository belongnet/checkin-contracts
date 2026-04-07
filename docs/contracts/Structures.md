# Core Cairo Structures

This page summarizes the main Cairo structs used by the active contracts in this repository.

## `FactoryParameters`

Defined in `src/nftfactory/interface.cairo`.

```cairo
pub struct FactoryParameters {
    pub signer: ContractAddress,
    pub default_payment_currency: ContractAddress,
    pub platform_address: ContractAddress,
    pub platform_commission: u256,
    pub max_array_size: u256,
}
```

Global settings stored by `NFTFactory`.

## `InstanceInfo`

Defined in `src/nftfactory/interface.cairo`.

```cairo
pub struct InstanceInfo {
    pub creator_address: ContractAddress,
    pub name: ByteArray,
    pub symbol: ByteArray,
    pub contract_uri: ByteArray,
    pub payment_token: ContractAddress,
    pub royalty_fraction: u128,
    pub transferrable: bool,
    pub max_total_supply: u256,
    pub mint_price: u256,
    pub whitelisted_mint_price: u256,
    pub referral_code: felt252,
}
```

Payload used by `NFTFactory.produce(...)` to deploy a collection.

## `NftInfo`

Defined in `src/nftfactory/interface.cairo`.

```cairo
pub struct NftInfo {
    pub name: ByteArray,
    pub symbol: ByteArray,
    pub creator: ContractAddress,
    pub nft_address: ContractAddress,
    pub receiver_address: ContractAddress,
}
```

Stored collection registry entry keyed by the hash of `(name, symbol)`.

## `NftParameters`

Defined in `src/nft/interface.cairo`.

```cairo
pub struct NftParameters {
    pub payment_token: ContractAddress,
    pub contract_uri: felt252,
    pub mint_price: u256,
    pub whitelisted_mint_price: u256,
    pub max_total_supply: u256,
    pub transferrable: bool,
    pub referral_code: felt252,
}
```

Configuration written once during `NFT.initialize(...)`.

## `StaticPriceParameters`

Defined in `src/nft/interface.cairo`.

```cairo
pub struct StaticPriceParameters {
    pub receiver: ContractAddress,
    pub token_id: u256,
    pub whitelisted: bool,
    pub token_uri: ByteArray,
}
```

One mint item for `mintStaticPrice(...)`.

## `DynamicPriceParameters`

Defined in `src/nft/interface.cairo`.

```cairo
pub struct DynamicPriceParameters {
    pub receiver: ContractAddress,
    pub token_id: u256,
    pub price: u256,
    pub token_uri: ByteArray,
}
```

One mint item for `mintDynamicPrice(...)`.

## `SignatureProtection`

Defined in `src/snip12/interfaces.cairo`.

```cairo
pub struct SignatureProtection {
    pub nonce: u128,
    pub deadline: u128,
    pub signature: Array<felt252>,
}
```

Common wrapper used by the signed minting and collection deployment flows.

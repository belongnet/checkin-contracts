# Solidity API

## InvalidSignature

```solidity
error InvalidSignature()
```

Error thrown when the signature provided is invalid.

## AddressHelper

Provides helper functions to validate signatures for dynamic and static price parameters in NFT minting.

_This library relies on SignatureCheckerLib to verify the validity of a signature for provided parameters._

### checkDynamicPriceParameters

```solidity
function checkDynamicPriceParameters(address signer, address receiver, struct DynamicPriceParameters params) internal view
```

Verifies the validity of a signature for dynamic price minting parameters.

_Encodes and hashes the dynamic price parameters with the `receiver`, then verifies the signature._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | The address expected to have signed the provided parameters. |
| receiver | address | Address that will receive the minted token(s). |
| params | struct DynamicPriceParameters | Dynamic price parameters (tokenId, tokenUri, price, signature). |

### checkStaticPriceParameters

```solidity
function checkStaticPriceParameters(address signer, address receiver, struct StaticPriceParameters params) internal view
```

Verifies the validity of a signature for static price minting parameters.

_Encodes and hashes the static price parameters with the `receiver`, then verifies the signature._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| signer | address | The address expected to have signed the provided parameters. |
| receiver | address | Address that will receive the minted token(s). |
| params | struct StaticPriceParameters | Static price parameters (tokenId, tokenUri, whitelisted, signature). |


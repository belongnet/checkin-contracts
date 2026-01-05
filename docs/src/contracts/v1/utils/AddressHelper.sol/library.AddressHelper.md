# AddressHelper
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/utils/AddressHelper.sol)

**Title:**
AddressHelper Library

Provides helper functions to validate signatures for dynamic and static price parameters in NFT minting.

This library relies on SignatureCheckerLib to verify the validity of a signature for provided parameters.


## Functions
### checkDynamicPriceParameters

Verifies the validity of a signature for dynamic price minting parameters.

Encodes and hashes the dynamic price parameters with the `receiver`, then verifies the signature.

**Note:**
error: InvalidSignature Thrown when the signature does not match the expected signer or encoded data.


```solidity
function checkDynamicPriceParameters(address signer, address receiver, DynamicPriceParameters calldata params)
    internal
    view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`signer`|`address`|The address expected to have signed the provided parameters.|
|`receiver`|`address`|Address that will receive the minted token(s).|
|`params`|`DynamicPriceParameters`|Dynamic price parameters (tokenId, tokenUri, price, signature).|


### checkStaticPriceParameters

Verifies the validity of a signature for static price minting parameters.

Encodes and hashes the static price parameters with the `receiver`, then verifies the signature.

**Note:**
error: InvalidSignature Thrown when the signature does not match the expected signer or encoded data.


```solidity
function checkStaticPriceParameters(address signer, address receiver, StaticPriceParameters calldata params)
    internal
    view;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`signer`|`address`|The address expected to have signed the provided parameters.|
|`receiver`|`address`|Address that will receive the minted token(s).|
|`params`|`StaticPriceParameters`|Static price parameters (tokenId, tokenUri, whitelisted, signature).|



# Permit2Lib
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/lib/permit2/src/libraries/Permit2Lib.sol)

**Title:**
Permit2Lib

Enables efficient transfers and EIP-2612/DAI
permits for any token by falling back to Permit2.


## State Variables
### DAI_DOMAIN_SEPARATOR
The unique EIP-712 domain domain separator for the DAI token contract.


```solidity
bytes32 internal constant DAI_DOMAIN_SEPARATOR = 0xdbb8cf42e1ecb028be3f3dbc922e1d878b963f411dc388ced501601c60f7c6f7
```


### WETH9_ADDRESS
The address for the WETH9 contract on Ethereum mainnet, encoded as a bytes32.


```solidity
bytes32 internal constant WETH9_ADDRESS = 0x000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
```


### PERMIT2
The address of the Permit2 contract the library will use.


```solidity
IAllowanceTransfer internal constant PERMIT2 =
    IAllowanceTransfer(address(0x000000000022D473030F116dDEE9F6B43aC78BA3))
```


## Functions
### transferFrom2

Transfer a given amount of tokens from one user to another.


```solidity
function transferFrom2(ERC20 token, address from, address to, uint256 amount) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`ERC20`|The token to transfer.|
|`from`|`address`|The user to transfer from.|
|`to`|`address`|The user to transfer to.|
|`amount`|`uint256`|The amount to transfer.|


### permit2

Permit a user to spend a given amount of
another user's tokens via native EIP-2612 permit if possible, falling
back to Permit2 if native permit fails or is not implemented on the token.


```solidity
function permit2(
    ERC20 token,
    address owner,
    address spender,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`ERC20`|The token to permit spending.|
|`owner`|`address`|The user to permit spending from.|
|`spender`|`address`|The user to permit spending to.|
|`amount`|`uint256`|The amount to permit spending.|
|`deadline`|`uint256`| The timestamp after which the signature is no longer valid.|
|`v`|`uint8`|Must produce valid secp256k1 signature from the owner along with r and s.|
|`r`|`bytes32`|Must produce valid secp256k1 signature from the owner along with v and s.|
|`s`|`bytes32`|Must produce valid secp256k1 signature from the owner along with r and v.|


### simplePermit2

Simple unlimited permit on the Permit2 contract.


```solidity
function simplePermit2(
    ERC20 token,
    address owner,
    address spender,
    uint256 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`ERC20`|The token to permit spending.|
|`owner`|`address`|The user to permit spending from.|
|`spender`|`address`|The user to permit spending to.|
|`amount`|`uint256`|The amount to permit spending.|
|`deadline`|`uint256`| The timestamp after which the signature is no longer valid.|
|`v`|`uint8`|Must produce valid secp256k1 signature from the owner along with r and s.|
|`r`|`bytes32`|Must produce valid secp256k1 signature from the owner along with v and s.|
|`s`|`bytes32`|Must produce valid secp256k1 signature from the owner along with r and v.|



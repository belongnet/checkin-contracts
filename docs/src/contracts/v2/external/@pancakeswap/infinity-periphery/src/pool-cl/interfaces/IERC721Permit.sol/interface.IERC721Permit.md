# IERC721Permit
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/interfaces/IERC721Permit.sol)

**Title:**
ERC721 with permit

Extension to ERC721 that includes a permit function for signature based approvals


## Functions
### permit

Approve of a specific token ID for spending by spender via signature

payable so it can be multicalled with NATIVE related actions


```solidity
function permit(address spender, uint256 tokenId, uint256 deadline, uint256 nonce, bytes calldata signature)
    external
    payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`spender`|`address`|The account that is being approved|
|`tokenId`|`uint256`|The ID of the token that is being approved for spending|
|`deadline`|`uint256`|The deadline timestamp by which the call must be mined for the approve to work|
|`nonce`|`uint256`|a unique value, for an owner, to prevent replay attacks; an unordered nonce where the top 248 bits correspond to a word and the bottom 8 bits calculate the bit position of the word|
|`signature`|`bytes`|Concatenated data from a valid secp256k1 signature from the holder, i.e. abi.encodePacked(r, s, v)|


### permitForAll

Set an operator with full permission to an owner's tokens via signature

payable so it can be multicalled with NATIVE related actions


```solidity
function permitForAll(
    address owner,
    address operator,
    bool approved,
    uint256 deadline,
    uint256 nonce,
    bytes calldata signature
) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`owner`|`address`|The address that is setting the operator|
|`operator`|`address`|The address that will be set as an operator for the owner|
|`approved`|`bool`|The permission to set on the operator|
|`deadline`|`uint256`|The deadline timestamp by which the call must be mined for the approve to work|
|`nonce`|`uint256`|a unique value, for an owner, to prevent replay attacks; an unordered nonce where the top 248 bits correspond to a word and the bottom 8 bits calculate the bit position of the word|
|`signature`|`bytes`|Concatenated data from a valid secp256k1 signature from the holder, i.e. abi.encodePacked(r, s, v)|


## Errors
### SignatureDeadlineExpired

```solidity
error SignatureDeadlineExpired();
```

### NoSelfPermit

```solidity
error NoSelfPermit();
```

### Unauthorized

```solidity
error Unauthorized();
```


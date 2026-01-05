# IERC20PermitAllowed
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/external/IERC20PermitAllowed.sol)

**Title:**
IERC20PermitAllowed

Interface used by DAI/CHAI for permit


## Functions
### permit

Approve the spender to spend some tokens via the holder signature

This is the permit interface used by DAI and CHAI


```solidity
function permit(
    address holder,
    address spender,
    uint256 nonce,
    uint256 expiry,
    bool allowed,
    uint8 v,
    bytes32 r,
    bytes32 s
) external;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`holder`|`address`|The address of the token holder, the token owner|
|`spender`|`address`|The address of the token spender|
|`nonce`|`uint256`|The holder's nonce, increases at each call to permit|
|`expiry`|`uint256`|The timestamp at which the permit is no longer valid|
|`allowed`|`bool`|Boolean that sets approval amount, true for type(uint256).max and false for 0|
|`v`|`uint8`|Must produce valid secp256k1 signature from the holder along with `r` and `s`|
|`r`|`bytes32`|Must produce valid secp256k1 signature from the holder along with `v` and `s`|
|`s`|`bytes32`|Must produce valid secp256k1 signature from the holder along with `r` and `v`|



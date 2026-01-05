# ISelfPermitERC721
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/ISelfPermitERC721.sol)

**Title:**
ISelfPermitERC721

Functionality to call permit on any EIP-2612-compliant token
This is for PancakeSwapV3 styled Nonfungible Position Manager which supports permit extension


## Functions
### selfPermitERC721

Permits this contract to spend a given position token from `msg.sender`

The `owner` is always msg.sender and the `spender` is always address(this).


```solidity
function selfPermitERC721(address token, uint256 tokenId, uint256 deadline, uint8 v, bytes32 r, bytes32 s)
    external
    payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The address of the token spent|
|`tokenId`|`uint256`|The token ID of the token spent|
|`deadline`|`uint256`|A timestamp, the current blocktime must be less than or equal to this timestamp|
|`v`|`uint8`|Must produce valid secp256k1 signature from the holder along with `r` and `s`|
|`r`|`bytes32`|Must produce valid secp256k1 signature from the holder along with `v` and `s`|
|`s`|`bytes32`|Must produce valid secp256k1 signature from the holder along with `r` and `v`|


### selfPermitERC721IfNecessary

Permits this contract to spend a given token from `msg.sender`

The `owner` is always msg.sender and the `spender` is always address(this).
Please always use selfPermitERC721IfNecessary if possible prevent calls from failing due to a frontrun of a call to #selfPermitERC721.
For details check https://github.com/pancakeswap/infinity-periphery/pull/62#discussion_r1675410282


```solidity
function selfPermitERC721IfNecessary(
    address token,
    uint256 tokenId,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|The address of the token spent|
|`tokenId`|`uint256`|The token ID of the token spent|
|`deadline`|`uint256`|A timestamp, the current blocktime must be less than or equal to this timestamp|
|`v`|`uint8`|Must produce valid secp256k1 signature from the holder along with `r` and `s`|
|`r`|`bytes32`|Must produce valid secp256k1 signature from the holder along with `v` and `s`|
|`s`|`bytes32`|Must produce valid secp256k1 signature from the holder along with `r` and `v`|



# SafeCast160
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/lib/permit2/src/libraries/SafeCast160.sol)


## Functions
### toUint160

Safely casts uint256 to uint160


```solidity
function toUint160(uint256 value) internal pure returns (uint160);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`value`|`uint256`|The uint256 to be cast|


## Errors
### UnsafeCast
Thrown when a valude greater than type(uint160).max is cast to uint160


```solidity
error UnsafeCast();
```


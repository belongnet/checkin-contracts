# IMulticall
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IMulticall.sol)

**Title:**
Multicall interface

Enables calling multiple methods in a single call to the contract


## Functions
### multicall

Call multiple functions in the current contract and return the data from all of them if they all succeed

The `msg.value` is passed onto all subcalls, even if a previous subcall has consumed the ether.
Subcalls can instead use `address(this).value` to see the available ETH, and consume it using {value: x}.


```solidity
function multicall(bytes[] calldata data) external payable returns (bytes[] memory results);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`data`|`bytes[]`|The encoded function data for each of the calls to make to this contract|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`results`|`bytes[]`|The results from each of the calls passed in via data|



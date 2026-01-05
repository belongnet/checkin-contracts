# ParseBytes
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-core/src/libraries/ParseBytes.sol)

Parses bytes returned from hooks and the byte selector used to check return selectors from hooks.

parseSelector also is used to parse the expected selector
For parsing hook returns, note that all hooks return either bytes4 or (bytes4, 32-byte-delta) or (bytes4, 32-byte-delta, uint24).


## Functions
### parseSelector


```solidity
function parseSelector(bytes memory result) internal pure returns (bytes4 selector);
```

### parseFee


```solidity
function parseFee(bytes memory result) internal pure returns (uint24 lpFee);
```

### parseReturnDelta


```solidity
function parseReturnDelta(bytes memory result) internal pure returns (int256 hookReturn);
```


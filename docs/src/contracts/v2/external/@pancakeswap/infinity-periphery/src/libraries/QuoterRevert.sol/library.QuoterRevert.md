# QuoterRevert
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/libraries/QuoterRevert.sol)


## Functions
### revertQuote

reverts, where the revert data is the provided bytes

called when quoting, to record the quote amount in an error

QuoteSwap is used to differentiate this error from other errors thrown when simulating the swap


```solidity
function revertQuote(uint256 quoteAmount) internal pure;
```

### bubbleReason

reverts using the revertData as the reason

to bubble up both the valid QuoteSwap(amount) error, or an alternative error thrown during simulation


```solidity
function bubbleReason(bytes memory revertData) internal pure;
```

### parseQuoteAmount

validates whether a revert reason is a valid swap quote or not
if valid, it decodes the quote to return. Otherwise it reverts.


```solidity
function parseQuoteAmount(bytes memory reason) internal pure returns (uint256 quoteAmount);
```

## Errors
### UnexpectedRevertBytes
error thrown when invalid revert bytes are thrown by the quote


```solidity
error UnexpectedRevertBytes(bytes revertData);
```

### QuoteSwap
error thrown containing the quote as the data, to be caught and parsed later


```solidity
error QuoteSwap(uint256 amount);
```


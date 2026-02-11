# IBaseMigrator
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IBaseMigrator.sol)

**Inherits:**
[IMulticall](/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/IMulticall.sol/interface.IMulticall.md), [ISelfPermitERC721](/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/ISelfPermitERC721.sol/interface.ISelfPermitERC721.md)

**Title:**
IBaseMigrator

Interface for the BaseMigrator contract


## Functions
### refundETH

refund native ETH to caller
This is useful when the caller sends more ETH then he specifies in arguments


```solidity
function refundETH() external payable;
```

## Events
### ExtraFundsAdded
The event emitted when extra funds are added to the migrator


```solidity
event ExtraFundsAdded(address currency0, address currency1, uint256 extraAmount0, uint256 extraAmount1);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currency0`|`address`|the address of the token0|
|`currency1`|`address`|the address of the token1|
|`extraAmount0`|`uint256`|the amount of extra token0|
|`extraAmount1`|`uint256`|the amount of extra token1|

## Errors
### TOKEN_NOT_MATCH

```solidity
error TOKEN_NOT_MATCH();
```

### INVALID_ETHER_SENDER

```solidity
error INVALID_ETHER_SENDER();
```

### INSUFFICIENT_AMOUNTS_RECEIVED

```solidity
error INSUFFICIENT_AMOUNTS_RECEIVED();
```

### NOT_TOKEN_OWNER

```solidity
error NOT_TOKEN_OWNER();
```

## Structs
### V2PoolParams
Parameters for removing liquidity from v2


```solidity
struct V2PoolParams {
    // the PancakeSwap v2-compatible pair
    address pair;
    // the amount of v2 lp token to be withdrawn
    uint256 migrateAmount;
    // the amount of token0 and token1 to be received after burning must be no less than these
    uint256 amount0Min;
    uint256 amount1Min;
}
```

### V3PoolParams
Parameters for removing liquidity from v3


```solidity
struct V3PoolParams {
    // the PancakeSwap v3-compatible NFP
    address nfp;
    uint256 tokenId;
    uint128 liquidity;
    uint256 amount0Min;
    uint256 amount1Min;
    // decide whether to collect fee
    bool collectFee;
    uint256 deadline;
}
```


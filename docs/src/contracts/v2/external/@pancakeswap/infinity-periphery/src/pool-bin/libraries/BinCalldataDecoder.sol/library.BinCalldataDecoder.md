# BinCalldataDecoder
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-bin/libraries/BinCalldataDecoder.sol)

**Title:**
Library for abi decoding in bin pool calldata


## State Variables
### SLICE_ERROR_SELECTOR
equivalent to SliceOutOfBounds.selector, stored in least-significant bits


```solidity
uint256 constant SLICE_ERROR_SELECTOR = 0x3b99b53d
```


## Functions
### decodeBinAddLiquidityParams

todo: <wip> see if tweaking to calldataload saves gas

equivalent to: abi.decode(params, (IBinPositionManager.BinAddLiquidityParams))


```solidity
function decodeBinAddLiquidityParams(bytes calldata params)
    internal
    pure
    returns (IBinPositionManager.BinAddLiquidityParams calldata addLiquidityParams);
```

### decodeBinRemoveLiquidityParams

todo: <wip> see if tweaking to calldataload saves gas

equivalent to: abi.decode(params, (IBinPositionManager.BinRemoveLiquidityParams))


```solidity
function decodeBinRemoveLiquidityParams(bytes calldata params)
    internal
    pure
    returns (IBinPositionManager.BinRemoveLiquidityParams calldata removeLiquidityParams);
```

### decodeBinAddLiquidityFromDeltasParams

equivalent to: abi.decode(params, (IBinPositionManager.BinAddLiquidityFromDeltasParams))


```solidity
function decodeBinAddLiquidityFromDeltasParams(bytes calldata params)
    internal
    pure
    returns (IBinPositionManager.BinAddLiquidityFromDeltasParams calldata addLiquidityParams);
```

### decodeBinSwapExactInParams

equivalent to: abi.decode(params, (IInfinityRouter.BinExactInputParams))


```solidity
function decodeBinSwapExactInParams(bytes calldata params)
    internal
    pure
    returns (IInfinityRouter.BinSwapExactInputParams calldata swapParams);
```

### decodeBinSwapExactInSingleParams

equivalent to: abi.decode(params, (IInfinityRouter.BinExactInputSingleParams))


```solidity
function decodeBinSwapExactInSingleParams(bytes calldata params)
    internal
    pure
    returns (IInfinityRouter.BinSwapExactInputSingleParams calldata swapParams);
```

### decodeBinSwapExactOutParams

equivalent to: abi.decode(params, (IInfinityRouter.BinExactOutputParams))


```solidity
function decodeBinSwapExactOutParams(bytes calldata params)
    internal
    pure
    returns (IInfinityRouter.BinSwapExactOutputParams calldata swapParams);
```

### decodeBinSwapExactOutSingleParams

equivalent to: abi.decode(params, (IInfinityRouter.BinExactOutputSingleParams))


```solidity
function decodeBinSwapExactOutSingleParams(bytes calldata params)
    internal
    pure
    returns (IInfinityRouter.BinSwapExactOutputSingleParams calldata swapParams);
```


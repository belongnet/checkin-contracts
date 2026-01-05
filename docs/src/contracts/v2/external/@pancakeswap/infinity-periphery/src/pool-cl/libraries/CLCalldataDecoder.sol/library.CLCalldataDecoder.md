# CLCalldataDecoder
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/pool-cl/libraries/CLCalldataDecoder.sol)

**Title:**
Library for abi decoding in cl pool calldata


## State Variables
### SLICE_ERROR_SELECTOR
equivalent to SliceOutOfBounds.selector, stored in least-significant bits


```solidity
uint256 constant SLICE_ERROR_SELECTOR = 0x3b99b53d
```


## Functions
### decodeCLSwapExactInParams

equivalent to: abi.decode(params, (IInfinityRouter.CLExactInputParams))


```solidity
function decodeCLSwapExactInParams(bytes calldata params)
    internal
    pure
    returns (IInfinityRouter.CLSwapExactInputParams calldata swapParams);
```

### decodeCLSwapExactInSingleParams

equivalent to: abi.decode(params, (IInfinityRouter.CLExactInputSingleParams))


```solidity
function decodeCLSwapExactInSingleParams(bytes calldata params)
    internal
    pure
    returns (IInfinityRouter.CLSwapExactInputSingleParams calldata swapParams);
```

### decodeCLSwapExactOutParams

equivalent to: abi.decode(params, (IInfinityRouter.CLExactOutputParams))


```solidity
function decodeCLSwapExactOutParams(bytes calldata params)
    internal
    pure
    returns (IInfinityRouter.CLSwapExactOutputParams calldata swapParams);
```

### decodeCLSwapExactOutSingleParams

equivalent to: abi.decode(params, (IInfinityRouter.CLExactOutputSingleParams))


```solidity
function decodeCLSwapExactOutSingleParams(bytes calldata params)
    internal
    pure
    returns (IInfinityRouter.CLSwapExactOutputSingleParams calldata swapParams);
```

### decodeCLModifyLiquidityParams

equivalent to: abi.decode(params, (uint256, uint256, uint128, uint128, bytes)) in calldata


```solidity
function decodeCLModifyLiquidityParams(bytes calldata params)
    internal
    pure
    returns (uint256 tokenId, uint256 liquidity, uint128 amount0, uint128 amount1, bytes calldata hookData);
```

### decodeCLIncreaseLiquidityFromDeltasParams

equivalent to: abi.decode(params, (uint256, uint128, uint128, bytes)) in calldata


```solidity
function decodeCLIncreaseLiquidityFromDeltasParams(bytes calldata params)
    internal
    pure
    returns (uint256 tokenId, uint128 amount0Max, uint128 amount1Max, bytes calldata hookData);
```

### decodeCLMintParams

equivalent to: abi.decode(params, (PoolKey, int24, int24, uint256, uint128, uint128, address, bytes)) in calldata


```solidity
function decodeCLMintParams(bytes calldata params)
    internal
    pure
    returns (
        PoolKey calldata poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint256 liquidity,
        uint128 amount0Max,
        uint128 amount1Max,
        address owner,
        bytes calldata hookData
    );
```

### decodeCLMintFromDeltasParams

equivalent to: abi.decode(params, (PoolKey, int24, int24, uint128, uint128, address, bytes)) in calldata


```solidity
function decodeCLMintFromDeltasParams(bytes calldata params)
    internal
    pure
    returns (
        PoolKey calldata poolKey,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount0Max,
        uint128 amount1Max,
        address owner,
        bytes calldata hookData
    );
```

### decodeCLBurnParams

equivalent to: abi.decode(params, (uint256, uint128, uint128, bytes)) in calldata


```solidity
function decodeCLBurnParams(bytes calldata params)
    internal
    pure
    returns (uint256 tokenId, uint128 amount0Min, uint128 amount1Min, bytes calldata hookData);
```


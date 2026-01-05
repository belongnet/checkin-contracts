# IStableSwapFactory
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/external/IStableSwapFactory.sol)

**Title:**
IStableSwapFactory

Interface for the StableSwapFactory contract


## Functions
### pairLength


```solidity
function pairLength() external view returns (uint256);
```

### getPairInfo


```solidity
function getPairInfo(address _tokenA, address _tokenB) external view returns (StableSwapPairInfo memory info);
```

### getThreePoolPairInfo


```solidity
function getThreePoolPairInfo(address _tokenA, address _tokenB)
    external
    view
    returns (StableSwapThreePoolPairInfo memory info);
```

### createSwapPair


```solidity
function createSwapPair(address _tokenA, address _tokenB, uint256 _A, uint256 _fee, uint256 _admin_fee) external;
```

## Structs
### StableSwapPairInfo

```solidity
struct StableSwapPairInfo {
    address swapContract;
    address token0;
    address token1;
    address LPContract;
}
```

### StableSwapThreePoolPairInfo

```solidity
struct StableSwapThreePoolPairInfo {
    address swapContract;
    address token0;
    address token1;
    address token2;
    address LPContract;
}
```


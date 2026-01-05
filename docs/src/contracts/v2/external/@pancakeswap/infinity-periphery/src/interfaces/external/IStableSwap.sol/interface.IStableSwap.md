# IStableSwap
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/external/@pancakeswap/infinity-periphery/src/interfaces/external/IStableSwap.sol)

**Title:**
IStableSwap

Interface for the StableSwap contract


## Functions
### get_dy


```solidity
function get_dy(uint256 i, uint256 j, uint256 dx) external view returns (uint256 dy);
```

### exchange


```solidity
function exchange(uint256 i, uint256 j, uint256 dx, uint256 minDy) external payable;
```

### coins


```solidity
function coins(uint256 i) external view returns (address);
```

### balances


```solidity
function balances(uint256 i) external view returns (uint256);
```

### A


```solidity
function A() external view returns (uint256);
```

### fee


```solidity
function fee() external view returns (uint256);
```

### add_liquidity


```solidity
function add_liquidity(uint256[2] calldata amounts, uint256 min_mint_amount) external;
```


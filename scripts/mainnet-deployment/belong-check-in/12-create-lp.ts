// scripts/create_pool_and_init.ts
// Purpose: Create a NEW Uniswap V3 pool for USDC/LONG with the CORRECT sqrtPriceX96
// and (optionally) seed minimal liquidity later in a separate step.
// Usage example (Arbitrum-style NPM shown; set for your chain):
//   UNISWAPV3_NPM_ADDRESS=0x1238536071E1c677A632429e3655c799b22cDA52 \
//   UNISWAPV3_FACTORY_ADDRESS=0x1F98431c8aD98523631AE4a59f267346ea31F984 \
//   FEE=3000 \
//   USDC=0x... LONG=0x... \
//   # Desired human price: 1 LONG = 0.5 USDC  ⇒  LONG per USDC = 2/1
//   PRICE_NUM=2 PRICE_DEN=1 \
//   npx hardhat run scripts/create_pool_and_init.ts --network <net>
//
// Notes:
// - This script computes sqrtPriceX96 generically from a rational PRICE_NUM/PRICE_DEN = (token1 per token0)
//   AFTER it determines the actual token0/token1 order by the pool (lexicographic).
// - For your case (token0=USDC(6), token1=LONG(18), 1 LONG = 0.5 USDC) use PRICE_NUM=2, PRICE_DEN=1.
// - If the order comes out reversed (token0=LONG, token1=USDC), the script automatically inverts the ratio.

import { ethers } from 'hardhat';
import type { Contract } from 'ethers';

const IF_FACTORY = ['function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address)'];

const IF_POOL = [
  'function slot0() external view returns (uint160 sqrtPriceX96,int24 tick,uint16,uint16,uint16,uint8,bool)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

const IF_ERC20 = [
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

const IF_NPM = [
  'function createAndInitializePoolIfNecessary(address token0,address token1,uint24 fee,uint160 sqrtPriceX96) external payable returns (address pool)',
];

function toChecksum(a: string) {
  return ethers.utils.getAddress(a);
}

// Integer sqrt for BigInt (Newton's method)
function sqrtBig(x: bigint): bigint {
  if (x < 2n) return x;
  // Initial approximation: 2^(bitlen/2)
  let z = 1n << BigInt((x.toString(2).length + 1) >> 1);
  let y = (z + x / z) >> 1n;
  while (y < z) {
    z = y;
    y = (z + x / z) >> 1n;
  }
  return z;
}

async function main() {
  const [signer] = await ethers.getSigners();

  const NPM_ADDR = toChecksum(process.env.UNISWAPV3_NPM_ADDRESS!);
  const FACTORY_ADDR = toChecksum(process.env.UNISWAPV3_FACTORY_ADDRESS!);
  const FEE = Number(process.env.FEE ?? '500');

  // Logical tokens (intended assets)
  const USDC = toChecksum(process.env.USDC_ADDRESS!); // 6 decimals
  const LONG = toChecksum(process.env.LONG_ADDRESS!); // 18 decimals

  // Desired human price as a rational: token1 per token0 = PRICE_NUM / PRICE_DEN
  // For token0=USDC, token1=LONG and 1 LONG = 0.5 USDC => LONG per 1 USDC = 2/1
  const PRICE_NUM = BigInt(process.env.PRICE_NUM ?? '2');
  const PRICE_DEN = BigInt(process.env.PRICE_DEN ?? '1');
  if (PRICE_DEN === 0n) throw new Error('PRICE_DEN cannot be zero');

  const factory: Contract = new ethers.Contract(FACTORY_ADDR, IF_FACTORY, signer);
  const npm: Contract = new ethers.Contract(NPM_ADDR, IF_NPM, signer);

  // Determine canonical pool order (lexicographic)
  const [A, B] = USDC.toLowerCase() < LONG.toLowerCase() ? [USDC, LONG] : [LONG, USDC];

  // Grab decimals for both to scale raw amounts correctly
  const ercA: Contract = new ethers.Contract(A, IF_ERC20, signer);
  const ercB: Contract = new ethers.Contract(B, IF_ERC20, signer);
  const [decA, decB] = await Promise.all([ercA.decimals(), ercB.decimals()]);
  const [symA, symB] = await Promise.all([ercA.symbol().catch(() => 'TOKEN0'), ercB.symbol().catch(() => 'TOKEN1')]);

  // Build the price ratio for the ACTUAL order:
  // We want price = token1/token0.
  // If actual order (A=token0, B=token1) = (USDC, LONG), then desired price = LONG/USDC = 2/1.
  // If actual order = (LONG, USDC), then desired price = USDC/LONG = 1/2 (invert).
  let num = PRICE_NUM; // numerator (token1 per token0)
  let den = PRICE_DEN; // denominator

  const orderIsUSDC_LONG = A.toLowerCase() === USDC.toLowerCase() && B.toLowerCase() === LONG.toLowerCase();
  if (!orderIsUSDC_LONG) {
    // Actual order is LONG/USDC -> invert the intended LONG/USDC ratio to get USDC/LONG
    // i.e., token1/token0 = USDC/LONG = 1 / (LONG/USDC)
    const t = num;
    num = den;
    den = t;
  }

  // Encode sqrtPriceX96 using the canonical formula:
  // encodeSqrtRatioX96(amount1, amount0) = floor( sqrt( (amount1 << 192) / amount0 ) )
  // where amount1/amount0 must reflect the desired price with decimals.
  //
  // Construct integer "amounts" that realize the ratio:
  // amount1 = num * 10^decB   (token1 decimals)
  // amount0 = den * 10^decA   (token0 decimals)
  const amount1 = num * 10n ** BigInt(decB);
  const amount0 = den * 10n ** BigInt(decA);

  const ratioX192 = (amount1 << 192n) / amount0; // (amount1 * 2^192) / amount0
  const sqrtPriceX96 = sqrtBig(ratioX192); // uint160 (fits in JS BigInt)

  console.log('=== Price & sqrt ===');
  console.log(`Order (token0/token1): ${A} (${symA}, ${decA}) / ${B} (${symB}, ${decB})`);
  console.log(`Desired token1/token0 = ${num.toString()}/${den.toString()} (human units)`);
  console.log(`sqrtPriceX96 = ${sqrtPriceX96.toString()}`);

  // If a pool already exists for (A,B,FEE), this just returns it and does NOT reinitialize
  const existing: string = await factory.getPool(A, B, FEE);
  if (existing !== ethers.constants.AddressZero) {
    console.log('Pool already exists at:', existing);
  }

  // Create & initialize (idempotent): uses EXACT token0/token1 order (A,B)
  const tx = await npm.createAndInitializePoolIfNecessary(A, B, FEE, sqrtPriceX96);
  const rc = await tx.wait();
  const poolAddr = await factory.getPool(A, B, FEE);

  console.log('=== Result ===');
  console.log('Pool address:', poolAddr);
  console.log('createAndInitialize txHash:', rc.transactionHash);

  // Sanity: read back slot0
  const pool: Contract = new ethers.Contract(poolAddr, IF_POOL, signer);
  const slot0 = await pool.slot0();
  console.log('slot0.sqrtPriceX96:', slot0.sqrtPriceX96.toString());
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

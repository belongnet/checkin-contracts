// scripts/add_liquidity_v3.ts
// Usage:
//   UNISWAPV3_POOL_FEES=3000 UNISWAPV3_NPM_ADDRESS=0xC36442b4a4522E871399CD717aBDD847Ab11FE88 UNISWAPV3_FACTORY_ADDRESS=0x1F98431c8aD98523631AE4a59f267346ea31F984 \
//   TOKEN0=0x... TOKEN1=0x... AMOUNT0=1000000000000000000 AMOUNT1=500000000 \
//   BAND=1200 npx hardhat run scripts/add_liquidity_v3.ts --network <net>

import { ethers } from 'hardhat';
import type { Contract, BigNumber } from 'ethers';

const IF_FACTORY = ['function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address)'];

const IF_POOL = [
  'function slot0() external view returns (uint160 sqrtPriceX96,int24 tick,uint16,uint16,uint16,uint8,bool)',
  'function tickSpacing() external view returns (int24)',
];

const IF_ERC20 = [
  'function decimals() external view returns (uint8)',
  'function approve(address spender, uint256 value) external returns (bool)',
  'function balanceOf(address) external view returns (uint256)',
];

const IF_NPM = [
  'function mint((address token0,address token1,uint24 fee,int24 tickLower,int24 tickUpper,uint256 amount0Desired,uint256 amount1Desired,uint256 amount0Min,uint256 amount1Min,address recipient,uint256 deadline)) external payable returns (uint256 tokenId,uint128 liquidity,uint256 amount0,uint256 amount1)',
];

function nearestUsableTick(tick: number, tickSpacing: number): number {
  const r = Math.floor(tick / tickSpacing) * tickSpacing;
  const INT24_MIN = -8388608;
  const INT24_MAX = 8388607;
  return Math.max(INT24_MIN, Math.min(INT24_MAX, r));
}

function toChecksum(addr: string) {
  return ethers.utils.getAddress(addr);
}

async function main() {
  const [signer] = await ethers.getSigners();

  // ----- ENV / CONFIG -----
  const FEE: number = Number(process.env.UNISWAPV3_POOL_FEES ?? '3000'); // 500 | 3000 | 10000
  const NPM = toChecksum(process.env.UNISWAPV3_NPM_ADDRESS!);
  const FACTORY = toChecksum(process.env.UNISWAPV3_FACTORY_ADDRESS!);

  // IMPORTANT: these must be raw integers (wei-like), NOT human strings
  // Example: LONG 1000e18 -> "1000000000000000000000"; USDC 500 -> "500000000"
  let AMOUNT0_RAW = ethers.utils.parseEther('1000');
  let AMOUNT1_RAW = ethers.utils.parseUnits('500', '6');
  const BAND = Number(process.env.BAND ?? '1200');

  // If you prefer hardcoding addresses, set here; otherwise read from env:
  let TOKEN0 = toChecksum(process.env.TOKEN0!);
  let TOKEN1 = toChecksum(process.env.TOKEN1!);

  // Enforce token0 < token1 (lexicographic)
  if (TOKEN0.toLowerCase() > TOKEN1.toLowerCase()) {
    // auto-swap to satisfy Uniswap ordering
    const t = TOKEN0;
    TOKEN0 = TOKEN1;
    TOKEN1 = t;
    const a0 = AMOUNT0_RAW;
    (AMOUNT0_RAW as any) = AMOUNT1_RAW;
    (AMOUNT1_RAW as any) = a0;
  }

  const AMOUNT0 = ethers.BigNumber.from(AMOUNT0_RAW);
  const AMOUNT1 = ethers.BigNumber.from(AMOUNT1_RAW);

  // ----- Contracts -----
  const factory: Contract = new ethers.Contract(FACTORY, IF_FACTORY, signer);
  const poolAddr: string = await factory.getPool(TOKEN0, TOKEN1, FEE);
  if (poolAddr === ethers.constants.AddressZero) {
    throw new Error('Pool does not exist for (token0, token1, fee). Create & initialize it first.');
  }

  const pool: Contract = new ethers.Contract(poolAddr, IF_POOL, signer);
  const npm: Contract = new ethers.Contract(NPM, IF_NPM, signer);
  const erc0: Contract = new ethers.Contract(TOKEN0, IF_ERC20, signer);
  const erc1: Contract = new ethers.Contract(TOKEN1, IF_ERC20, signer);

  // ----- Pool state -----
  const spacing: number = Number(await pool.tickSpacing());
  const slot0 = await pool.slot0();
  const currentTick: number = Number(slot0.tick);
  if (slot0.sqrtPriceX96 === 0) {
    throw new Error('Pool not initialized (slot0.sqrtPriceX96 == 0). Initialize before adding liquidity.');
  }

  // ----- Ticks (auto-band if not provided) -----
  const center = nearestUsableTick(currentTick, spacing);
  const tickLower = nearestUsableTick(center - BAND, spacing);
  const tickUpper = nearestUsableTick(center + BAND, spacing);
  if (tickLower >= tickUpper) throw new Error('Auto-range produced invalid ticks');

  // ----- Balances / Approvals -----
  const me = await signer.getAddress();
  const bal0: BigNumber = await erc0.balanceOf(me);
  const bal1: BigNumber = await erc1.balanceOf(me);
  if (bal0.lt(AMOUNT0))
    throw new Error(`Insufficient TOKEN0 balance. Have ${bal0.toString()}, need ${AMOUNT0.toString()}`);
  if (bal1.lt(AMOUNT1))
    throw new Error(`Insufficient TOKEN1 balance. Have ${bal1.toString()}, need ${AMOUNT1.toString()}`);

  // approve exact desired amounts; some tokens require reset-to-0 first
  await (await erc0.approve(NPM, AMOUNT0)).wait();
  await (await erc1.approve(NPM, AMOUNT1)).wait();

  // ----- Mint -----
  const params = {
    token0: TOKEN0,
    token1: TOKEN1,
    fee: FEE,
    tickLower,
    tickUpper,
    amount0Desired: AMOUNT0,
    amount1Desired: AMOUNT1,
    amount0Min: ethers.constants.Zero,
    amount1Min: ethers.constants.Zero,
    recipient: me,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  };

  const tx = await npm.mint(params);
  const rc = await tx.wait();
  console.log('Liquidity added.');
  console.log(`Pool:        ${poolAddr}`);
  console.log(`Ticks:       lower=${tickLower}, current=${currentTick}, upper=${tickUpper}`);
  console.log(`Tx hash:     ${rc.transactionHash}`);

  // (optional) clean up allowances
  // await (await erc0.approve(NPM, 0)).wait();
  // await (await erc1.approve(NPM, 0)).wait();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

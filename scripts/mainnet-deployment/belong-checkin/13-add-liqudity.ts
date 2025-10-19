// scripts/add_liquidity_v3.ts
// Usage:
//   UNISWAPV3_POOL_FEES=3000 \
//   UNISWAPV3_NPM_ADDRESS=0x1238536071E1c677A632429e3655c799b22cDA52 \
//   UNISWAPV3_FACTORY_ADDRESS=0x1F98431c8aD98523631AE4a59f267346ea31F984 \
//   LONG=0x... USDC=0x... \
//   LONG_AMOUNT=2200 USDC_AMOUNT=1100 BAND=1200 \
//   npx hardhat run scripts/add_liquidity_v3.ts --network <net>

import { ethers } from 'hardhat';
import type { Contract, BigNumber } from 'ethers';

const IF_FACTORY = ['function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address)'];

const IF_POOL = [
  'function slot0() external view returns (uint160 sqrtPriceX96,int24 tick,uint16,uint16,uint16,uint8,bool)',
  'function tickSpacing() external view returns (int24)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)',
];

const IF_ERC20 = [
  'function decimals() external view returns (uint8)',
  'function approve(address spender, uint256 value) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address) external view returns (uint256)',
  'function symbol() external view returns (string)',
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

const toChecksum = (a: string) => ethers.utils.getAddress(a);

async function safeApprove(spender: string, erc20: Contract, owner: string, need: BigNumber) {
  const [sym, allow] = await Promise.all([erc20.symbol().catch(() => 'TOKEN'), erc20.allowance(owner, spender)]);
  console.log(`[allowance] ${sym} -> ${spender}: ${allow.toString()}`);
  if (allow.lt(need)) {
    if (!allow.isZero()) {
      console.log(`[approve] reset ${sym} to 0`);
      await (await erc20.approve(spender, 0)).wait();
    }
    console.log(`[approve] set ${sym} allowance to MAX`);
    await (await erc20.approve(spender, ethers.constants.MaxUint256)).wait();
  }
}

async function main() {
  const [signer] = await ethers.getSigners();
  const me = await signer.getAddress();

  const FEE = Number(process.env.UNISWAPV3_POOL_FEES ?? '3000');
  const NPM_ADDR = toChecksum(process.env.UNISWAPV3_NPM_ADDRESS!);
  const FACTORY = toChecksum(process.env.UNISWAPV3_FACTORY_ADDRESS!);
  const LONG = toChecksum(process.env.LONG_ADDRESS!);
  const USDC = toChecksum(process.env.USDC_ADDRESS!);

  const BAND = Number(process.env.BAND ?? '1200');
  const TICK_LOWER_ENV = process.env.TICK_LOWER;
  const TICK_UPPER_ENV = process.env.TICK_UPPER;

  const LONG_AMOUNT_RAW =
    process.env.AMOUNT_LONG_RAW ?? ethers.utils.parseEther(String(process.env.LONG_AMOUNT ?? '0')).toString();
  const USDC_AMOUNT_RAW =
    process.env.AMOUNT_USDC_RAW ?? ethers.utils.parseUnits(String(process.env.USDC_AMOUNT ?? '0'), 6).toString();

  const factory: Contract = new ethers.Contract(FACTORY, IF_FACTORY, signer);
  const [tA, tB] = LONG.toLowerCase() < USDC.toLowerCase() ? [LONG, USDC] : [USDC, LONG];
  const poolAddr: string = await factory.getPool(tA, tB, FEE);
  if (poolAddr === ethers.constants.AddressZero) throw new Error('Pool does not exist.');

  const pool: Contract = new ethers.Contract(poolAddr, IF_POOL, signer);
  const npm: Contract = new ethers.Contract(NPM_ADDR, IF_NPM, signer);
  console.log('NPM ADDRESS:', npm.address);

  const token0: string = await pool.token0();
  const token1: string = await pool.token1();
  console.log('pool.token0 =', token0);
  console.log('pool.token1 =', token1);

  // map LONG/USDC to pool order
  const longRaw = ethers.BigNumber.from(LONG_AMOUNT_RAW);
  const usdcRaw = ethers.BigNumber.from(USDC_AMOUNT_RAW);

  let desired0: BigNumber, desired1: BigNumber;
  if (token0.toLowerCase() === LONG.toLowerCase() && token1.toLowerCase() === USDC.toLowerCase()) {
    desired0 = longRaw;
    desired1 = usdcRaw;
  } else if (token0.toLowerCase() === USDC.toLowerCase() && token1.toLowerCase() === LONG.toLowerCase()) {
    desired0 = usdcRaw;
    desired1 = longRaw;
  } else {
    throw new Error('Pool tokens do not match provided LONG/USDC.');
  }

  const erc0: Contract = new ethers.Contract(token0, IF_ERC20, signer);
  const erc1: Contract = new ethers.Contract(token1, IF_ERC20, signer);

  const slot0 = await pool.slot0();
  if (slot0.sqrtPriceX96 === 0) throw new Error('Pool not initialized.');
  const spacing = Number(await pool.tickSpacing());
  const currentTick = Number(slot0.tick);

  // ticks
  let tickLower: number, tickUpper: number;
  if (TICK_LOWER_ENV && TICK_UPPER_ENV) {
    tickLower = Number(TICK_LOWER_ENV);
    tickUpper = Number(TICK_UPPER_ENV);
  } else {
    const center = nearestUsableTick(currentTick, spacing);
    tickLower = nearestUsableTick(center - BAND, spacing);
    tickUpper = nearestUsableTick(center + BAND, spacing);
  }
  if (tickLower >= tickUpper) throw new Error('tickLower must be < tickUpper');
  if (tickLower % spacing !== 0 || tickUpper % spacing !== 0) {
    throw new Error(`Ticks must be multiples of tickSpacing=${spacing}`);
  }

  // balances
  const [bal0, bal1] = await Promise.all([erc0.balanceOf(me), erc1.balanceOf(me)]);
  if (bal0.lt(desired0)) throw new Error('Insufficient token0 balance');
  if (bal1.lt(desired1)) throw new Error('Insufficient token1 balance');

  // **APPROVE BEFORE ANY callStatic.mint** to avoid STF in static
  await safeApprove(NPM_ADDR, erc0, me, desired0);
  await safeApprove(NPM_ADDR, erc1, me, desired1);

  // preview (now it won't STF)
  const preview = await npm.callStatic.mint({
    token0,
    token1,
    fee: FEE,
    tickLower,
    tickUpper,
    amount0Desired: desired0,
    amount1Desired: desired1,
    amount0Min: 0,
    amount1Min: 0,
    recipient: me,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  });
  console.log('preview.amount0 =', preview.amount0.toString());
  console.log('preview.amount1 =', preview.amount1.toString());

  // mint exactly what pool will take
  const tx = await npm.mint({
    token0,
    token1,
    fee: FEE,
    tickLower,
    tickUpper,
    amount0Desired: preview.amount0,
    amount1Desired: preview.amount1,
    amount0Min: 0,
    amount1Min: 0,
    recipient: me,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  });
  const rc = await tx.wait();

  console.log('Liquidity added ✅');
  console.log({ poolAddr, token0, token1, fee: FEE, tickLower, currentTick, tickUpper });
  console.log('txHash:', rc.transactionHash);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

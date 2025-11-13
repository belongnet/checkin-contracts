import type { BigNumber, Contract } from 'ethers';
import { ethers } from 'hardhat';

const IF_NPM = [
  // view
  'function positions(uint256 tokenId) view returns (' +
    'uint96 nonce,address operator,address token0,address token1,uint24 fee,' +
    'int24 tickLower,int24 tickUpper,uint128 liquidity,uint256 feeGrowthInside0LastX128,' +
    'uint256 feeGrowthInside1LastX128,uint128 tokensOwed0,uint128 tokensOwed1)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  // actions
  'function decreaseLiquidity((uint256 tokenId,uint128 liquidity,uint256 amount0Min,uint256 amount1Min,uint256 deadline)) returns (uint256 amount0, uint256 amount1)',
  'function collect((uint256 tokenId,address recipient,uint128 amount0Max,uint128 amount1Max)) returns (uint256 amount0, uint256 amount1)',
  'function burn(uint256 tokenId)',
];

function env(name: string, fallback?: string) {
  const v = process.env[name] ?? fallback;
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

async function main() {
  const [signer] = await ethers.getSigners();
  const me = await signer.getAddress();

  const NPM_ADDR = env('UNISWAPV3_NPM_ADDRESS');
  const TOKEN_ID = BigInt(env('TOKEN_ID'));
  const PERCENT = Number(process.env.PERCENT ?? '100'); // 1..100
  const BURN_IF_EMPTY = process.env.BURN_IF_EMPTY === '1';

  if (PERCENT <= 0 || PERCENT > 100) throw new Error('PERCENT must be 1..100');

  const npm: Contract = new ethers.Contract(NPM_ADDR, IF_NPM, signer);

  // sanity: you must own the NFT
  const owner: string = await npm.ownerOf(TOKEN_ID);
  if (owner.toLowerCase() !== me.toLowerCase()) {
    throw new Error(`NFT owner is ${owner}, not ${me}`);
  }

  // read position
  const pos = await npm.positions(TOKEN_ID);
  const liquidity: BigNumber = pos.liquidity; // uint128
  console.log('Position:', {
    tokenId: TOKEN_ID.toString(),
    token0: pos.token0,
    token1: pos.token1,
    fee: pos.fee,
    tickLower: Number(pos.tickLower),
    tickUpper: Number(pos.tickUpper),
    liquidity: liquidity.toString(),
    owed0: pos.tokensOwed0.toString(),
    owed1: pos.tokensOwed1.toString(),
  });

  if (liquidity.isZero() && pos.tokensOwed0.eq(0) && pos.tokensOwed1.eq(0)) {
    console.log('No liquidity and no fees owed. Nothing to withdraw.');
    if (BURN_IF_EMPTY) {
      await (await npm.burn(TOKEN_ID)).wait();
      console.log('NFT burned.');
    }
    return;
  }

  // how much liquidity to remove
  const liqToRemove = liquidity.mul(PERCENT).div(100);
  if (!liqToRemove.isZero()) {
    const deadline = Math.floor(Date.now() / 1000) + 3600;
    console.log(`Decreasing liquidity by ${PERCENT}% -> ${liqToRemove.toString()}`);
    const dec = await npm.decreaseLiquidity({
      tokenId: TOKEN_ID,
      liquidity: liqToRemove,
      amount0Min: 0,
      amount1Min: 0,
      deadline,
    });
    const decRc = await dec.wait();
    console.log('decreaseLiquidity tx:', decRc.transactionHash);
  } else {
    console.log('Liquidity is zero; skipping decreaseLiquidity');
  }

  // collect everything
  const MAX_U128 = '0xffffffffffffffffffffffffffffffff';
  const col = await npm.collect({
    tokenId: TOKEN_ID,
    recipient: me,
    amount0Max: MAX_U128,
    amount1Max: MAX_U128,
  });
  const colRc = await col.wait();
  console.log('collect tx:', colRc.transactionHash);

  // burn if now fully emptied and requested
  const posAfter = await npm.positions(TOKEN_ID);
  if (BURN_IF_EMPTY && posAfter.liquidity.eq(0) && posAfter.tokensOwed0.eq(0) && posAfter.tokensOwed1.eq(0)) {
    await (await npm.burn(TOKEN_ID)).wait();
    console.log('NFT burned (position fully removed).');
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

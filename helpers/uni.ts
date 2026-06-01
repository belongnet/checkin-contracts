import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

// ---------- Addresses (Ethereum mainnet)
export const UNI_V4_POOL_MANAGER = '0x000000000004444c5dc75cB358380D2e3dE08A90';
export const UNI_V4_ROUTER = '0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af';
export const UNI_V4_QUOTER = '0x52f0E24D1c21C8A0cB1e5a5dD6198556BD9E1203';

export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
export const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
export const USDT_MAINNET_ADDRESS = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
export const DAI_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F';

const IV4QuoterAbi = [
  'function quoteExactInputSingle(((address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) external returns (uint256 amountOut,uint256 gasEstimate)',
];

type FoundPool = {
  fee: number;
  tickSpacing: number;
  hooks: string;
  poolKey: string;
  zeroForOne: boolean;
  amountOut: BigNumber;
};

export function sortTokens(a: string, b: string): [string, string] {
  return BigNumber.from(a).lt(b) ? [a, b] : [b, a];
}

export function encodeUniPoolKey(
  tokenA: string,
  tokenB: string,
  fee: number,
  tickSpacing: number,
  hooks: string,
): string {
  const [currency0, currency1] = sortTokens(tokenA, tokenB);
  return ethers.utils.defaultAbiCoder.encode(
    ['tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)'],
    [[currency0, currency1, fee, tickSpacing, hooks]],
  );
}

export async function discoverUniPoolKeyOnFork(opts?: {
  tokenIn?: string;
  tokenOut?: string;
  quoter?: string;
  hookData?: string;
  fees?: number[];
  tickSpacings?: number[];
  hooks?: string[];
  probeAmount?: BigNumber;
}): Promise<FoundPool> {
  const tokenIn = opts?.tokenIn ?? WETH_ADDRESS;
  const tokenOut = opts?.tokenOut ?? USDC_ADDRESS;
  const quoter = opts?.quoter ?? UNI_V4_QUOTER;
  const hookData = opts?.hookData ?? '0x';
  const probeAmount = opts?.probeAmount ?? ethers.utils.parseEther('0.01');

  const fees = opts?.fees ?? [100, 500, 3000, 10000];
  const tickSpacings = opts?.tickSpacings ?? [1, 10, 60, 200];
  const hooksList = opts?.hooks ?? [ethers.constants.AddressZero];

  const quoterC = new ethers.Contract(quoter, IV4QuoterAbi, (await ethers.getSigners())[0]);

  for (const zeroForOne of [true, false]) {
    for (const hook of hooksList) {
      for (const fee of fees) {
        for (const tickSpacing of tickSpacings) {
          const [currency0, currency1] = sortTokens(tokenIn, tokenOut);
          const expectedInput = zeroForOne ? currency0 : currency1;
          if (expectedInput.toLowerCase() !== tokenIn.toLowerCase()) {
            continue;
          }

          const poolKey = { currency0, currency1, fee, tickSpacing, hooks: hook };
          try {
            const [amountOut] = await quoterC.quoteExactInputSingle({
              poolKey,
              zeroForOne,
              exactAmount: probeAmount,
              hookData,
            });
            if (amountOut && BigNumber.from(amountOut).gt(0)) {
              return {
                fee,
                tickSpacing,
                hooks: hook,
                poolKey: encodeUniPoolKey(tokenIn, tokenOut, fee, tickSpacing, hook),
                zeroForOne,
                amountOut: BigNumber.from(amountOut),
              };
            }
          } catch (_) {}
        }
      }
    }
  }

  throw new Error('No live Uniswap v4 pool found for the tested token pair and candidate fee/tick spacing values.');
}

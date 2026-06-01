import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

import { encodePcsPoolKey } from './math';

// ---------- Addresses (BSC mainnet)
export const PCS_CL_POOL_MANAGER = '0xa0FfB9c1CE1Fe56963B0321B32E7A0302114058b';
export const PCS_V4_ROUTER = '0xd9C500DfF816a1Da21A48A732d3498Bf09dc9AEB';
export const PCS_V4_QUOTER = '0xd0737C9762912dD34c3271197E362Aa736Df0926';
export const PCS_V2_ROUTER = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
export const PCS_V3_ROUTER = '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4';

export const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
export const CAKE_ADDRESS = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
export const WBNB_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

// ---------- Minimal ABIs
const ICLQuoterAbi = [
  'function quoteExactInputSingle(((address currency0,address currency1,address hooks,address poolManager,uint24 fee,bytes32 parameters) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData) params) external returns (uint256 amountOut,uint256 gasEstimate)',
];

// ---------- Encoding helpers
export function sortTokens(a: string, b: string): [string, string] {
  return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
}

// Infinity CL parameter pack: bits [0, 15] are hook flags, bits [16, 39] are tickSpacing.
export function encodeTickSpacing(tickSpacing: number): string {
  const ts = BigNumber.from(tickSpacing).shl(16);
  return ethers.utils.hexZeroPad(ts.toHexString(), 32);
}

// ---------- Discovery via Quoter on BSC fork
type FoundPool = {
  fee: number;
  tickSpacing: number;
  hooks: string;
  poolKey: string;
  zeroForOne: boolean;
  amountOut: BigNumber;
};

export async function discoverPcsPoolKeyOnFork(opts?: {
  tokenIn?: string;
  tokenOut?: string;
  router?: string;
  quoter?: string;
  poolManager?: string;
  hookData?: string;
  // candidates override
  fees?: number[];
  tickSpacings?: number[];
  hooks?: string[];
  // amount for probing
  probeAmount?: BigNumber;
}): Promise<FoundPool> {
  const tokenIn = opts?.tokenIn ?? USDT_ADDRESS;
  const tokenOut = opts?.tokenOut ?? CAKE_ADDRESS;
  const quoter = opts?.quoter ?? PCS_V4_QUOTER;
  const poolMgr = opts?.poolManager ?? PCS_CL_POOL_MANAGER;
  const hookData = opts?.hookData ?? '0x';
  const probeAmount = opts?.probeAmount ?? ethers.utils.parseUnits('100', 6); // 100 USDT

  const fees = opts?.fees ?? [100, 300, 330, 500, 2500, 3000, 4000, 10000]; // 0.01–1.00%
  const tickSpacings = opts?.tickSpacings ?? [1, 10, 50, 60, 100, 200];
  const hooksList = opts?.hooks ?? [ethers.constants.AddressZero];

  const quoterC = new ethers.Contract(quoter, ICLQuoterAbi, (await ethers.getSigners())[0]);

  for (const zeroForOne of [true, false]) {
    for (const hook of hooksList) {
      for (const fee of fees) {
        for (const ts of tickSpacings) {
          const [currency0, currency1] = sortTokens(tokenIn, tokenOut);
          const expectedInput = zeroForOne ? currency0 : currency1;
          if (expectedInput.toLowerCase() !== tokenIn.toLowerCase()) {
            continue;
          }

          const key = encodePcsPoolKey(tokenIn, tokenOut, poolMgr, fee, ts, hook);
          try {
            const [amountOut] = await quoterC.quoteExactInputSingle({
              poolKey: {
                currency0,
                currency1,
                hooks: hook,
                poolManager: poolMgr,
                fee,
                parameters: encodeTickSpacing(ts),
              },
              zeroForOne,
              exactAmount: probeAmount,
              hookData,
            });
            if (amountOut && BigNumber.from(amountOut).gt(0)) {
              return {
                fee,
                tickSpacing: ts,
                hooks: hook,
                poolKey: key,
                zeroForOne,
                amountOut: BigNumber.from(amountOut),
              };
            }
          } catch (_) {}
        }
      }
    }
  }

  throw new Error('No live PCS Infinity pool found for the tested token pair and candidate fee/tick spacing values.');
}

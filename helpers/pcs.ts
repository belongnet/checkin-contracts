import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { encodePcsPoolKey } from './math';

// ---------- Addresses (BSC mainnet)
export const PCS_CL_POOL_MANAGER = '0xa0FfB9c1CE1Fe56963B0321B32E7A0302114058b';
export const PCS_V4_ROUTER = '0xd9C500DfF816a1Da21A48A732d3498Bf09dc9AEB';
export const PCS_V4_QUOTER = '0xd0737C9762912dD34c3271197E362Aa736Df0926';

export const USDC = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';
export const CAKE = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';

// ---------- Minimal ABIs
const ICLQuoterAbi = [
  'function quoteExactInputSingle((address currency0,address currency1,address hooks,address poolManager,uint24 fee,bytes32 parameters) poolKey, bool zeroForOne, uint128 exactAmount, bytes hookData) external returns (uint256 amountOut, uint256 gasEstimate)',
];

// ---------- Encoding helpers
export function sortTokens(a: string, b: string): [string, string] {
  return a.toLowerCase() < b.toLowerCase() ? [a, b] : [b, a];
}

// Infinity parameter pack: tickSpacing (int24), rest = 0.
// Encoding like bytes32: lower 3 bytes = tickSpacing (signed), rest = 0.
export function encodeTickSpacing(tickSpacing: number): string {
  // tickSpacing in Infinity/UniV4 — int24.
  const ts = BigNumber.from(tickSpacing & 0xffffff);
  return ethers.utils.hexZeroPad(ts.toHexString(), 32);
}

// ---------- Discovery via Quoter on BSC fork
type FoundPool = { fee: number; tickSpacing: number; hooks: string; poolKey: string; zeroForOne: boolean };

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
  const tokenIn = opts?.tokenIn ?? USDC;
  const tokenOut = opts?.tokenOut ?? CAKE;
  const quoter = opts?.quoter ?? PCS_V4_QUOTER;
  const poolMgr = opts?.poolManager ?? PCS_CL_POOL_MANAGER;
  const hookData = opts?.hookData ?? '0x';
  const probeAmount = opts?.probeAmount ?? ethers.utils.parseUnits('100', 6); // 100 USDC

  const fees = opts?.fees ?? [300, 500, 2500, 3000, 4000, 10000]; // 0.03–1.00%
  const tickSpacings = opts?.tickSpacings ?? [10, 50, 60, 100, 200];
  const hooksList = opts?.hooks ?? [ethers.constants.AddressZero];

  const quoterC = new ethers.Contract(quoter, ICLQuoterAbi, (await ethers.getSigners())[0]);

  const tokenPairs: Array<[string, string, boolean]> = [
    ...[true, false].map(zeroForOne => [USDC, CAKE, zeroForOne] as [string, string, boolean]),
  ];

  for (const [t0, t1, zeroForOne] of tokenPairs) {
    for (const hook of hooksList) {
      for (const fee of fees) {
        for (const ts of tickSpacings) {
          const key = encodePcsPoolKey(t0, t1, poolMgr, fee, ts, hook);
          try {
            const amountIn = zeroForOne ? probeAmount : ethers.utils.parseEther('1');
            const [amountOut] = await quoterC.quoteExactInputSingle(
              {
                currency0: sortTokens(t0, t1)[0],
                currency1: sortTokens(t0, t1)[1],
                hooks: hook,
                poolManager: poolMgr,
                fee,
                parameters: encodeTickSpacing(ts),
              },
              zeroForOne,
              zeroForOne ? amountIn : ethers.BigNumber.from(amountIn),
              hookData,
            );
            if (amountOut && BigNumber.from(amountOut).gt(0)) {
              return { fee, tickSpacing: ts, hooks: hook, poolKey: key, zeroForOne };
            }
          } catch (_) {}
        }
      }
    }
  }

  throw new Error(
    'No live PCS Infinity pool found for USDC–CAKE with tested candidates. Add hooks / spacings to candidates.',
  );
}

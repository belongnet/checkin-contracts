import { BigNumber, BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

type AbiItem = {
  type: string;
  value: any;
};

export function abiEncodeHashFromTypes(types: string[], values: unknown[]): string {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(types, values));
}

export function abiEncodeHash(items: AbiItem[]): string {
  return abiEncodeHashFromTypes(
    items.map(item => item.type),
    items.map(item => item.value),
  );
}

export function getPercentage(amount: BigNumberish, percentage: BigNumberish): BigNumberish {
  return BigNumber.from(amount).mul(BigNumber.from(percentage)).div(10000);
}

export async function u(amount: string | number, token: any) {
  const dec = await token.decimals();
  return parseUnits(String(amount), dec);
}

export const U = (amount: string | number, dec: number) => parseUnits(String(amount), dec);

export function calculatePlatformFee(
  amount: BigNumberish,
  commission: BigNumberish,
  denominator: BigNumberish,
): BigNumber {
  const amountBN = BigNumber.from(amount);
  const commissionBN = BigNumber.from(commission);
  if (amountBN.isZero() || commissionBN.isZero()) {
    return BigNumber.from(0);
  }
  return amountBN.mul(commissionBN).add(denominator).sub(1).div(denominator);
}

export function encodePcsPoolKey(
  tokenA: string,
  tokenB: string,
  poolManager: string,
  fee: number,
  tickSpacing: number,
  hooks: string,
): string {
  const [currency0, currency1] = sortTokens(tokenA, tokenB);
  const parameters = encodeTickSpacing(tickSpacing);
  return ethers.utils.defaultAbiCoder.encode(
    ['tuple(address currency0,address currency1,address hooks,address poolManager,uint24 fee,bytes32 parameters)'],
    [[currency0, currency1, hooks, poolManager, fee, parameters]],
  );
}

function sortTokens(tokenA: string, tokenB: string): [string, string] {
  return ethers.BigNumber.from(tokenA).lt(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];
}

function encodeTickSpacing(tickSpacing: number): string {
  const value = ethers.BigNumber.from(tickSpacing).shl(16);
  return ethers.utils.hexZeroPad(value.toHexString(), 32);
}

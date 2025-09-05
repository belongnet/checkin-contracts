import { BigNumber, BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';

export function getPercentage(amount: BigNumberish, percentage: BigNumberish): BigNumberish {
  return BigNumber.from(amount).mul(BigNumber.from(percentage)).div(10000);
}

export async function u(amount: string | number, token: any) {
  const dec = await token.decimals();
  return parseUnits(String(amount), dec);
}

export const U = (amount: string | number, dec: number) => parseUnits(String(amount), dec);

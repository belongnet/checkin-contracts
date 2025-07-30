import { BigNumber, BigNumberish } from 'ethers';

export function getPercentage(amount: BigNumberish, percentage: BigNumberish): BigNumberish {
  return BigNumber.from(amount).mul(BigNumber.from(percentage)).div(10000);
}

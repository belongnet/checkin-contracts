import { BigNumber, BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { VestingWalletInfoStruct } from '../typechain-types/contracts/v2/periphery/VestingWalletExtended';
import { ethers } from 'hardhat';
import { ERC1155InfoStruct } from '../typechain-types/contracts/v2/platform/Factory';
import { num } from 'starknet';

export function getPercentage(amount: BigNumberish, percentage: BigNumberish): BigNumberish {
  return BigNumber.from(amount).mul(BigNumber.from(percentage)).div(10000);
}

export async function u(amount: string | number, token: any) {
  const dec = await token.decimals();
  return parseUnits(String(amount), dec);
}

export const U = (amount: string | number, dec: number) => parseUnits(String(amount), dec);

export function hashAccessTokenInfo(
  name: string,
  symbol: string,
  contractUri: string,
  feeNumerator: number,
  chainId: number,
) {
  return ethers.utils.solidityKeccak256(
    [
      'string', // name
      'string', // symbol
      'string', // contractUri
      'uint96', // feeNumerator
      'uint256', // chainId
    ],
    [name, symbol, contractUri, feeNumerator, chainId],
  );
}

export function hashERC1155Info(erc1155info: ERC1155InfoStruct, chainId: number) {
  return ethers.utils.solidityKeccak256(
    [
      'string', // name
      'string', // symbol
      'string', // uri
      'uint256', // chainId
    ],
    [erc1155info.name, erc1155info.symbol, erc1155info.uri, chainId],
  );
}

export function hashVestingInfo(ownerAddr: string, info: VestingWalletInfoStruct, chainId: number) {
  return ethers.utils.solidityKeccak256(
    [
      'address', // owner
      'uint64', // startTimestamp
      'uint64', // cliffDurationSeconds
      'uint64', // durationSeconds
      'address', // token
      'address', // beneficiary
      'uint256', // totalAllocation
      'uint256', // tgeAmount
      'uint256', // linearAllocation
      'string', // description
      'uint256', // chainId
    ],
    [
      ownerAddr,
      info.startTimestamp,
      info.cliffDurationSeconds,
      info.durationSeconds,
      info.token,
      info.beneficiary,
      info.totalAllocation,
      info.tgeAmount,
      info.linearAllocation,
      info.description,
      chainId,
    ],
  );
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

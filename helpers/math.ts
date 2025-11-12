import { BigNumber, BigNumberish } from 'ethers';
import { parseUnits } from 'ethers/lib/utils';
import { VestingWalletInfoStruct } from '../typechain-types/contracts/v2/periphery/VestingWalletExtended';
import { ethers } from 'hardhat';
import { AccessTokenInfoStruct, ERC1155InfoStruct } from '../typechain-types/contracts/v2/platform/Factory';

type AbiItem = {
  type: string;
  value: any;
};

export function abiEncodeHashFromTypes(types: string[], values: unknown[]): string {
  return ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(types, values));
}

export function abiEncodeHash(items: AbiItem[]): string {
  return abiEncodeHashFromTypes(
    items.map((item) => item.type),
    items.map((item) => item.value),
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

export function hashAccessTokenInfo(
  verifyingContract: string,
  nonce: BigNumberish,
  deadline: BigNumberish,
  chainId: BigNumberish,
  info: AccessTokenInfoStruct,
) {
  const packed = ethers.utils.solidityPack(
    ['address', 'uint256', 'uint256', 'uint256', 'address', 'string', 'string', 'string', 'uint96'],
    [
      verifyingContract,
      nonce,
      deadline,
      chainId,
      info.creator,
      info.metadata.name,
      info.metadata.symbol,
      info.contractURI,
      info.feeNumerator,
    ],
  );
  return ethers.utils.keccak256(packed);
}

export function hashERC1155Info(
  verifyingContract: string,
  nonce: BigNumberish,
  deadline: BigNumberish,
  chainId: BigNumberish,
  erc1155info: ERC1155InfoStruct,
) {
  return abiEncodeHash([
    { type: 'address', value: verifyingContract },
    { type: 'uint256', value: nonce },
    { type: 'uint256', value: deadline },
    { type: 'uint256', value: chainId },
    { type: 'string', value: erc1155info.name },
    { type: 'string', value: erc1155info.symbol },
    { type: 'string', value: erc1155info.uri },
  ]);
}

export function hashVestingInfo(
  verifyingContract: string,
  nonce: BigNumberish,
  deadline: BigNumberish,
  ownerAddr: string,
  info: VestingWalletInfoStruct,
  chainId: BigNumberish,
) {
  return abiEncodeHash([
    { type: 'address', value: verifyingContract },
    { type: 'uint256', value: nonce },
    { type: 'uint256', value: deadline },
    { type: 'uint256', value: chainId },
    { type: 'address', value: ownerAddr },
    { type: 'uint64', value: info.startTimestamp },
    { type: 'uint64', value: info.cliffDurationSeconds },
    { type: 'uint64', value: info.durationSeconds },
    { type: 'address', value: info.token },
    { type: 'address', value: info.beneficiary },
    { type: 'uint256', value: info.totalAllocation },
    { type: 'uint256', value: info.tgeAmount },
    { type: 'uint256', value: info.linearAllocation },
  ]);
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

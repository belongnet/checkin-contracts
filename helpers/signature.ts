import { time } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, BigNumberish, BytesLike } from 'ethers';
import { ethers } from 'hardhat';

import { VestingWalletInfoStruct } from '../typechain-types/contracts/v2/periphery/VestingWalletExtended';
import {
  CustomerInfoStruct,
  PromoterInfoStruct,
  VenueInfoStruct,
} from '../typechain-types/contracts/v2/platform/BelongCheckIn';
import { AccessTokenInfoStruct, ERC1155InfoStruct } from '../typechain-types/contracts/v2/platform/Factory';
import {
  DynamicPriceParametersStruct,
  StaticPriceParametersStruct,
} from '../typechain-types/contracts/v2/tokens/AccessToken';
import { SignatureVerifier } from '../typechain-types/contracts/v2/utils/SignatureVerifier';

export type SignatureProtectionStruct = SignatureVerifier.SignatureProtectionStruct;

export type SignatureOverrides = {
  nonce?: BigNumberish;
  deadline?: BigNumberish;
  chainId?: BigNumberish;
};

const DEFAULT_DEADLINE_WINDOW = 3600; // 1 hour
let nonceCounter = BigNumber.from(1);

function nextNonce(): BigNumber {
  const current = nonceCounter;
  nonceCounter = nonceCounter.add(1);
  return current;
}

function normalizeBigNumberish(value: BigNumberish | undefined, fallback: BigNumberish): BigNumber {
  if (value === undefined) {
    return BigNumber.from(fallback);
  }
  return BigNumber.from(value);
}

async function buildProtection(
  signerPrivateKey: string,
  encode: (opts: { nonce: BigNumber; deadline: BigNumber; chainId: BigNumber }) => BytesLike,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  const { chainId } = await ethers.provider.getNetwork();
  const nonce = normalizeBigNumberish(overrides?.nonce, nextNonce());
  const latest = await time.latest();
  const deadline = normalizeBigNumberish(overrides?.deadline, latest + DEFAULT_DEADLINE_WINDOW);
  const chainIdToUse = normalizeBigNumberish(overrides?.chainId, chainId);

  const digest = ethers.utils.keccak256(encode({ nonce, deadline, chainId: chainIdToUse }));
  const signingKey = new ethers.utils.SigningKey(signerPrivateKey);
  const signature = ethers.utils.joinSignature(signingKey.signDigest(digest));

  return { nonce, deadline, signature };
}

export async function signAccessTokenInfo(
  verifyingContract: string,
  signerPrivateKey: string,
  info: AccessTokenInfoStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.solidityPack(
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
      ),
    overrides,
  );
}

export async function signCreditTokenInfo(
  verifyingContract: string,
  signerPrivateKey: string,
  info: Pick<ERC1155InfoStruct, 'name' | 'symbol' | 'uri'>,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  const protection = await buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'uint256', 'string', 'string', 'string'],
        [verifyingContract, nonce, deadline, chainId, info.name, info.symbol, info.uri],
      ),
    overrides,
  );
  return protection;
}

export async function signVestingWalletInfo(
  verifyingContract: string,
  signerPrivateKey: string,
  owner: string,
  info: VestingWalletInfoStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        [
          'address',
          'uint256',
          'uint256',
          'uint256',
          'address',
          'uint64',
          'uint64',
          'uint64',
          'address',
          'address',
          'uint256',
          'uint256',
          'uint256',
        ],
        [
          verifyingContract,
          nonce,
          deadline,
          chainId,
          owner,
          info.startTimestamp,
          info.cliffDurationSeconds,
          info.durationSeconds,
          info.token,
          info.beneficiary,
          info.totalAllocation,
          info.tgeAmount,
          info.linearAllocation,
        ],
      ),
    overrides,
  );
}

export async function signVenueInfo(
  verifyingContract: string,
  signerPrivateKey: string,
  info: VenueInfoStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'uint256', 'address', 'bytes32', 'string'],
        [verifyingContract, nonce, deadline, chainId, info.venue, info.affiliateReferralCode, info.uri],
      ),
    overrides,
  );
}

export async function signCustomerInfo(
  verifyingContract: string,
  signerPrivateKey: string,
  info: CustomerInfoStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        [
          'address',
          'uint256',
          'uint256',
          'uint256',
          'bool',
          'uint128',
          'uint24',
          'uint128',
          'uint24',
          'address',
          'address',
          'bytes32',
          'uint256',
        ],
        [
          verifyingContract,
          nonce,
          deadline,
          chainId,
          info.paymentInUSDtoken,
          info.toCustomer.visitBountyAmount,
          info.toCustomer.spendBountyPercentage,
          info.toPromoter.visitBountyAmount,
          info.toPromoter.spendBountyPercentage,
          info.customer,
          info.venueToPayFor,
          info.promoterReferralCode,
          info.amount,
        ],
      ),
    overrides,
  );
}

export async function signPromoterInfo(
  verifyingContract: string,
  signerPrivateKey: string,
  info: PromoterInfoStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'uint256', 'bytes32', 'address', 'uint256'],
        [verifyingContract, nonce, deadline, chainId, info.promoterReferralCode, info.venue, info.amountInUSD],
      ),
    overrides,
  );
}

export function resetSignatureNonce(value = BigNumber.from(1)) {
  nonceCounter = value;
}

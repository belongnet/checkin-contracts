import { BigNumber, BigNumberish, BytesLike } from 'ethers';
import { ethers } from 'hardhat';

import type { BelongCheckIn } from '../typechain-types';
import { VestingWalletInfoStruct } from '../typechain-types/contracts/v2/periphery/VestingWalletExtended';
import {
  CustomerInfoStruct,
  PromoterInfoStruct,
  VenueInfoStruct,
  VenueRulesStruct,
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
  rules?: VenueRulesStruct;
  /// Referral code passed to `Factory.produce` next to the AccessToken payload (signed with it).
  referralCode?: BytesLike;
  /// Amount the caller funds a vesting wallet with on deployment (signed with the vesting payload).
  /// Defaults to `totalAllocation`, which is what `Factory.deployVestingWallet` transfers.
  initialFunding?: BigNumberish;
};

/// First word of every signed digest: one constant per message kind (see `SignatureVerifier.sol`).
export const SIGNATURE_TYPEHASH = {
  accessTokenInfo: ethers.utils.id('Belong.SignatureVerifier.v2.AccessTokenInfo'),
  creditTokenInfo: ethers.utils.id('Belong.SignatureVerifier.v2.CreditTokenInfo'),
  vestingWalletInfo: ethers.utils.id('Belong.SignatureVerifier.v2.VestingWalletInfo'),
  venueInfo: ethers.utils.id('Belong.SignatureVerifier.v2.VenueInfo'),
  customerInfo: ethers.utils.id('Belong.SignatureVerifier.v2.CustomerInfo'),
  promoterInfo: ethers.utils.id('Belong.SignatureVerifier.v2.PromoterInfo'),
  staticPriceMint: ethers.utils.id('Belong.SignatureVerifier.v2.StaticPriceMint'),
  dynamicPriceMint: ethers.utils.id('Belong.SignatureVerifier.v2.DynamicPriceMint'),
} as const;

/// ABI tuple types of the signed payload structs, in the field order of `contracts/v2/Structures.sol`.
export const SIGNED_STRUCT_TYPE = {
  accessTokenInfo:
    'tuple(address creator, address paymentToken, uint96 feeNumerator, bool transferable, uint256 maxTotalSupply, uint256 mintPrice, uint256 whitelistMintPrice, tuple(string name, string symbol) metadata, string contractURI)',
  creditTokenInfo:
    'tuple(address defaultAdmin, bool transferable, address manager, address minter, address burner, string name, string symbol, string uri)',
  venueInfo:
    'tuple(tuple(uint8 paymentType, uint8 bountyType, uint8 bountyAllocationType, uint8 longPaymentType) rules, address venue, uint256 amount, bytes32 affiliateReferralCode, string uri)',
  customerInfo:
    'tuple(bool paymentInUSDtoken, tuple(uint24 spendBountyPercentage, uint128 visitBountyAmount) toCustomer, tuple(uint24 spendBountyPercentage, uint128 visitBountyAmount) toPromoter, address customer, address venueToPayFor, bytes32 promoterReferralCode, uint256 amount)',
  promoterInfo: 'tuple(bool paymentInUSDtoken, bytes32 promoterReferralCode, address venue, uint256 amountInUSD)',
  vestingWalletInfo:
    'tuple(uint64 startTimestamp, uint64 cliffDurationSeconds, uint64 durationSeconds, address token, address beneficiary, uint256 totalAllocation, uint256 tgeAmount, uint256 linearAllocation, string description)',
} as const;

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

function normalizePrivateKey(pk: string): string {
  const trimmed = pk.trim();
  return trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
}

function normalizeReferralCode(code: BytesLike | undefined): string {
  if (code === undefined) {
    return ethers.constants.HashZero;
  }
  const hex = ethers.utils.hexlify(code);
  return ethers.utils.hexDataLength(hex) === 0 ? ethers.constants.HashZero : hex;
}

async function buildProtection(
  signerPrivateKey: string,
  encode: (opts: { nonce: BigNumber; deadline: BigNumber; chainId: BigNumber }) => BytesLike,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  const { chainId } = await ethers.provider.getNetwork();
  const nonce = normalizeBigNumberish(overrides?.nonce, nextNonce());
  const block = await ethers.provider.getBlock('latest');
  const latest = block?.timestamp ?? Math.floor(Date.now() / 1000);
  const deadline = normalizeBigNumberish(overrides?.deadline, latest + DEFAULT_DEADLINE_WINDOW);
  const chainIdToUse = normalizeBigNumberish(overrides?.chainId, chainId);

  const digest = ethers.utils.keccak256(encode({ nonce, deadline, chainId: chainIdToUse }));
  const signingKey = new ethers.utils.SigningKey(normalizePrivateKey(signerPrivateKey));
  const signature = ethers.utils.joinSignature(signingKey.signDigest(digest));

  return { nonce, deadline, signature };
}

/// Signs the whole `AccessTokenInfo` struct plus the referral code (`overrides.referralCode`, zero by default).
export async function signAccessTokenInfo(
  verifyingContract: string,
  signerPrivateKey: string,
  info: AccessTokenInfoStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  const referralCode = normalizeReferralCode(overrides?.referralCode);
  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'uint256', 'uint256', 'uint256', SIGNED_STRUCT_TYPE.accessTokenInfo, 'bytes32'],
        [SIGNATURE_TYPEHASH.accessTokenInfo, verifyingContract, nonce, deadline, chainId, info, referralCode],
      ),
    overrides,
  );
}

/// Signs the whole `ERC1155Info` struct, including the admin, manager, minter and burner addresses.
export async function signCreditTokenInfo(
  verifyingContract: string,
  signerPrivateKey: string,
  info: ERC1155InfoStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'uint256', 'uint256', 'uint256', SIGNED_STRUCT_TYPE.creditTokenInfo],
        [SIGNATURE_TYPEHASH.creditTokenInfo, verifyingContract, nonce, deadline, chainId, info],
      ),
    overrides,
  );
}

/// Signs the owner, the whole `VestingWalletInfo` struct and the initial funding
/// (`overrides.initialFunding`, which defaults to `totalAllocation` as in `Factory.deployVestingWallet`).
export async function signVestingWalletInfo(
  verifyingContract: string,
  signerPrivateKey: string,
  owner: string,
  info: VestingWalletInfoStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  const initialFunding = overrides?.initialFunding ?? (await info.totalAllocation);
  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        [
          'bytes32',
          'address',
          'uint256',
          'uint256',
          'uint256',
          'address',
          SIGNED_STRUCT_TYPE.vestingWalletInfo,
          'uint256',
        ],
        [
          SIGNATURE_TYPEHASH.vestingWalletInfo,
          verifyingContract,
          nonce,
          deadline,
          chainId,
          owner,
          info,
          initialFunding,
        ],
      ),
    overrides,
  );
}

/// Signs the whole `VenueInfo` struct, including the deposit amount and the venue rules.
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
        ['bytes32', 'address', 'uint256', 'uint256', 'uint256', SIGNED_STRUCT_TYPE.venueInfo],
        [SIGNATURE_TYPEHASH.venueInfo, verifyingContract, nonce, deadline, chainId, info],
      ),
    overrides,
  );
}

/// Signs the whole `CustomerInfo` struct together with the venue's current bounty rules.
export async function signCustomerInfo(
  verifyingContract: string,
  signerPrivateKey: string,
  info: CustomerInfoStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  const rules =
    overrides?.rules ??
    (
      await ((await ethers.getContractAt('BelongCheckIn', verifyingContract)) as BelongCheckIn).generalVenueInfo(
        info.venueToPayFor,
      )
    ).rules;

  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'uint256', 'uint256', 'uint256', 'uint8', 'uint8', SIGNED_STRUCT_TYPE.customerInfo],
        [
          SIGNATURE_TYPEHASH.customerInfo,
          verifyingContract,
          nonce,
          deadline,
          chainId,
          rules.bountyType,
          rules.bountyAllocationType,
          info,
        ],
      ),
    overrides,
  );
}

/// Signs the whole `PromoterInfo` struct, including the payout currency flag.
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
        ['bytes32', 'address', 'uint256', 'uint256', 'uint256', SIGNED_STRUCT_TYPE.promoterInfo],
        [SIGNATURE_TYPEHASH.promoterInfo, verifyingContract, nonce, deadline, chainId, info],
      ),
    overrides,
  );
}

export async function buildStaticProtection(
  verifyingContract: string,
  signerPrivateKey: string,
  receiver: string,
  params: StaticPriceParametersStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'uint256', 'uint256', 'uint256', 'address', 'uint256', 'string', 'bool'],
        [
          SIGNATURE_TYPEHASH.staticPriceMint,
          verifyingContract,
          nonce,
          deadline,
          chainId,
          receiver,
          params.tokenId,
          params.tokenUri,
          params.whitelisted,
        ],
      ),
    overrides,
  );
}

export async function buildDynamicProtection(
  verifyingContract: string,
  signerPrivateKey: string,
  receiver: string,
  params: DynamicPriceParametersStruct,
  overrides?: SignatureOverrides,
): Promise<SignatureProtectionStruct> {
  return buildProtection(
    signerPrivateKey,
    ({ nonce, deadline, chainId }) =>
      ethers.utils.defaultAbiCoder.encode(
        ['bytes32', 'address', 'uint256', 'uint256', 'uint256', 'address', 'uint256', 'string', 'uint256'],
        [
          SIGNATURE_TYPEHASH.dynamicPriceMint,
          verifyingContract,
          nonce,
          deadline,
          chainId,
          receiver,
          params.tokenId,
          params.tokenUri,
          params.price,
        ],
      ),
    overrides,
  );
}

export function resetSignatureNonce(value = BigNumber.from(1)) {
  nonceCounter = value;
}

import { ethers, upgrades } from 'hardhat';
import { BigNumberish, BigNumber as BN, BytesLike, ContractFactory } from 'ethers';
import {
  AccessToken,
  CreditToken,
  Escrow,
  Factory,
  LONG,
  RoyaltiesReceiverV2,
  Staking,
  BelongCheckIn,
  VestingWalletExtended,
  NFT,
  DualDexSwapV4Lib,
} from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { AccessTokenInfoStruct, ERC1155InfoStruct } from '../typechain-types/contracts/v2/platform/Factory';
import { VestingWalletInfoStruct } from '../typechain-types/contracts/v2/periphery/VestingWalletExtended';
import { signAccessTokenInfo, signCreditTokenInfo, signVestingWalletInfo } from './signature';
import { DualDexSwapV4Lib as DualDexSwapV4LibType } from '../typechain-types/contracts/v2/platform/extensions/DualDexSwapV4';

export type TokenMetadata = { name: string; symbol: string; uri: string };

export async function deployAccessTokenImplementation(signatureVerifier: string): Promise<AccessToken> {
  const AccessToken: ContractFactory = await ethers.getContractFactory('AccessToken', {
    libraries: { SignatureVerifier: signatureVerifier },
  });
  const accessToken: AccessToken = (await AccessToken.deploy()) as AccessToken;
  await accessToken.deployed();
  return accessToken;
}

export async function deployRoyaltiesReceiverV2Implementation(): Promise<RoyaltiesReceiverV2> {
  const RoyaltiesReceiverV2: ContractFactory = await ethers.getContractFactory('RoyaltiesReceiverV2');
  const royaltiesReceiverV2: RoyaltiesReceiverV2 = (await RoyaltiesReceiverV2.deploy()) as RoyaltiesReceiverV2;
  await royaltiesReceiverV2.deployed();
  return royaltiesReceiverV2;
}

export async function deployCreditTokenImplementation(): Promise<CreditToken> {
  const CreditToken: ContractFactory = await ethers.getContractFactory('CreditToken');
  const creditToken: CreditToken = (await CreditToken.deploy()) as CreditToken;
  await creditToken.deployed();
  return creditToken;
}

export async function deployVestingWalletImplementation(): Promise<VestingWalletExtended> {
  const VestingWallet: ContractFactory = await ethers.getContractFactory('VestingWalletExtended');
  const vestingWallet: VestingWalletExtended = (await VestingWallet.deploy()) as VestingWalletExtended;
  await vestingWallet.deployed();
  return vestingWallet;
}

export async function deployFactory(
  platformAddress: string,
  signerAddress: string,
  signatureVerifier: string,
  transferValidator: string,
  implementations: Factory.ImplementationsStruct,
  factoryParams?: Factory.FactoryParametersStruct,
  platformCommission: BigNumberish = 100,
  defaultPaymentCurrency: string = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  maxArraySize: BigNumberish = 10,
  royalties: Factory.RoyaltiesParametersStruct = {
    amountToCreator: 8000,
    amountToPlatform: 2000,
  },
  referralPercentages: number[] = [0, 5000, 3000, 1500, 500],
): Promise<Factory> {
  if (factoryParams === undefined) {
    factoryParams = {
      transferValidator,
      platformAddress,
      signerAddress,
      platformCommission,
      defaultPaymentCurrency,
      maxArraySize,
    };
  }

  const Factory: ContractFactory = await ethers.getContractFactory('Factory', {
    libraries: { SignatureVerifier: signatureVerifier },
  });
  if (process.env.DEBUG_SIGNATURES === '1') {
    // eslint-disable-next-line no-console
    console.log('deployFactory signer', signerAddress);
  }
  const factory: Factory = (await upgrades.deployProxy(
    Factory,
    [factoryParams, royalties, implementations, referralPercentages],
    {
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    },
  )) as Factory;
  await factory.deployed();
  if (process.env.DEBUG_SIGNATURES === '1') {
    const params = await factory.nftFactoryParameters();
    // eslint-disable-next-line no-console
    console.log('factory deployed params signer', params.signerAddress);
  }

  return factory;
}

export async function deployNftWithoutFactory(args: any): Promise<NFT> {
  const NFT: ContractFactory = await ethers.getContractFactory('NFT');
  const nft: NFT = (await NFT.deploy(args)) as NFT;
  await nft.deployed();
  return nft;
}

export async function deployAccessToken(
  tokenMetadata: TokenMetadata,
  mintPrice: BigNumberish,
  whitelistMintPrice: BigNumberish,
  signer: {
    privateKey: string;
    publicKey: string;
    address: string;
  },
  creator: SignerWithAddress,
  factoryContract: Factory,
  referralCode: BytesLike = '0x',
  paymentToken: string = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  transferable: boolean = true,
  maxTotalSupply: BigNumberish = 10,
  feeNumerator: BigNumberish = BN.from('600'),
  collectionExpire: BigNumberish = BN.from('86400'),
): Promise<{ accessToken: AccessToken; royaltiesReceiver: RoyaltiesReceiverV2 }> {
  const instanceInfo: AccessTokenInfoStruct = {
    creator: creator.address,
    metadata: { name: tokenMetadata.name, symbol: tokenMetadata.symbol },
    contractURI: tokenMetadata.uri,
    paymentToken,
    mintPrice,
    whitelistMintPrice,
    transferable,
    maxTotalSupply,
    feeNumerator,
    collectionExpire,
  };

  const protection = await signAccessTokenInfo(factoryContract.address, signer.privateKey, instanceInfo);

  await factoryContract.connect(creator).produce(instanceInfo, referralCode, protection);

  const getNftInstanceInfo = await factoryContract.nftInstanceInfo(tokenMetadata.name, tokenMetadata.symbol);
  if (getNftInstanceInfo.nftAddress === ethers.constants.AddressZero) {
    throw new Error('AccessToken deployment failed: instance info not found');
  }

  return {
    accessToken: await ethers.getContractAt('AccessToken', getNftInstanceInfo.nftAddress),
    royaltiesReceiver: await ethers.getContractAt('RoyaltiesReceiverV2', getNftInstanceInfo.royaltiesReceiver),
  };
}

export async function deployCreditTokens(
  transferableVenue: boolean,
  transferablePromoter: boolean,
  factoryAddress: string,
  signerPk: string,
  admin: SignerWithAddress,
  manager: string = admin.address,
  minter: string = admin.address,
  burner: string = admin.address,
  venueTokenMetadata: TokenMetadata = {
    name: 'VenueToken',
    symbol: 'VET',
    uri: 'contractURI/VenueToken',
  },
  promoterTokenMetadata: TokenMetadata = {
    name: 'PromoterToken',
    symbol: 'PMT',
    uri: 'contractURI/PromoterToken',
  },
): Promise<{
  venueToken: CreditToken;
  promoterToken: CreditToken;
}> {
  const vtInfo: ERC1155InfoStruct = {
    name: venueTokenMetadata.name,
    symbol: venueTokenMetadata.symbol,
    defaultAdmin: admin.address,
    manager: manager,
    minter: minter,
    burner: burner,
    uri: venueTokenMetadata.uri,
    transferable: transferableVenue,
  };
  const ptInfo: ERC1155InfoStruct = {
    name: promoterTokenMetadata.name,
    symbol: promoterTokenMetadata.symbol,
    defaultAdmin: admin.address,
    manager: manager,
    minter: minter,
    burner: burner,
    uri: promoterTokenMetadata.uri,
    transferable: transferablePromoter,
  };
  const factory = await ethers.getContractAt('Factory', factoryAddress);

  const venueProtection = await signCreditTokenInfo(factoryAddress, signerPk, vtInfo);
  const promoterProtection = await signCreditTokenInfo(factoryAddress, signerPk, ptInfo);
  // Debug: verify signatures locally when tests fail
  if (process.env.DEBUG_SIGNATURES === '1') {
    const { chainId } = await ethers.provider.getNetwork();
    const venueDigest = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'uint256', 'string', 'string', 'string'],
        [
          factoryAddress,
          venueProtection.nonce,
          venueProtection.deadline,
          chainId,
          vtInfo.name,
          vtInfo.symbol,
          vtInfo.uri,
        ],
      ),
    );
    const promoterDigest = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'uint256', 'string', 'string', 'string'],
        [
          factoryAddress,
          promoterProtection.nonce,
          promoterProtection.deadline,
          chainId,
          ptInfo.name,
          ptInfo.symbol,
          ptInfo.uri,
        ],
      ),
    );
    // eslint-disable-next-line no-console
    console.log('credit-token-signatures', {
      venue: {
        nonce: venueProtection.nonce.toString(),
        deadline: venueProtection.deadline.toString(),
        signer: ethers.utils.recoverAddress(venueDigest, venueProtection.signature).toLowerCase(),
        signature: venueProtection.signature,
      },
      promoter: {
        nonce: promoterProtection.nonce.toString(),
        deadline: promoterProtection.deadline.toString(),
        signer: ethers.utils.recoverAddress(promoterDigest, promoterProtection.signature).toLowerCase(),
        signature: promoterProtection.signature,
      },
    });
  }

  const tx1 = await factory.connect(admin).produceCreditToken(vtInfo, venueProtection);
  await tx1.wait(1);

  const tx2 = await factory.connect(admin).produceCreditToken(ptInfo, promoterProtection);
  await tx2.wait(1);

  const venueTokenInstanceInfo = await factory.getCreditTokenInstanceInfo(
    venueTokenMetadata.name,
    venueTokenMetadata.symbol,
  );
  const promoterTokenInstanceInfo = await factory.getCreditTokenInstanceInfo(
    promoterTokenMetadata.name,
    promoterTokenMetadata.symbol,
  );

  return {
    venueToken: await ethers.getContractAt('CreditToken', venueTokenInstanceInfo.creditToken),
    promoterToken: await ethers.getContractAt('CreditToken', promoterTokenInstanceInfo.creditToken),
  };
}

export async function deployVestingWallet(
  vestingWalletInfo: VestingWalletInfoStruct,
  factoryAddress: string,
  long: string,
  signerPk: string,
  owner: SignerWithAddress,
): Promise<VestingWalletExtended> {
  const factory = await ethers.getContractAt('Factory', factoryAddress);
  const LONG = await ethers.getContractAt('LONG', long);

  await LONG.approve(factory.address, vestingWalletInfo.totalAllocation);

  const protection = await signVestingWalletInfo(factoryAddress, signerPk, owner.address, vestingWalletInfo);

  const deployVestingWallet = await factory
    .connect(owner)
    .deployVestingWallet(owner.address, vestingWalletInfo, protection);
  await deployVestingWallet.wait(1);

  const vestingWalletInstanceInfo = await factory.getVestingWalletInstanceInfo(await vestingWalletInfo.beneficiary, 0);

  return await ethers.getContractAt('VestingWalletExtended', vestingWalletInstanceInfo.vestingWallet);
}

export async function deployLONG(mintTo: string, admin: string, pauser: string): Promise<LONG> {
  const LONG: ContractFactory = await ethers.getContractFactory('LONG');
  const long: LONG = (await upgrades.deployProxy(LONG, [mintTo, admin, pauser], {
    unsafeAllow: ['constructor'],
    unsafeAllowLinkedLibraries: true,
  })) as LONG;
  await long.deployed();
  return long;
}

export async function deployStaking(owner: string, treasury: string, long: string): Promise<Staking> {
  const Staking: ContractFactory = await ethers.getContractFactory('Staking');

  const staking: Staking = (await upgrades.deployProxy(Staking, [owner, treasury, long], {
    unsafeAllow: ['constructor'],
    unsafeAllowLinkedLibraries: true,
  })) as Staking;
  await staking.deployed();
  return staking;
}

export async function deployDualDexSwapV4Lib(): Promise<DualDexSwapV4Lib> {
  const DualDexSwapV4Lib: ContractFactory = await ethers.getContractFactory('DualDexSwapV4Lib');
  const dualDexSwapV4Lib: DualDexSwapV4Lib = (await DualDexSwapV4Lib.deploy()) as DualDexSwapV4Lib;
  await dualDexSwapV4Lib.deployed();
  return dualDexSwapV4Lib;
}

export async function deployBelongCheckIn(
  signatureVerifier: string,
  helper: string,
  dualDexSwapV4Lib: string,
  owner: string,
  paymentsInfo: DualDexSwapV4LibType.PaymentsInfoStruct,
): Promise<BelongCheckIn> {
  const BelongCheckIn: ContractFactory = await ethers.getContractFactory('BelongCheckIn', {
    libraries: {
      SignatureVerifier: signatureVerifier,
      Helper: helper,
      DualDexSwapV4Lib: dualDexSwapV4Lib,
    },
  });
  const belongCheckIn: BelongCheckIn = (await upgrades.deployProxy(BelongCheckIn, [owner, paymentsInfo], {
    unsafeAllow: ['constructor'],
    unsafeAllowLinkedLibraries: true,
  })) as BelongCheckIn;
  await belongCheckIn.deployed();

  return belongCheckIn;
}

export async function deployEscrow(belongCheckIn: string): Promise<Escrow> {
  const Escrow: ContractFactory = await ethers.getContractFactory('Escrow');
  const escrow: Escrow = (await upgrades.deployProxy(Escrow, [belongCheckIn], {
    unsafeAllow: ['constructor'],
    unsafeAllowLinkedLibraries: true,
  })) as Escrow;
  await escrow.deployed();

  return escrow;
}

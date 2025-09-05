import { ethers, upgrades } from 'hardhat';
import EthCrypto from 'eth-crypto';
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
} from '../typechain-types';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { AccessTokenInfoStruct } from '../typechain-types/contracts/v2/platform/Factory';

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

export async function deployFactory(
  platformAddress: string,
  signerAddress: string,
  signatureVerifier: string,
  validator: string,
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
      transferValidator: validator,
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
  const factory: Factory = (await upgrades.deployProxy(
    Factory,
    [factoryParams, royalties, implementations, referralPercentages],
    {
      unsafeAllow: ['constructor'],
      unsafeAllowLinkedLibraries: true,
    },
  )) as Factory;
  await factory.deployed();

  return factory;
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
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const message = EthCrypto.hash.keccak256([
    { type: 'string', value: tokenMetadata.name },
    { type: 'string', value: tokenMetadata.symbol },
    { type: 'string', value: tokenMetadata.uri },
    { type: 'uint96' as any, value: 600 },
    { type: 'uint256', value: chainId },
  ]);
  const signature = EthCrypto.sign(signer.privateKey, message);

  const instanceInfo: AccessTokenInfoStruct = {
    metadata: { name: tokenMetadata.name, symbol: tokenMetadata.symbol },
    contractURI: tokenMetadata.uri,
    paymentToken,
    mintPrice,
    whitelistMintPrice,
    transferable,
    maxTotalSupply,
    feeNumerator,
    collectionExpire,
    signature,
  };

  await factoryContract.connect(creator).produce(instanceInfo, referralCode);

  const getNftInstanceInfo = await factoryContract.nftInstanceInfo(tokenMetadata.name, tokenMetadata.symbol);

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
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const venueTokenMessage = EthCrypto.hash.keccak256([
    { type: 'string', value: venueTokenMetadata.name },
    { type: 'string', value: venueTokenMetadata.symbol },
    { type: 'string', value: venueTokenMetadata.uri },
    { type: 'uint256', value: chainId },
  ]);
  const venueTokenSignature = EthCrypto.sign(signerPk, venueTokenMessage);

  const promoterTokenMessage = EthCrypto.hash.keccak256([
    { type: 'string', value: promoterTokenMetadata.name },
    { type: 'string', value: promoterTokenMetadata.symbol },
    { type: 'string', value: promoterTokenMetadata.uri },
    { type: 'uint256', value: chainId },
  ]);
  const promoterTokenSignature = EthCrypto.sign(signerPk, promoterTokenMessage);

  const factory = await ethers.getContractAt('Factory', factoryAddress);

  const tx1 = await factory.connect(admin).produceCreditToken(
    {
      name: venueTokenMetadata.name,
      symbol: venueTokenMetadata.symbol,
      defaultAdmin: admin.address,
      manager: manager,
      minter: minter,
      burner: burner,
      uri: venueTokenMetadata.uri,
      transferable: transferableVenue,
    },
    venueTokenSignature,
  );
  await tx1.wait(1);

  const tx2 = await factory.connect(admin).produceCreditToken(
    {
      name: promoterTokenMetadata.name,
      symbol: promoterTokenMetadata.symbol,
      defaultAdmin: admin.address,
      manager: manager,
      minter: minter,
      burner: burner,
      uri: promoterTokenMetadata.uri,
      transferable: transferablePromoter,
    },
    promoterTokenSignature,
  );
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

export async function deployBelongCheckIn(
  signatureVerifier: string,
  helper: string,
  owner: string,
  paymentsInfo: BelongCheckIn.PaymentsInfoStruct,
): Promise<BelongCheckIn> {
  const BelongCheckIn: ContractFactory = await ethers.getContractFactory('BelongCheckIn', {
    libraries: { SignatureVerifier: signatureVerifier, Helper: helper },
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

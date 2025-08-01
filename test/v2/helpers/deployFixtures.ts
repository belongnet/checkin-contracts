import { BigNumberish, BigNumber as BN, BytesLike, ContractFactory } from 'ethers';
import {
  AccessToken,
  CreditToken,
  Factory,
  Helper,
  LONG,
  MockTransferValidatorV2,
  RoyaltiesReceiverV2,
  SignatureVerifier,
  Staking,
  WETHMock,
} from '../../../typechain-types';
import { ethers, upgrades } from 'hardhat';
import EthCrypto from 'eth-crypto';
import BigNumber from 'bn.js';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { AccessTokenInfoStruct } from '../../../typechain-types/contracts/v2/platform/Factory';

export type TokenMetadata = { name: string; symbol: string; uri: string };

export async function deploySignatureVerifier(): Promise<SignatureVerifier> {
  const SignatureVerifier: ContractFactory = await ethers.getContractFactory('SignatureVerifier');
  const signatureVerifier: SignatureVerifier = (await SignatureVerifier.deploy()) as SignatureVerifier;
  await signatureVerifier.deployed();
  return signatureVerifier;
}

export async function deployHelper(): Promise<Helper> {
  const Helper: ContractFactory = await ethers.getContractFactory('Helper');
  const helper: Helper = (await Helper.deploy()) as Helper;
  await helper.deployed();
  return helper;
}

export async function deployWETHMock(): Promise<WETHMock> {
  const WETHMock: ContractFactory = await ethers.getContractFactory('WETHMock');
  const wethMock: WETHMock = (await WETHMock.deploy()) as WETHMock;
  await wethMock.deployed();
  return wethMock;
}

export async function deployMockTransferValidatorV2(): Promise<MockTransferValidatorV2> {
  const MockTransferValidatorV2: ContractFactory = await ethers.getContractFactory('MockTransferValidatorV2');
  const mockTransferValidatorV2: MockTransferValidatorV2 = (await MockTransferValidatorV2.deploy(
    true,
  )) as MockTransferValidatorV2;
  await mockTransferValidatorV2.deployed();
  return mockTransferValidatorV2;
}

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
  feeCollector: string,
  signer: string,
  signatureVerifier: string,
  validator: string,
  implementations: Factory.ImplementationsStruct,
  factoryParams?: Factory.FactoryParametersStruct,
  commissionInBps: BigNumberish = 100,
  defaultPaymentToken: string = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
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
      feeCollector,
      signer,
      commissionInBps,
      defaultPaymentToken,
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
  chainId: string | Number | BigNumber = 31337,
): Promise<{ accessToken: AccessToken; royaltiesReceiver: RoyaltiesReceiverV2 }> {
  const message = EthCrypto.hash.keccak256([
    { type: 'string', value: tokenMetadata.name },
    { type: 'string', value: tokenMetadata.symbol },
    { type: 'string', value: tokenMetadata.uri },
    { type: 'uint96' as any, value: 600 },
    { type: 'uint256', value: chainId },
  ]);
  const signature = EthCrypto.sign(signer.privateKey, message);

  const instanceInfo: AccessTokenInfoStruct = {
    name: tokenMetadata.name,
    symbol: tokenMetadata.symbol,
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

  const getNftInstanceInfo = await factoryContract.getNftInstanceInfo(tokenMetadata.name, tokenMetadata.symbol);

  return {
    accessToken: await ethers.getContractAt('AccessToken', getNftInstanceInfo.accessToken),
    royaltiesReceiver: await ethers.getContractAt('RoyaltiesReceiverV2', getNftInstanceInfo.royaltiesReceiver),
  };
}

export async function deployCreditTokens(
  factory: Factory,
  signer: {
    privateKey: string;
    publicKey: string;
    address: string;
  },
  admin: SignerWithAddress,
  manager: SignerWithAddress = admin,
  minter: SignerWithAddress = admin,
  burner: SignerWithAddress = admin,
  chainId: string | Number | BigNumber = 31337,
  venueTokenMetadata: TokenMetadata = {
    name: 'VenueToken',
    symbol: 'VNE',
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
  const venueTokenMessage = EthCrypto.hash.keccak256([
    { type: 'string', value: venueTokenMetadata.name },
    { type: 'string', value: venueTokenMetadata.symbol },
    { type: 'string', value: venueTokenMetadata.uri },
    { type: 'uint256', value: chainId },
  ]);
  const venueTokenSignature = EthCrypto.sign(signer.privateKey, venueTokenMessage);

  const promoterTokenMessage = EthCrypto.hash.keccak256([
    { type: 'string', value: promoterTokenMetadata.name },
    { type: 'string', value: promoterTokenMetadata.symbol },
    { type: 'string', value: promoterTokenMetadata.uri },
    { type: 'uint256', value: chainId },
  ]);
  const promoterTokenSignature = EthCrypto.sign(signer.privateKey, promoterTokenMessage);

  await factory.connect(admin).produceCreditToken(
    {
      name: venueTokenMetadata.name,
      symbol: venueTokenMetadata.symbol,
      defaultAdmin: admin.address,
      manager: manager.address,
      minter: minter.address,
      burner: burner.address,
      uri: venueTokenMetadata.uri,
      transferable: true,
    },
    venueTokenSignature,
  );

  await factory.connect(admin).produceCreditToken(
    {
      name: promoterTokenMetadata.name,
      symbol: promoterTokenMetadata.symbol,
      defaultAdmin: admin.address,
      manager: manager.address,
      minter: minter.address,
      burner: burner.address,
      uri: promoterTokenMetadata.uri,
      transferable: true,
    },
    promoterTokenSignature,
  );

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

export async function deployLONG(admin: string, pauser: string, minter: string, burner: string): Promise<LONG> {
  const LONG: ContractFactory = await ethers.getContractFactory('LONG');
  const long: LONG = (await LONG.deploy(admin, pauser, minter, burner)) as LONG;
  await long.deployed();
  return long;
}

export async function deployStaking(owner: string, treasury: string, long: string): Promise<Staking> {
  const Staking: ContractFactory = await ethers.getContractFactory('Staking');
  const staking: Staking = (await Staking.deploy(owner, treasury, long)) as Staking;
  await staking.deployed();
  return staking;
}

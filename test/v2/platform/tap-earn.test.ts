import { ethers, upgrades } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { ContractFactory } from 'ethers';
import EthCrypto from 'eth-crypto';
import {
  AccessToken,
  CreditToken,
  Factory,
  Helper,
  LONG,
  MockTransferValidator,
  RoyaltiesReceiverV2,
  SignatureVerifier,
  Staking,
} from '../../../typechain-types';
import { getPercentage } from '../helpers/getPercentage';

describe.skip('TapAndEarn', () => {
  const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const chainId = 31337;

  async function fixture() {
    const [admin, pauser, minter, burner, user1, user2] = await ethers.getSigners();
    const signer = EthCrypto.createIdentity();

    const SignatureVerifier: ContractFactory = await ethers.getContractFactory('SignatureVerifier');
    const signatureVerifier: SignatureVerifier = (await SignatureVerifier.deploy()) as SignatureVerifier;
    await signatureVerifier.deployed();

    const Helper: ContractFactory = await ethers.getContractFactory('Helper');
    const helper: Helper = (await Helper.deploy()) as Helper;
    await helper.deployed();

    const Validator: ContractFactory = await ethers.getContractFactory('MockTransferValidatorV2');
    const validator: MockTransferValidator = (await Validator.deploy(true)) as MockTransferValidator;
    await validator.deployed();

    const AccessToken: ContractFactory = await ethers.getContractFactory('AccessToken', {
      libraries: { SignatureVerifier: signatureVerifier.address },
    });
    const accessToken: AccessToken = (await AccessToken.deploy()) as AccessToken;
    await accessToken.deployed();

    const RRImplementation: ContractFactory = await ethers.getContractFactory('RoyaltiesReceiverV2');
    const rr: RoyaltiesReceiverV2 = (await RRImplementation.deploy()) as RoyaltiesReceiverV2;
    await rr.deployed();

    const CreditToken: ContractFactory = await ethers.getContractFactory('CreditToken');
    const creditToken: CreditToken = (await CreditToken.deploy()) as CreditToken;
    await creditToken.deployed();

    const Factory: ContractFactory = await ethers.getContractFactory('Factory', {
      libraries: { SignatureVerifier: signatureVerifier.address },
    });
    const factory: Factory = (await upgrades.deployProxy(
      Factory,
      [
        {
          transferValidator: validator.address,
          feeCollector: admin.address,
          signer: signer.address,
          commissionInBps: '10',
          defaultPaymentToken: ETH_ADDRESS,
          maxArraySize: 10,
        },
        {
          accessToken: accessToken.address,
          creditToken: creditToken.address,
          royaltiesReceiver: rr.address,
        },
        {
          amountToCreator: 8000,
          amountToPlatform: 2000,
        },
        [0, 5000, 3000, 1500, 500],
      ],
      {
        unsafeAllow: ['constructor'],
        unsafeAllowLinkedLibraries: true,
      },
    )) as Factory;
    await factory.deployed();

    const LONG: ContractFactory = await ethers.getContractFactory('LONG');
    const long: LONG = (await LONG.deploy(admin.address, pauser.address, minter.address, burner.address)) as LONG;
    await long.deployed();

    const Staking: ContractFactory = await ethers.getContractFactory('Staking');
    const staking: Staking = (await Staking.deploy(admin.address, admin.address, long.address)) as Staking;
    await staking.deployed();

    const { promoterToken, venueToken } = await deployCreditTokens();

    return {
      admin,
      pauser,
      minter,
      burner,
      user1,
      user2,
      signer,
      signatureVerifier,
      helper,
      factory,
      long,
      staking,
      promoterToken,
      venueToken,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { staking, long, admin } = await loadFixture(fixture);
    });
  });

  async function deployCreditTokens(): Promise<{ venueToken: CreditToken; promoterToken: CreditToken }> {
    const { factory, admin, signer } = await loadFixture(fixture);

    const venueTokenName = 'VenueToken';
    const venueTokenSymbol = 'VNE';
    const venueTokenUri = 'contractURI/VenueToken';
    const venueTokenMessage = EthCrypto.hash.keccak256([
      { type: 'string', value: venueTokenName },
      { type: 'string', value: venueTokenSymbol },
      { type: 'string', value: venueTokenUri },
      { type: 'uint256', value: chainId },
    ]);
    const venueTokenSignature = EthCrypto.sign(signer.privateKey, venueTokenMessage);

    const promoterTokenName = 'PromoterToken';
    const promoterTokenSymbol = 'PMT';
    const promoterTokenUri = 'contractURI/PromoterToken';
    const promoterTokenMessage = EthCrypto.hash.keccak256([
      { type: 'string', value: promoterTokenName },
      { type: 'string', value: promoterTokenSymbol },
      { type: 'string', value: promoterTokenUri },
      { type: 'uint256', value: chainId },
    ]);
    const promoterTokenSignature = EthCrypto.sign(signer.privateKey, promoterTokenMessage);

    await factory.connect(admin).produceCreditToken(
      {
        name: venueTokenName,
        symbol: venueTokenSymbol,
        defaultAdmin: admin.address,
        manager: admin.address,
        minter: admin.address,
        burner: admin.address,
        uri: venueTokenUri,
        transferable: true,
      },
      venueTokenSignature,
    );

    const venueTokenInstanceInfo = await factory.getCreditTokenInstanceInfo(venueTokenName, venueTokenSymbol);
    const venueToken: CreditToken = await ethers.getContractAt('CreditToken', venueTokenInstanceInfo.creditToken);

    await factory.connect(admin).produceCreditToken(
      {
        name: promoterTokenName,
        symbol: promoterTokenSymbol,
        defaultAdmin: admin.address,
        manager: admin.address,
        minter: admin.address,
        burner: admin.address,
        uri: promoterTokenUri,
        transferable: true,
      },
      promoterTokenSignature,
    );

    const promoterTokenInstanceInfo = await factory.getCreditTokenInstanceInfo(promoterTokenName, promoterTokenSymbol);
    const promoterToken: CreditToken = await ethers.getContractAt('CreditToken', promoterTokenInstanceInfo.creditToken);
    return { venueToken, promoterToken };
  }
});

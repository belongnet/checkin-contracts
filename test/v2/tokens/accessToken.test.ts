import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import EthCrypto from 'eth-crypto';
import { BigNumber, BigNumberish } from 'ethers';
import { ethers } from 'hardhat';

import {
  deployAccessToken,
  deployAccessTokenImplementation,
  deployCreditTokenImplementation,
  deployFactory,
  deployRoyaltiesReceiverV2Implementation,
  deployVestingWalletImplementation,
  TokenMetadata,
} from '../../../helpers/deployFixtures';
import { deploySignatureVerifier } from '../../../helpers/deployLibraries';
import { deployMockTransferValidatorV2, deployWETHMock } from '../../../helpers/deployMockFixtures';
import { calculatePlatformFee } from '../../../helpers/math';
import { buildDynamicProtection, buildStaticProtection } from '../../../helpers/signature';
import {
  AccessToken,
  Factory,
  MockTransferValidatorV2,
  RoyaltiesReceiverV2,
  SignatureVerifier,
  WETHMock,
} from '../../../typechain-types';
import { AccessTokenInfoStruct } from '../../../typechain-types/contracts/v2/platform/Factory';
import {
  DynamicPriceParametersStruct,
  StaticPriceParametersStruct,
} from '../../../typechain-types/contracts/v2/tokens/AccessToken';

const NATIVE_CURRENCY_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
const PLATFORM_COMMISSION = 100;
const NFT_721_BASE_URI = 'test.com/';
const BPS_DENOMINATOR = BigNumber.from('10000');

const INTERFACE_ID_ERC2981 = '0x2a55205a';
const INTERFACE_ID_ERC4906 = '0x49064906';
const INTERFACE_ID_CREATOR_TOKEN = '0xad0d7f6c';
const INTERFACE_ID_LEGACY_CREATOR_TOKEN = '0xa07d229a';

const AccessTokenEthMetadata: TokenMetadata = {
  name: 'AccessTokenEth',
  symbol: 'ATE',
  uri: 'contractURI/AccessTokenEth',
};

const AccessTokenTokenMetadata: TokenMetadata = {
  name: 'AccessTokenToken',
  symbol: 'ATT',
  uri: 'contractURI/AccessTokenToken',
};

const ethPurchasePrice = ethers.utils.parseEther('0.03');
const tokenPurchasePrice = BigNumber.from(10_000);

let factoryParams: Factory.FactoryParametersStruct;
let implementations: Factory.ImplementationsStruct;
const referralPercentages = [0, 5000, 3000, 1500, 500];
const royalties: Factory.RoyaltiesParametersStruct = {
  amountToCreator: 8000,
  amountToPlatform: 2000,
};
let metadataNonce = 1;

function nextMetadata(prefix: string): TokenMetadata {
  metadataNonce += 1;
  return {
    name: `${prefix}-${metadataNonce}`,
    symbol: `${prefix.slice(0, 3).toUpperCase()}${metadataNonce}`,
    uri: `${NFT_721_BASE_URI}${prefix}-${metadataNonce}`,
  };
}

function buildStaticParams(
  tokenId: number,
  overrides: Partial<StaticPriceParametersStruct> = {},
): StaticPriceParametersStruct {
  return {
    tokenId,
    tokenUri: overrides.tokenUri ?? `${NFT_721_BASE_URI}${tokenId}`,
    whitelisted: overrides.whitelisted ?? false,
  };
}

function buildDynamicParams(
  tokenId: number,
  price: BigNumberish,
  tokenUri: string = `${NFT_721_BASE_URI}${tokenId}`,
): DynamicPriceParametersStruct {
  return { tokenId, price, tokenUri };
}

function cloneFactoryParams(overrides: Partial<Factory.FactoryParametersStruct> = {}): Factory.FactoryParametersStruct {
  return { ...factoryParams, ...overrides };
}

describe.only('AccessToken', () => {
  async function fixture() {
    const [owner, creator, referral, charlie, pete] = await ethers.getSigners();
    const signer = EthCrypto.createIdentity();

    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();
    const erc20Example: WETHMock = await deployWETHMock();
    const validator: MockTransferValidatorV2 = await deployMockTransferValidatorV2();
    const accessTokenImplementation: AccessToken = await deployAccessTokenImplementation(signatureVerifier.address);
    const royaltiesReceiverV2Implementation: RoyaltiesReceiverV2 = await deployRoyaltiesReceiverV2Implementation();
    const creditTokenImplementation = await deployCreditTokenImplementation();
    const vestingWalletImplementation = await deployVestingWalletImplementation();

    implementations = {
      accessToken: accessTokenImplementation.address,
      creditToken: creditTokenImplementation.address,
      royaltiesReceiver: royaltiesReceiverV2Implementation.address,
      vestingWallet: vestingWalletImplementation.address,
    };

    factoryParams = {
      transferValidator: validator.address,
      platformAddress: owner.address,
      signerAddress: signer.address,
      platformCommission: PLATFORM_COMMISSION,
      defaultPaymentCurrency: NATIVE_CURRENCY_ADDRESS,
      maxArraySize: 10,
    };

    const factory: Factory = await deployFactory(
      owner.address,
      signer.address,
      signatureVerifier.address,
      validator.address,
      implementations,
    );

    await factory.connect(referral).createReferralCode();
    const referralCode = await factory.getReferralCodeByCreator(referral.address);

    const { accessToken: accessTokenEth, royaltiesReceiver: royaltiesReceiverEth } = await deployAccessToken(
      { ...AccessTokenEthMetadata },
      ethPurchasePrice,
      ethPurchasePrice.div(2),
      signer,
      creator,
      factory,
      referralCode,
    );

    const { accessToken: accessTokenERC20, royaltiesReceiver: royaltiesReceiverERC20 } = await deployAccessToken(
      { ...AccessTokenTokenMetadata },
      tokenPurchasePrice,
      tokenPurchasePrice.div(2),
      signer,
      creator,
      factory,
      referralCode,
      erc20Example.address,
    );

    return {
      owner,
      creator,
      referral,
      charlie,
      pete,
      signer,
      signatureVerifier,
      erc20Example,
      validator,
      factory,
      referralCode,
      accessTokenEth,
      accessTokenERC20,
      royaltiesReceiverEth,
      royaltiesReceiverERC20,
    };
  }

  beforeEach(() => {
    metadataNonce = 1;
  });

  describe('Deployment & initialization', () => {
    it('exposes initialization parameters and interfaces', async () => {
      const { factory, validator, accessTokenEth, royaltiesReceiverEth, creator, referralCode } =
        await loadFixture(fixture);

      const params = await accessTokenEth.parameters();

      expect(params.factory).to.eq(factory.address);
      expect(params.feeReceiver).to.eq(royaltiesReceiverEth.address);
      expect(params.referralCode).to.eq(referralCode);
      expect(params.info.metadata.name).to.eq(AccessTokenEthMetadata.name);
      expect(params.info.metadata.symbol).to.eq(AccessTokenEthMetadata.symbol);
      expect(params.info.contractURI).to.eq(AccessTokenEthMetadata.uri);
      expect(params.info.paymentToken).to.eq(NATIVE_CURRENCY_ADDRESS);
      expect(params.info.mintPrice).to.eq(ethPurchasePrice);
      expect(params.info.whitelistMintPrice).to.eq(ethPurchasePrice.div(2));
      expect(params.info.maxTotalSupply).to.eq(BigNumber.from(10));
      expect(params.info.transferable).to.be.true;
      expect(params.info.creator).to.eq(creator.address);

      expect(await accessTokenEth.name()).to.eq(AccessTokenEthMetadata.name);
      expect(await accessTokenEth.symbol()).to.eq(AccessTokenEthMetadata.symbol);
      expect(await accessTokenEth.contractURI()).to.eq(AccessTokenEthMetadata.uri);
      expect(await accessTokenEth.totalSupply()).to.eq(0);
      expect(await accessTokenEth.getTransferValidator()).to.eq(validator.address);

      expect(await accessTokenEth.supportsInterface(INTERFACE_ID_ERC2981)).to.be.true;
      expect(await accessTokenEth.supportsInterface(INTERFACE_ID_ERC4906)).to.be.true;
      expect(await accessTokenEth.supportsInterface(INTERFACE_ID_CREATOR_TOKEN)).to.be.true;
      expect(await accessTokenEth.supportsInterface(INTERFACE_ID_LEGACY_CREATOR_TOKEN)).to.be.true;

      const [selector, isView] = await accessTokenEth.getTransferValidationFunction();
      expect(selector).to.eq('0xcaee23ea');
      expect(isView).to.be.true;

      expect(await accessTokenEth.selfImplementation()).to.eq(implementations.accessToken);

      const salePrice = BigNumber.from(1000);
      const [receiver, royaltyAmount] = await accessTokenEth.royaltyInfo(0, salePrice);
      expect(receiver).to.eq(royaltiesReceiverEth.address);
      expect(royaltyAmount).to.eq(salePrice.mul(600).div(BPS_DENOMINATOR));
    });

    it('reverts when initialized twice', async () => {
      const { accessTokenEth, royaltiesReceiverEth, factory, validator, creator } = await loadFixture(fixture);

      const params = await accessTokenEth.parameters();

      await expect(
        accessTokenEth.initialize(
          {
            factory: params.factory,
            feeReceiver: params.feeReceiver,
            referralCode: params.referralCode,
            info: params.info as AccessTokenInfoStruct,
          },
          validator.address,
        ),
      ).to.be.revertedWithCustomError(accessTokenEth, 'InvalidInitialization');

      const globalParams = await factory.nftFactoryParameters();
      await expect(
        royaltiesReceiverEth.initialize(
          {
            creator: creator.address,
            platform: globalParams.platformAddress,
            referral: creator.address,
          },
          factory.address,
          params.referralCode,
        ),
      ).to.be.revertedWithCustomError(royaltiesReceiverEth, 'InvalidInitialization');
    });
  });

  describe('Admin', () => {
    it('owner can update payment configuration and auto-approve validator', async () => {
      const { accessTokenEth, creator, validator, erc20Example } = await loadFixture(fixture);

      const newMintPrice = ethers.utils.parseEther('0.05');
      const newWhitelistPrice = ethers.utils.parseEther('0.02');

      await expect(
        accessTokenEth.connect(creator).setNftParameters(erc20Example.address, newMintPrice, newWhitelistPrice, true),
      )
        .to.emit(accessTokenEth, 'NftParametersChanged')
        .withArgs(erc20Example.address, newMintPrice, newWhitelistPrice, true);

      const params = await accessTokenEth.parameters();
      expect(params.info.paymentToken).to.eq(erc20Example.address);
      expect(params.info.mintPrice).to.eq(newMintPrice);
      expect(params.info.whitelistMintPrice).to.eq(newWhitelistPrice);
      expect(await accessTokenEth.isApprovedForAll(creator.address, validator.address)).to.be.true;
    });

    it('non-owner cannot change parameters', async () => {
      const { accessTokenEth, owner } = await loadFixture(fixture);

      await expect(
        accessTokenEth
          .connect(owner)
          .setNftParameters(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, ethPurchasePrice, false),
      ).to.be.revertedWithCustomError(accessTokenEth, 'Unauthorized');
    });
  });

  describe('tokenURI', () => {
    it('reverts when querying a non-existent token', async () => {
      const { accessTokenEth } = await loadFixture(fixture);

      await expect(accessTokenEth.tokenURI(0)).to.be.revertedWithCustomError(accessTokenEth, 'TokenIdDoesNotExist');
    });
  });

  describe('mintStaticPrice', () => {
    it('mints via native currency and stores metadata', async () => {
      const { accessTokenEth, signer, charlie } = await loadFixture(fixture);

      const params = buildStaticParams(0);
      const protection = await buildStaticProtection(
        accessTokenEth.address,
        signer.privateKey,
        charlie.address,
        params,
      );

      const tx = await accessTokenEth
        .connect(charlie)
        .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, [charlie.address], [params], [protection], {
          value: ethPurchasePrice,
        });

      await expect(tx)
        .to.emit(accessTokenEth, 'Paid')
        .withArgs(charlie.address, NATIVE_CURRENCY_ADDRESS, ethPurchasePrice);

      expect(await accessTokenEth.ownerOf(params.tokenId)).to.eq(charlie.address);
      expect(await accessTokenEth.totalSupply()).to.eq(1);
      expect(await accessTokenEth.tokenURI(params.tokenId)).to.eq(params.tokenUri);
    });

    it('mints with whitelist pricing when signature marks receiver as eligible', async () => {
      const { accessTokenEth, signer, pete } = await loadFixture(fixture);

      const params = buildStaticParams(1, { whitelisted: true });
      const protection = await buildStaticProtection(accessTokenEth.address, signer.privateKey, pete.address, params);
      const discountedPrice = ethPurchasePrice.div(2);

      await accessTokenEth
        .connect(pete)
        .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, discountedPrice, [pete.address], [params], [protection], {
          value: discountedPrice,
        });

      expect(await accessTokenEth.ownerOf(params.tokenId)).to.eq(pete.address);
    });

    it('reverts when expected payment token mismatches configuration', async () => {
      const { accessTokenEth, signer, charlie, erc20Example } = await loadFixture(fixture);

      const params = buildStaticParams(2);
      const protection = await buildStaticProtection(
        accessTokenEth.address,
        signer.privateKey,
        charlie.address,
        params,
      );

      await expect(
        accessTokenEth
          .connect(charlie)
          .mintStaticPrice(erc20Example.address, ethPurchasePrice, [charlie.address], [params], [protection], {
            value: ethPurchasePrice,
          }),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'TokenChanged')
        .withArgs(erc20Example.address);
    });

    it('reverts when the native value is incorrect', async () => {
      const { accessTokenEth, signer, charlie } = await loadFixture(fixture);

      const params = buildStaticParams(3);
      const protection = await buildStaticProtection(
        accessTokenEth.address,
        signer.privateKey,
        charlie.address,
        params,
      );
      const wrongValue = ethPurchasePrice.sub(1);

      await expect(
        accessTokenEth
          .connect(charlie)
          .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, [charlie.address], [params], [protection], {
            value: wrongValue,
          }),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'IncorrectNativeCurrencyAmountSent')
        .withArgs(wrongValue);
    });

    it('reverts when the expected mint price does not match the effective price', async () => {
      const { accessTokenEth, signer, charlie } = await loadFixture(fixture);

      const params = buildStaticParams(4);
      const protection = await buildStaticProtection(
        accessTokenEth.address,
        signer.privateKey,
        charlie.address,
        params,
      );
      const wrongExpectedPrice = ethPurchasePrice.add(1);

      await expect(
        accessTokenEth
          .connect(charlie)
          .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, wrongExpectedPrice, [charlie.address], [params], [protection], {
            value: ethPurchasePrice,
          }),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'PriceChanged')
        .withArgs(wrongExpectedPrice);
    });

    it('reverts when array lengths differ or exceed the factory limit', async () => {
      const { accessTokenEth, signer, charlie, creator, factory } = await loadFixture(fixture);

      const params = buildStaticParams(5);
      const protection = await buildStaticProtection(
        accessTokenEth.address,
        signer.privateKey,
        charlie.address,
        params,
      );

      await expect(
        accessTokenEth
          .connect(charlie)
          .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, [charlie.address], [], [protection], {
            value: ethPurchasePrice,
          }),
      ).to.be.revertedWithCustomError(accessTokenEth, 'WrongArraySize');

      const updatedParams = cloneFactoryParams({ maxArraySize: 1 });
      await factory.setFactoryParameters(updatedParams, royalties, implementations, referralPercentages);

      const batchParams = [buildStaticParams(6), buildStaticParams(7)];
      const protections = await Promise.all(
        batchParams.map(entry =>
          buildStaticProtection(accessTokenEth.address, signer.privateKey, creator.address, entry),
        ),
      );

      await expect(
        accessTokenEth
          .connect(creator)
          .mintStaticPrice(
            NATIVE_CURRENCY_ADDRESS,
            ethPurchasePrice.mul(batchParams.length),
            [creator.address, creator.address],
            batchParams,
            protections,
            { value: ethPurchasePrice.mul(batchParams.length) },
          ),
      ).to.be.revertedWithCustomError(accessTokenEth, 'WrongArraySize');
    });

    it('reverts when the signature payload does not match the receiver', async () => {
      const { accessTokenEth, signer, charlie, signatureVerifier, creator } = await loadFixture(fixture);

      const params = buildStaticParams(8);
      const protection = await buildStaticProtection(
        accessTokenEth.address,
        signer.privateKey,
        charlie.address,
        params,
      );

      await expect(
        accessTokenEth
          .connect(creator)
          .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, [creator.address], [params], [protection], {
            value: ethPurchasePrice,
          }),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');
    });

    it('reverts when minting exceeds the collection supply', async () => {
      const { factory, signer, creator } = await loadFixture(fixture);

      const limitedMetadata = nextMetadata('Limited');
      const { accessToken } = await deployAccessToken(
        limitedMetadata,
        ethPurchasePrice,
        ethPurchasePrice,
        signer,
        creator,
        factory,
        ethers.constants.HashZero,
        NATIVE_CURRENCY_ADDRESS,
        true,
        1,
      );

      const first = buildStaticParams(9);
      const firstProtection = await buildStaticProtection(
        accessToken.address,
        signer.privateKey,
        creator.address,
        first,
      );

      await accessToken
        .connect(creator)
        .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, [creator.address], [first], [firstProtection], {
          value: ethPurchasePrice,
        });

      const second = buildStaticParams(10);
      const secondProtection = await buildStaticProtection(
        accessToken.address,
        signer.privateKey,
        creator.address,
        second,
      );

      await expect(
        accessToken
          .connect(creator)
          .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, [creator.address], [second], [secondProtection], {
            value: ethPurchasePrice,
          }),
      ).to.be.revertedWithCustomError(accessToken, 'TotalSupplyLimitReached');
    });
  });

  describe('mintDynamicPrice', () => {
    it('mints multiple tokens via ERC20 dynamic pricing', async () => {
      const { accessTokenERC20, erc20Example, signer, charlie } = await loadFixture(fixture);

      await erc20Example.connect(charlie).mint(charlie.address, tokenPurchasePrice.mul(2));
      await erc20Example.connect(charlie).approve(accessTokenERC20.address, tokenPurchasePrice.mul(2));

      const params = [
        buildDynamicParams(20, tokenPurchasePrice.div(2), `${NFT_721_BASE_URI}20`),
        buildDynamicParams(21, tokenPurchasePrice.div(2), `${NFT_721_BASE_URI}21`),
      ];
      const protections = await Promise.all(
        params.map(param =>
          buildDynamicProtection(accessTokenERC20.address, signer.privateKey, charlie.address, param),
        ),
      );

      const tx = await accessTokenERC20
        .connect(charlie)
        .mintDynamicPrice(erc20Example.address, [charlie.address, charlie.address], params, protections);

      await expect(tx)
        .to.emit(accessTokenERC20, 'Paid')
        .withArgs(charlie.address, erc20Example.address, tokenPurchasePrice);

      expect(await accessTokenERC20.balanceOf(charlie.address)).to.eq(2);
      expect(await accessTokenERC20.tokenURI(20)).to.eq(params[0].tokenUri);
      expect(await accessTokenERC20.tokenURI(21)).to.eq(params[1].tokenUri);
    });

    it('reverts when ETH amount does not match dynamic price', async () => {
      const { accessTokenEth, signer, charlie } = await loadFixture(fixture);

      const params = [buildDynamicParams(30, ethPurchasePrice)];
      const protections = [
        await buildDynamicProtection(accessTokenEth.address, signer.privateKey, charlie.address, params[0]),
      ];
      const wrongValue = ethPurchasePrice.sub(1);

      await expect(
        accessTokenEth
          .connect(charlie)
          .mintDynamicPrice(NATIVE_CURRENCY_ADDRESS, [charlie.address], params, protections, { value: wrongValue }),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'IncorrectNativeCurrencyAmountSent')
        .withArgs(wrongValue);
    });

    it('reverts when expected payment token changes', async () => {
      const { accessTokenEth, signer, charlie, erc20Example } = await loadFixture(fixture);

      const params = [buildDynamicParams(31, ethPurchasePrice)];
      const protections = [
        await buildDynamicProtection(accessTokenEth.address, signer.privateKey, charlie.address, params[0]),
      ];

      await expect(
        accessTokenEth
          .connect(charlie)
          .mintDynamicPrice(erc20Example.address, [charlie.address], params, protections, { value: ethPurchasePrice }),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'TokenChanged')
        .withArgs(erc20Example.address);
    });

    it('reverts when array constraints are violated', async () => {
      const { accessTokenEth, signer, creator, factory } = await loadFixture(fixture);

      const params = [buildDynamicParams(32, ethPurchasePrice)];
      const protections = [
        await buildDynamicProtection(accessTokenEth.address, signer.privateKey, creator.address, params[0]),
      ];

      await expect(
        accessTokenEth
          .connect(creator)
          .mintDynamicPrice(NATIVE_CURRENCY_ADDRESS, [], params, protections, { value: ethPurchasePrice }),
      ).to.be.revertedWithCustomError(accessTokenEth, 'WrongArraySize');

      const updatedParams = cloneFactoryParams({ maxArraySize: 1 });
      await factory.setFactoryParameters(updatedParams, royalties, implementations, referralPercentages);

      const batchParams = [
        buildDynamicParams(33, ethPurchasePrice.div(2)),
        buildDynamicParams(34, ethPurchasePrice.div(2)),
      ];
      const batchProtections = await Promise.all(
        batchParams.map(param =>
          buildDynamicProtection(accessTokenEth.address, signer.privateKey, creator.address, param),
        ),
      );

      await expect(
        accessTokenEth
          .connect(creator)
          .mintDynamicPrice(
            NATIVE_CURRENCY_ADDRESS,
            [creator.address, creator.address],
            batchParams,
            batchProtections,
            { value: ethPurchasePrice },
          ),
      ).to.be.revertedWithCustomError(accessTokenEth, 'WrongArraySize');
    });

    it('reverts when dynamic signature payload is invalid', async () => {
      const { accessTokenEth, signer, charlie, signatureVerifier, creator } = await loadFixture(fixture);

      const params = [buildDynamicParams(35, ethPurchasePrice)];
      const protections = [
        await buildDynamicProtection(accessTokenEth.address, signer.privateKey, charlie.address, params[0]),
      ];

      await expect(
        accessTokenEth
          .connect(creator)
          .mintDynamicPrice(NATIVE_CURRENCY_ADDRESS, [creator.address], params, protections, {
            value: ethPurchasePrice,
          }),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');
    });
  });

  describe('Payments', () => {
    it('routes ETH payments between platform, referral and creator', async () => {
      const { accessTokenEth, signer, charlie, owner, referral, creator, factory, referralCode } =
        await loadFixture(fixture);

      const params = buildStaticParams(40);
      const protection = await buildStaticProtection(
        accessTokenEth.address,
        signer.privateKey,
        charlie.address,
        params,
      );

      const startPlatform = await owner.getBalance();
      const startReferral = await referral.getBalance();
      const startCreator = await creator.getBalance();

      await accessTokenEth
        .connect(charlie)
        .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, [charlie.address], [params], [protection], {
          value: ethPurchasePrice,
        });

      const factoryParamsOnChain = await factory.nftFactoryParameters();
      const fullFees = calculatePlatformFee(ethPurchasePrice, factoryParamsOnChain.platformCommission, BPS_DENOMINATOR);
      const referralShare = await factory.getReferralRate(creator.address, referralCode, fullFees);
      const platformShare = fullFees.sub(referralShare);
      const creatorShare = ethPurchasePrice.sub(fullFees);

      expect(await owner.getBalance()).to.eq(startPlatform.add(platformShare));
      expect(await referral.getBalance()).to.eq(startReferral.add(referralShare));
      expect(await creator.getBalance()).to.eq(startCreator.add(creatorShare));
    });

    it('routes ERC20 payments between platform, referral and creator', async () => {
      const { accessTokenERC20, erc20Example, signer, charlie, owner, referral, creator, factory, referralCode } =
        await loadFixture(fixture);

      await erc20Example.connect(charlie).mint(charlie.address, tokenPurchasePrice);
      await erc20Example.connect(charlie).approve(accessTokenERC20.address, tokenPurchasePrice);

      const params = buildStaticParams(41);
      const protection = await buildStaticProtection(
        accessTokenERC20.address,
        signer.privateKey,
        charlie.address,
        params,
      );

      const startPlatform = await erc20Example.balanceOf(owner.address);
      console.log('startPlatform', startPlatform.toString());
      console.log('startPlatform', startPlatform.toString());
      const startReferral = await erc20Example.balanceOf(referral.address);
      const startCreator = await erc20Example.balanceOf(creator.address);

      await accessTokenERC20
        .connect(charlie)
        .mintStaticPrice(erc20Example.address, tokenPurchasePrice, [charlie.address], [params], [protection]);

      const factoryParamsOnChain = await factory.nftFactoryParameters();
      const fullFees = calculatePlatformFee(
        tokenPurchasePrice,
        factoryParamsOnChain.platformCommission,
        BPS_DENOMINATOR,
      );
      const referralShare = await factory.getReferralRate(creator.address, referralCode, fullFees);
      const platformShare = fullFees.sub(referralShare);
      const creatorShare = tokenPurchasePrice.sub(fullFees);

      expect(await erc20Example.balanceOf(owner.address)).to.eq(startPlatform.add(platformShare));
      expect(await erc20Example.balanceOf(referral.address)).to.eq(startReferral.add(referralShare));
      expect(await erc20Example.balanceOf(creator.address)).to.eq(startCreator.add(creatorShare));
    });

    it('rounds platform fees up for tiny ERC20 prices', async () => {
      const { factory, signer, creator, erc20Example, owner, charlie } = await loadFixture(fixture);

      const metadata = nextMetadata('Tiny');
      const tinyPrice = BigNumber.from(1);
      const { accessToken: tinyAccessToken } = await deployAccessToken(
        metadata,
        tinyPrice,
        tinyPrice,
        signer,
        creator,
        factory,
        ethers.constants.HashZero,
        erc20Example.address,
      );

      await erc20Example.connect(charlie).mint(charlie.address, tinyPrice);
      await erc20Example.connect(charlie).approve(tinyAccessToken.address, tinyPrice);

      const params = buildStaticParams(42);
      const protection = await buildStaticProtection(
        tinyAccessToken.address,
        signer.privateKey,
        creator.address,
        params,
      );

      const startPlatform = await erc20Example.balanceOf(owner.address);
      const startCreator = await erc20Example.balanceOf(creator.address);
      await tinyAccessToken
        .connect(charlie)
        .mintStaticPrice(erc20Example.address, tinyPrice, [creator.address], [params], [protection]);

      const factoryParamsOnChain = await factory.nftFactoryParameters();
      const expectedFee = calculatePlatformFee(tinyPrice, factoryParamsOnChain.platformCommission, BPS_DENOMINATOR);

      expect(await erc20Example.balanceOf(owner.address)).to.eq(startPlatform.add(expectedFee));
      expect(await erc20Example.balanceOf(creator.address)).to.eq(startCreator.add(tinyPrice.sub(expectedFee)));
    });
  });

  describe('Transfers and validator', () => {
    it('allows transfers when collection is transferable', async () => {
      const { accessTokenEth, signer, creator, referral } = await loadFixture(fixture);

      const params = buildStaticParams(50);
      const protection = await buildStaticProtection(
        accessTokenEth.address,
        signer.privateKey,
        creator.address,
        params,
      );

      await accessTokenEth
        .connect(creator)
        .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, [creator.address], [params], [protection], {
          value: ethPurchasePrice,
        });

      await accessTokenEth.connect(creator).transferFrom(creator.address, referral.address, params.tokenId);
      expect(await accessTokenEth.ownerOf(params.tokenId)).to.eq(referral.address);
    });

    it('enforces the transfer validator when it reverts', async () => {
      const { accessTokenEth, signer, creator, validator, referral } = await loadFixture(fixture);

      const params = buildStaticParams(51);
      const protection = await buildStaticProtection(
        accessTokenEth.address,
        signer.privateKey,
        creator.address,
        params,
      );

      await accessTokenEth
        .connect(creator)
        .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, [creator.address], [params], [protection], {
          value: ethPurchasePrice,
        });

      await validator.setSwitcher(false);

      await expect(
        accessTokenEth.connect(creator).transferFrom(creator.address, referral.address, params.tokenId),
      ).to.be.revertedWith('MockTransferValidator: always reverts');
    });

    it('blocks transfers when collection is non-transferable', async () => {
      const { factory, signer, creator, referral } = await loadFixture(fixture);

      const metadata = nextMetadata('NoTransfer');
      const { accessToken } = await deployAccessToken(
        metadata,
        ethPurchasePrice,
        ethPurchasePrice,
        signer,
        creator,
        factory,
        ethers.constants.HashZero,
        NATIVE_CURRENCY_ADDRESS,
        false,
      );

      const params = buildStaticParams(60);
      const protection = await buildStaticProtection(accessToken.address, signer.privateKey, creator.address, params);

      await accessToken
        .connect(creator)
        .mintStaticPrice(NATIVE_CURRENCY_ADDRESS, ethPurchasePrice, [creator.address], [params], [protection], {
          value: ethPurchasePrice,
        });

      await expect(
        accessToken.connect(creator).transferFrom(creator.address, referral.address, params.tokenId),
      ).to.be.revertedWithCustomError(accessToken, 'NotTransferable');
    });
  });
});

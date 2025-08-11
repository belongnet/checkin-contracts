import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber } from 'ethers';
import {
  WETHMock,
  Factory,
  RoyaltiesReceiverV2,
  AccessToken,
  CreditToken,
  SignatureVerifier,
  MockTransferValidatorV2,
} from '../../../typechain-types';
import { expect } from 'chai';
import EthCrypto from 'eth-crypto';
import {
  DynamicPriceParametersStruct,
  StaticPriceParametersStruct,
} from '../../../typechain-types/contracts/v2/tokens/AccessToken';
import { AccessTokenInfoStruct } from '../../../typechain-types/contracts/v2/platform/Factory';
import {
  deployAccessToken,
  deployAccessTokenImplementation,
  deployCreditTokenImplementation,
  deployFactory,
  deployRoyaltiesReceiverV2Implementation,
  TokenMetadata,
} from '../../../helpers/deployFixtures';
import { deploySignatureVerifier } from '../../../helpers/deployLibraries';
import { deployMockTransferValidatorV2, deployWETHMock } from '../../../helpers/deployMockFixtures';

describe('AccessToken', () => {
  const PLATFORM_COMISSION = '100';
  const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const chainId = 31337;
  const NFT_721_BASE_URI = 'test.com/';

  const AccessTokenEthMetadata = {
    name: 'AccessTokenEth',
    symbol: 'ATE',
    uri: 'contractURI/AccessTokenEth',
  } as TokenMetadata;
  const AccessTokenTokenMetadata = {
    name: 'AccessTokenToken',
    symbol: 'ATT',
    uri: 'contractURI/AccessTokenToken',
  } as TokenMetadata;
  const ethPurchasePrice = ethers.utils.parseEther('0.03');
  const tokenPurchasePrice = 10000;

  let instanceInfoETH: AccessTokenInfoStruct = {
    metadata: { name: AccessTokenEthMetadata.name, symbol: AccessTokenEthMetadata.symbol },
    contractURI: AccessTokenEthMetadata.uri,
    paymentToken: ETH_ADDRESS,
    mintPrice: ethPurchasePrice,
    whitelistMintPrice: ethPurchasePrice.div(2),
    transferable: true,
    maxTotalSupply: BigNumber.from('10'),
    feeNumerator: BigNumber.from('600'),
    collectionExpire: BigNumber.from('86400'),
    signature: '0x',
  };
  let instanceInfoToken: AccessTokenInfoStruct = {
    metadata: { name: AccessTokenTokenMetadata.name, symbol: AccessTokenTokenMetadata.symbol },
    contractURI: AccessTokenTokenMetadata.uri,
    paymentToken: '',
    mintPrice: tokenPurchasePrice,
    whitelistMintPrice: tokenPurchasePrice / 2,
    transferable: true,
    maxTotalSupply: BigNumber.from('10'),
    feeNumerator: BigNumber.from('600'),
    collectionExpire: BigNumber.from('86400'),
    signature: '0x',
  };

  let factoryParams: Factory.FactoryParametersStruct;
  let referralPercentages: number[];
  let royalties: Factory.RoyaltiesParametersStruct;
  let implementations: Factory.ImplementationsStruct;

  async function fixture() {
    const [owner, creator, referral, charlie, pete] = await ethers.getSigners();
    const signer = EthCrypto.createIdentity();

    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();
    const erc20Example: WETHMock = await deployWETHMock();
    const validator: MockTransferValidatorV2 = await deployMockTransferValidatorV2();
    const accessTokenImplementation: AccessToken = await deployAccessTokenImplementation(signatureVerifier.address);
    const royaltiesReceiverV2Implementation: RoyaltiesReceiverV2 = await deployRoyaltiesReceiverV2Implementation();
    const creditTokenImplementation: CreditToken = await deployCreditTokenImplementation();

    implementations = {
      accessToken: accessTokenImplementation.address,
      creditToken: creditTokenImplementation.address,
      royaltiesReceiver: royaltiesReceiverV2Implementation.address,
    };

    royalties = {
      amountToCreator: 8000,
      amountToPlatform: 2000,
    };

    factoryParams = {
      transferValidator: validator.address,
      platformAddress: owner.address,
      signerAddress: signer.address,
      platformCommission: PLATFORM_COMISSION,
      defaultPaymentCurrency: ETH_ADDRESS,
      maxArraySize: 10,
    };

    referralPercentages = [0, 5000, 3000, 1500, 500];

    const factory: Factory = await deployFactory(
      owner.address,
      signer.address,
      signatureVerifier.address,
      validator.address,
      implementations,
    );

    const referralCode = EthCrypto.hash.keccak256([
      { type: 'address', value: referral.address },
      { type: 'address', value: factory.address },
      { type: 'uint256', value: chainId },
    ]);

    await factory.connect(referral).createReferralCode();

    const messageETH = EthCrypto.hash.keccak256([
      { type: 'string', value: AccessTokenEthMetadata.name },
      { type: 'string', value: AccessTokenEthMetadata.symbol },
      { type: 'string', value: AccessTokenEthMetadata.uri },
      { type: 'uint96', value: 600 },
      { type: 'uint256', value: chainId },
    ]);
    instanceInfoETH.signature = EthCrypto.sign(signer.privateKey, messageETH);

    instanceInfoToken.paymentToken = erc20Example.address;
    const messageToken = EthCrypto.hash.keccak256([
      { type: 'string', value: AccessTokenTokenMetadata.name },
      { type: 'string', value: AccessTokenTokenMetadata.symbol },
      { type: 'string', value: AccessTokenTokenMetadata.uri },
      { type: 'uint96', value: 600 },
      { type: 'uint256', value: chainId },
    ]);
    instanceInfoToken.signature = EthCrypto.sign(signer.privateKey, messageToken);

    const { accessToken: accessTokenEth, royaltiesReceiver: royaltiesReceiverEth } = await deployAccessToken(
      AccessTokenEthMetadata,
      ethPurchasePrice,
      ethPurchasePrice.div(2),
      signer,
      creator,
      factory,
      referralCode,
    );

    const { accessToken: accessTokenERC20, royaltiesReceiver: royaltiesReceiverERC20 } = await deployAccessToken(
      AccessTokenTokenMetadata,
      tokenPurchasePrice,
      tokenPurchasePrice / 2,
      signer,
      creator,
      factory,
      referralCode,
      erc20Example.address,
    );

    return {
      signatureVerifier,
      factory,
      accessTokenEth,
      royaltiesReceiverEth,
      accessTokenERC20,
      royaltiesReceiverERC20,
      validator,
      erc20Example,
      owner,
      creator,
      referral,
      charlie,
      pete,
      signer,
      referralCode,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const {
        factory,
        validator,
        accessTokenEth,
        royaltiesReceiverEth,
        accessTokenERC20,
        royaltiesReceiverERC20,
        creator,
      } = await loadFixture(fixture);

      let [, , feeReceiver, , infoReturned] = await accessTokenEth.parameters();
      expect(infoReturned.metadata.name).to.be.equal(instanceInfoETH.metadata.name);
      expect(infoReturned.metadata.symbol).to.be.equal(instanceInfoETH.metadata.symbol);
      expect(infoReturned.contractURI).to.be.equal(instanceInfoETH.contractURI);
      expect(infoReturned.paymentToken).to.be.equal(instanceInfoETH.paymentToken);
      expect(infoReturned.mintPrice).to.be.equal(instanceInfoETH.mintPrice);
      expect(infoReturned.whitelistMintPrice).to.be.equal(instanceInfoETH.whitelistMintPrice);
      expect(infoReturned.transferable).to.be.equal(instanceInfoETH.transferable);
      expect(feeReceiver).to.be.equal(royaltiesReceiverEth.address);

      expect((await accessTokenEth.parameters()).factory).to.be.equal(factory.address);
      expect(await accessTokenEth.name()).to.be.equal(instanceInfoETH.metadata.name);
      expect(await accessTokenEth.symbol()).to.be.equal(instanceInfoETH.metadata.symbol);
      expect((await accessTokenEth.parameters()).info.paymentToken).to.be.equal(instanceInfoETH.paymentToken);
      expect((await accessTokenEth.parameters()).info.mintPrice).to.be.equal(instanceInfoETH.mintPrice);
      expect((await accessTokenEth.parameters()).info.whitelistMintPrice).to.be.equal(
        instanceInfoETH.whitelistMintPrice,
      );
      expect((await accessTokenEth.parameters()).info.transferable).to.be.equal(instanceInfoETH.transferable);
      expect((await accessTokenEth.parameters()).info.maxTotalSupply).to.be.equal(instanceInfoETH.maxTotalSupply);
      expect((await accessTokenEth.parameters()).info.feeNumerator).to.be.equal(instanceInfoETH.feeNumerator);
      expect((await accessTokenEth.parameters()).creator).to.be.equal(creator.address);
      expect((await accessTokenEth.parameters()).info.collectionExpire).to.be.equal(instanceInfoETH.collectionExpire);
      expect(await accessTokenEth.contractURI()).to.be.equal(instanceInfoETH.contractURI);
      expect(await accessTokenEth.getTransferValidator()).to.be.equal(validator.address);

      [, , feeReceiver, , infoReturned] = await accessTokenERC20.parameters();
      expect(infoReturned.maxTotalSupply).to.be.equal(instanceInfoToken.maxTotalSupply);
      expect(infoReturned.feeNumerator).to.be.equal(instanceInfoToken.feeNumerator);
      expect(feeReceiver).to.be.equal(royaltiesReceiverERC20.address);
      expect(infoReturned.collectionExpire).to.be.equal(instanceInfoToken.collectionExpire);
      expect(infoReturned.signature).to.be.equal(instanceInfoToken.signature);
      expect(infoReturned.paymentToken).to.be.equal(instanceInfoToken.paymentToken);

      const interfaceIdIERC2981 = '0x2a55205a'; // IERC2981 interface ID
      const interfaceIdIERC4906 = '0x49064906'; // ERC4906 interface ID
      const interfaceIdICreatorToken = '0xad0d7f6c'; // ICreatorToken interface ID
      const interfaceIdILegacyCreatorToken = '0xa07d229a'; // ILegacyCreatorToken interface ID

      expect(await accessTokenEth.supportsInterface(interfaceIdIERC2981)).to.be.true;
      expect(await accessTokenEth.supportsInterface(interfaceIdIERC4906)).to.be.true;
      expect(await accessTokenEth.supportsInterface(interfaceIdICreatorToken)).to.be.true;
      expect(await accessTokenEth.supportsInterface(interfaceIdILegacyCreatorToken)).to.be.true;

      const [functionSignature, isViewFunction] = await accessTokenEth.getTransferValidationFunction();

      expect(isViewFunction).to.be.true;
      expect(functionSignature).to.eq('0xcaee23ea');
    });
  });

  describe('Functions from AutoValidatorTransferApprove and CreatorToken', () => {
    it('Functions from AutoValidatorTransferApprove', async () => {
      const { accessTokenEth, creator, validator } = await loadFixture(fixture);

      const accessTokenEthAlice = accessTokenEth.connect(creator);

      await accessTokenEthAlice.setNftParameters(
        (
          await accessTokenEth.parameters()
        ).info.paymentToken,
        (
          await accessTokenEth.parameters()
        ).info.mintPrice,
        (
          await accessTokenEth.parameters()
        ).info.whitelistMintPrice,
        true,
      );

      await accessTokenEthAlice.setApprovalForAll(validator.address, false);

      expect(await accessTokenEthAlice.isApprovedForAll(creator.address, validator.address)).to.be.true;
      expect(await accessTokenEthAlice.isApprovedForAll(validator.address, creator.address)).to.be.false;

      await accessTokenEthAlice.setNftParameters(
        (
          await accessTokenEth.parameters()
        ).info.paymentToken,
        (
          await accessTokenEth.parameters()
        ).info.mintPrice,
        (
          await accessTokenEth.parameters()
        ).info.whitelistMintPrice,
        false,
      );
      expect(await accessTokenEthAlice.isApprovedForAll(creator.address, validator.address)).to.be.false;

      await accessTokenEthAlice.setApprovalForAll(validator.address, true);

      expect(await accessTokenEthAlice.isApprovedForAll(creator.address, validator.address)).to.be.true;
    });

    it('Validator is caller', async () => {
      const { signatureVerifier, owner, creator, referral, signer } = await loadFixture(fixture);

      const factory: Factory = await deployFactory(
        owner.address,
        signer.address,
        signatureVerifier.address,
        referral.address,
        implementations,
      );

      const referralCode = EthCrypto.hash.keccak256([
        { type: 'address', value: referral.address },
        { type: 'address', value: factory.address },
        { type: 'uint256', value: chainId },
      ]);

      await factory.connect(referral).createReferralCode();

      const { accessToken: accessTokenEth } = await deployAccessToken(
        AccessTokenEthMetadata,
        ethPurchasePrice,
        ethPurchasePrice.div(2),
        signer,
        creator,
        factory,
        referralCode,
      );

      let message = EthCrypto.hash.keccak256([
        { type: 'address', value: referral.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);

      await accessTokenEth.connect(creator).mintStaticPrice(
        referral.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        ETH_ADDRESS,
        ethPurchasePrice,
        { value: ethPurchasePrice },
      );

      await accessTokenEth.connect(referral).transferFrom(referral.address, creator.address, 0);
    });

    it('Validator is address zero', async () => {
      const { signatureVerifier, owner, creator, referral, signer } = await loadFixture(fixture);

      const factory: Factory = await deployFactory(
        owner.address,
        signer.address,
        signatureVerifier.address,
        ZERO_ADDRESS,
        implementations,
      );

      factoryParams.transferValidator = ZERO_ADDRESS;
      await factory.setFactoryParameters(factoryParams, royalties, implementations, referralPercentages);

      const referralCode = EthCrypto.hash.keccak256([
        { type: 'address', value: referral.address },
        { type: 'address', value: factory.address },
        { type: 'uint256', value: chainId },
      ]);

      await factory.connect(referral).createReferralCode();

      const { accessToken: accessTokenEth } = await deployAccessToken(
        AccessTokenEthMetadata,
        ethPurchasePrice,
        ethPurchasePrice.div(2),
        signer,
        creator,
        factory,
        referralCode,
      );

      let message = EthCrypto.hash.keccak256([
        { type: 'address', value: referral.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);

      await accessTokenEth.connect(creator).mintStaticPrice(
        referral.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        ETH_ADDRESS,
        ethPurchasePrice,
        {
          value: ethPurchasePrice,
        },
      );

      await accessTokenEth.connect(referral).transferFrom(referral.address, creator.address, 0);
    });
  });

  describe('Errors', () => {
    it('only owner', async () => {
      const { accessTokenEth, owner } = await loadFixture(fixture);

      await expect(
        accessTokenEth
          .connect(owner)
          .setNftParameters(
            (
              await accessTokenEth.parameters()
            ).info.paymentToken,
            (
              await accessTokenEth.parameters()
            ).info.mintPrice,
            (
              await accessTokenEth.parameters()
            ).info.whitelistMintPrice,
            false,
          ),
      ).to.be.revertedWithCustomError(accessTokenEth, 'Unauthorized');
    });
  });

  describe('Mint', () => {
    it('Should mint correctly static prices', async () => {
      const { accessTokenEth, royaltiesReceiverEth, creator, signer } = await loadFixture(fixture);

      let message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);

      await expect(
        accessTokenEth.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: 0,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature,
            } as StaticPriceParametersStruct,
          ],
          ETH_ADDRESS,
          ethers.utils.parseEther('0.02'),
          {
            value: ethers.utils.parseEther('0.02'),
          },
        ),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'IncorrectETHAmountSent')
        .withArgs(ethers.utils.parseEther('0.02'));

      await expect(
        accessTokenEth.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: 0,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature,
            } as StaticPriceParametersStruct,
          ],
          creator.address,
          ethPurchasePrice,
          {
            value: ethPurchasePrice,
          },
        ),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'TokenChanged')
        .withArgs(ETH_ADDRESS);

      await expect(
        accessTokenEth.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: 0,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature,
            } as StaticPriceParametersStruct,
          ],
          ETH_ADDRESS,
          ethers.utils.parseEther('0.04'),
          {
            value: ethPurchasePrice,
          },
        ),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'PriceChanged')
        .withArgs(ethers.utils.parseEther('0.04'));

      await accessTokenEth.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        ETH_ADDRESS,
        ethPurchasePrice,
        {
          value: ethPurchasePrice,
        },
      );

      const salePrice = 1000;
      const feeNumerator = 600;
      const feeDenominator = 10000;
      const expectedResult = (salePrice * feeNumerator) / feeDenominator;

      const [receiver, realResult] = await accessTokenEth.royaltyInfo(0, salePrice);
      expect(expectedResult).to.be.equal(realResult);
      expect(receiver).to.be.equal(royaltiesReceiverEth.address);

      for (let i = 1; i < 10; ++i) {
        const message = EthCrypto.hash.keccak256([
          { type: 'address', value: creator.address },
          { type: 'uint256', value: i },
          { type: 'string', value: NFT_721_BASE_URI },
          { type: 'bool', value: false },
          { type: 'uint256', value: chainId },
        ]);

        const signature = EthCrypto.sign(signer.privateKey, message);
        await accessTokenEth.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: i,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature,
            } as StaticPriceParametersStruct,
          ],
          ETH_ADDRESS,
          ethPurchasePrice,
          {
            value: ethPurchasePrice,
          },
        );
      }

      message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 11 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      signature = EthCrypto.sign(signer.privateKey, message);

      await expect(
        accessTokenEth.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: 11,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature,
            } as StaticPriceParametersStruct,
          ],
          ETH_ADDRESS,
          ethPurchasePrice,
          {
            value: ethPurchasePrice,
          },
        ),
      ).to.be.revertedWithCustomError(accessTokenEth, 'TotalSupplyLimitReached');
    });

    it('Should batch mint correctly static prices', async () => {
      const { accessTokenEth, royaltiesReceiverEth, validator, factory, owner, creator, signer } = await loadFixture(
        fixture,
      );

      let message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: true },
        { type: 'uint256', value: chainId },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);

      let message2 = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 1 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      let signature2 = EthCrypto.sign(signer.privateKey, message2);

      await factory.setFactoryParameters(
        {
          transferValidator: validator.address,
          platformAddress: owner.address,
          signerAddress: signer.address,
          platformCommission: PLATFORM_COMISSION,
          defaultPaymentCurrency: ETH_ADDRESS,
          maxArraySize: 1,
        } as Factory.FactoryParametersStruct,
        royalties,
        implementations,
        referralPercentages,
      );
      await expect(
        accessTokenEth.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: 0,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature,
            } as StaticPriceParametersStruct,
            {
              tokenId: 0,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature,
            } as StaticPriceParametersStruct,
          ],
          ETH_ADDRESS,
          ethPurchasePrice,
          {
            value: ethPurchasePrice,
          },
        ),
      ).to.be.revertedWithCustomError(accessTokenEth, 'WrongArraySize');
      factoryParams.maxArraySize = 20;
      await factory.setFactoryParameters(factoryParams, royalties, implementations, referralPercentages);

      await expect(
        accessTokenEth.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: 1,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature: signature2,
            } as StaticPriceParametersStruct,
          ],
          ETH_ADDRESS,
          ethers.utils.parseEther('0.04'),
          {
            value: ethPurchasePrice,
          },
        ),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'PriceChanged')
        .withArgs(ethers.utils.parseEther('0.04'));

      await accessTokenEth.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: true,
            signature,
          } as StaticPriceParametersStruct,
        ],
        ETH_ADDRESS,
        ethPurchasePrice.div(2),
        {
          value: ethPurchasePrice.div(2),
        },
      );

      const salePrice = 1000;
      const feeNumerator = 600;
      const feeDenominator = 10000;
      const expectedResult = (salePrice * feeNumerator) / feeDenominator;

      const [receiver, realResult] = await accessTokenEth.royaltyInfo(0, salePrice);
      expect(expectedResult).to.be.equal(realResult);
      expect(receiver).to.be.equal(royaltiesReceiverEth.address);

      let staticParams = [];
      for (let i = 1; i < 10; i++) {
        const message = EthCrypto.hash.keccak256([
          { type: 'address', value: creator.address },
          { type: 'uint256', value: i },
          { type: 'string', value: NFT_721_BASE_URI },
          { type: 'bool', value: false },
          { type: 'uint256', value: chainId },
        ]);

        const signature = EthCrypto.sign(signer.privateKey, message);

        staticParams.push({
          tokenId: i,
          tokenUri: NFT_721_BASE_URI,
          whitelisted: false,
          signature,
        } as StaticPriceParametersStruct);
      }

      await accessTokenEth
        .connect(creator)
        .mintStaticPrice(creator.address, staticParams, ETH_ADDRESS, ethPurchasePrice.mul(9), {
          value: ethPurchasePrice.mul(9),
        });
    });

    it('Should mint correctly dynamic prices', async () => {
      const { signatureVerifier, accessTokenEth, creator, signer } = await loadFixture(fixture);

      let message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'uint256', value: ethers.utils.parseEther('0.02') },
        { type: 'uint256', value: chainId },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);

      await expect(
        accessTokenEth.connect(creator).mintDynamicPrice(
          creator.address,
          [
            {
              tokenId: 0,
              price: ethers.utils.parseEther('0.01'),
              tokenUri: NFT_721_BASE_URI,
              signature,
            } as DynamicPriceParametersStruct,
          ],
          ETH_ADDRESS,
          {
            value: ethers.utils.parseEther('0.01'),
          },
        ),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');

      await accessTokenEth.connect(creator).mintDynamicPrice(
        creator.address,
        [
          {
            tokenId: 0,
            price: ethers.utils.parseEther('0.02'),
            tokenUri: NFT_721_BASE_URI,
            signature,
          } as DynamicPriceParametersStruct,
        ],
        ETH_ADDRESS,
        {
          value: ethers.utils.parseEther('0.02'),
        },
      );
    });

    it('Should batch mint correctly dynamic prices', async () => {
      const { accessTokenEth, royaltiesReceiverEth, factory, validator, owner, creator, signer } = await loadFixture(
        fixture,
      );

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'uint256', value: ethers.utils.parseEther('0.02') },
        { type: 'uint256', value: chainId },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);

      await factory.setFactoryParameters(
        {
          transferValidator: validator.address,
          platformAddress: owner.address,
          signerAddress: signer.address,
          platformCommission: PLATFORM_COMISSION,
          defaultPaymentCurrency: ETH_ADDRESS,
          maxArraySize: 1,
        } as Factory.FactoryParametersStruct,
        royalties,
        implementations,
        referralPercentages,
      );
      await expect(
        accessTokenEth.connect(creator).mintDynamicPrice(
          creator.address,
          [
            {
              tokenId: 0,
              price: ethers.utils.parseEther('0.02'),
              tokenUri: NFT_721_BASE_URI,
              signature,
            } as DynamicPriceParametersStruct,
            {
              tokenId: 0,
              price: ethers.utils.parseEther('0.02'),
              tokenUri: NFT_721_BASE_URI,
              signature,
            } as DynamicPriceParametersStruct,
          ],
          ETH_ADDRESS,
          {
            value: ethers.utils.parseEther('0.02'),
          },
        ),
      ).to.be.revertedWithCustomError(accessTokenEth, 'WrongArraySize');
      await factory.setFactoryParameters(
        {
          transferValidator: validator.address,
          platformAddress: owner.address,
          signerAddress: signer.address,
          platformCommission: PLATFORM_COMISSION,
          defaultPaymentCurrency: ETH_ADDRESS,
          maxArraySize: 20,
        } as Factory.FactoryParametersStruct,
        royalties,
        implementations,
        referralPercentages,
      );

      await accessTokenEth.connect(creator).mintDynamicPrice(
        creator.address,
        [
          {
            tokenId: 0,
            price: ethers.utils.parseEther('0.02'),
            tokenUri: NFT_721_BASE_URI,
            signature,
          } as DynamicPriceParametersStruct,
        ],
        ETH_ADDRESS,
        {
          value: ethers.utils.parseEther('0.02'),
        },
      );

      const salePrice = 1000;
      const feeNumerator = 600;
      const feeDenominator = 10000;
      const expectedResult = (salePrice * feeNumerator) / feeDenominator;

      const [receiver, realResult] = await accessTokenEth.royaltyInfo(0, salePrice);
      expect(expectedResult).to.be.equal(realResult);
      expect(receiver).to.be.equal(royaltiesReceiverEth.address);

      let dynamicParams = [];
      for (let i = 1; i < 10; i++) {
        const message = EthCrypto.hash.keccak256([
          { type: 'address', value: creator.address },
          { type: 'uint256', value: i },
          { type: 'string', value: NFT_721_BASE_URI },
          { type: 'uint256', value: ethers.utils.parseEther('0.02') },
          { type: 'uint256', value: chainId },
        ]);

        const signature = EthCrypto.sign(signer.privateKey, message);

        dynamicParams.push({
          tokenId: i,
          price: ethers.utils.parseEther('0.02'),
          tokenUri: NFT_721_BASE_URI,
          signature,
        } as DynamicPriceParametersStruct);
      }

      await accessTokenEth.connect(creator).mintDynamicPrice(creator.address, dynamicParams, ETH_ADDRESS, {
        value: ethers.utils.parseEther('0.02').mul(9),
      });
    });

    it('Should correct set new values', async () => {
      const { accessTokenEth, owner, creator, referral } = await loadFixture(fixture);

      const newPrice = ethers.utils.parseEther('1');
      const newWLPrice = ethers.utils.parseEther('0.1');
      const newPayingToken = referral.address;

      await expect(
        accessTokenEth.connect(owner).setNftParameters(newPayingToken, newPrice, newWLPrice, true),
      ).to.be.revertedWithCustomError(accessTokenEth, 'Unauthorized');

      await accessTokenEth.connect(creator).setNftParameters(newPayingToken, newPrice, newWLPrice, true);

      const [, , , , infoReturned] = await accessTokenEth.parameters();

      expect(infoReturned.paymentToken).to.be.equal(newPayingToken);
      expect(infoReturned.mintPrice).to.be.equal(newPrice);
      expect(infoReturned.whitelistMintPrice).to.be.equal(newWLPrice);
    });

    it('Should mint correctly with erc20 token', async () => {
      const { accessTokenERC20, creator, erc20Example, signer } = await loadFixture(fixture);

      await erc20Example.connect(creator).mint(creator.address, tokenPurchasePrice);
      await erc20Example.connect(creator).approve(accessTokenERC20.address, ethers.constants.MaxUint256);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await accessTokenERC20.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        erc20Example.address,
        tokenPurchasePrice,
      );
      expect(await accessTokenERC20.balanceOf(creator.address)).to.be.equal(1);
    });

    it('Should mint correctly with erc20 token without fee', async () => {
      const { factory, accessTokenERC20, creator, erc20Example, signer } = await loadFixture(fixture);

      factoryParams.platformCommission = 0;
      await factory.setFactoryParameters(factoryParams, royalties, implementations, referralPercentages);

      await erc20Example.connect(creator).mint(creator.address, tokenPurchasePrice);
      await erc20Example.connect(creator).approve(accessTokenERC20.address, tokenPurchasePrice);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await accessTokenERC20.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        erc20Example.address,
        tokenPurchasePrice,
      );
      expect(await accessTokenERC20.balanceOf(creator.address)).to.be.equal(1);
      expect(await erc20Example.balanceOf(creator.address)).to.be.equal(10000);
    });

    it('Should transfer if transferable', async () => {
      const { factory, accessTokenERC20, creator, erc20Example, signer, referral } = await loadFixture(fixture);

      factoryParams.platformCommission = 0;
      await factory.setFactoryParameters(factoryParams, royalties, implementations, referralPercentages);

      await erc20Example.connect(creator).mint(creator.address, tokenPurchasePrice);
      await erc20Example.connect(creator).approve(accessTokenERC20.address, ethers.constants.MaxUint256);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await accessTokenERC20.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        erc20Example.address,
        tokenPurchasePrice,
      );
      expect(await accessTokenERC20.balanceOf(creator.address)).to.be.equal(1);

      await accessTokenERC20.connect(creator).transferFrom(creator.address, referral.address, 0);
      expect(await accessTokenERC20.balanceOf(referral.address)).to.be.equal(1);
    });

    it('Should transfer if transferable - multiple tokens', async () => {
      const { factory, accessTokenERC20, creator, erc20Example, signer, referral } = await loadFixture(fixture);

      factoryParams.platformCommission = 0;
      await factory.setFactoryParameters(factoryParams, royalties, implementations, referralPercentages);

      await erc20Example.connect(creator).mint(creator.address, tokenPurchasePrice * 2);
      await erc20Example.connect(creator).approve(accessTokenERC20.address, ethers.constants.MaxUint256);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await accessTokenERC20.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        erc20Example.address,
        tokenPurchasePrice,
      );
      expect(await accessTokenERC20.balanceOf(creator.address)).to.be.equal(1);

      await accessTokenERC20.connect(creator).transferFrom(creator.address, referral.address, 0);
      expect(await accessTokenERC20.balanceOf(referral.address)).to.be.equal(1);

      const message2 = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 1 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature2 = EthCrypto.sign(signer.privateKey, message2);

      await accessTokenERC20.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 1,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature: signature2,
          } as StaticPriceParametersStruct,
        ],
        erc20Example.address,
        tokenPurchasePrice,
      );
      expect(await accessTokenERC20.balanceOf(creator.address)).to.be.equal(1);

      await accessTokenERC20.connect(creator).transferFrom(creator.address, referral.address, 1);
    });

    it("Shouldn't transfer if not transferable", async () => {
      const { factory, creator, erc20Example, signer, referral } = await loadFixture(fixture);

      factoryParams.platformCommission = 0;
      await factory.setFactoryParameters(factoryParams, royalties, implementations, referralPercentages);

      AccessTokenEthMetadata.name += '1';
      const { accessToken } = await deployAccessToken(
        AccessTokenEthMetadata,
        tokenPurchasePrice,
        tokenPurchasePrice / 2,
        signer,
        creator,
        factory,
        ethers.constants.HashZero,
        erc20Example.address,
        false,
      );

      await erc20Example.connect(creator).mint(creator.address, tokenPurchasePrice);
      await erc20Example.connect(creator).approve(accessToken.address, ethers.constants.MaxUint256);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await accessToken.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        erc20Example.address,
        tokenPurchasePrice,
      );
      expect(await accessToken.balanceOf(creator.address)).to.be.equal(1);

      await expect(
        accessToken.connect(creator).transferFrom(creator.address, referral.address, 0),
      ).to.be.revertedWithCustomError(accessToken, 'NotTransferable');
    });

    it('Should mint correctly with erc20 token if user in the WL', async () => {
      const { creator, erc20Example, factory, signer, referral } = await loadFixture(fixture);

      AccessTokenEthMetadata.name += '2';
      const { accessToken } = await deployAccessToken(
        AccessTokenEthMetadata,
        tokenPurchasePrice,
        tokenPurchasePrice / 2,
        signer,
        referral,
        factory,
        ethers.constants.HashZero,
        erc20Example.address,
      );

      await erc20Example.connect(creator).mint(creator.address, tokenPurchasePrice);
      await erc20Example.connect(creator).approve(accessToken.address, ethers.constants.MaxUint256);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: true },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);
      const aliceBalanceBefore = await erc20Example.balanceOf(creator.address);
      const referralBalanceBefore = await erc20Example.balanceOf(referral.address);
      await accessToken.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: true,
            signature,
          } as StaticPriceParametersStruct,
        ],
        erc20Example.address,
        tokenPurchasePrice / 2,
      );
      const aliceBalanceAfter = await erc20Example.balanceOf(creator.address);
      const referralBalanceAfter = await erc20Example.balanceOf(referral.address);

      expect(await accessToken.balanceOf(creator.address)).to.be.equal(1);
      expect(aliceBalanceBefore.sub(aliceBalanceAfter)).to.be.equal(tokenPurchasePrice / 2);
      expect(referralBalanceAfter.sub(referralBalanceBefore)).to.be.equal(
        BigNumber.from(tokenPurchasePrice / 2)
          .mul(9900)
          .div(10000),
      );
    });

    it('Should fail with wrong signer', async () => {
      const { signatureVerifier, creator, accessTokenEth } = await loadFixture(fixture);

      const bad_message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 1 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);
      const bad_signature = creator.signMessage(bad_message);

      await expect(
        accessTokenEth.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: 1,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature: bad_signature,
            } as StaticPriceParametersStruct,
          ],
          ETH_ADDRESS,
          ethPurchasePrice,
          { value: ethPurchasePrice },
        ),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');
    });

    it('Should fail with wrong mint price', async () => {
      const { creator, accessTokenEth, signer } = await loadFixture(fixture);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await expect(
        accessTokenEth.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: 0,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature,
            } as StaticPriceParametersStruct,
          ],
          ETH_ADDRESS,
          ethers.utils.parseEther('0.02'),
          { value: ethers.utils.parseEther('0.02') },
        ),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'IncorrectETHAmountSent')
        .withArgs(ethers.utils.parseEther('0.02'));

      await expect(
        accessTokenEth.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: 0,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature,
            } as StaticPriceParametersStruct,
          ],
          ETH_ADDRESS,
          ethers.utils.parseEther('0.02'),
        ),
      )
        .to.be.revertedWithCustomError(accessTokenEth, 'IncorrectETHAmountSent')
        .withArgs(0);
    });

    it('Should fail with 0 acc balance erc20', async () => {
      const { creator, signer, accessTokenERC20, erc20Example } = await loadFixture(fixture);

      await erc20Example.connect(creator).approve(accessTokenERC20.address, 99999999999999);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 1 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await expect(
        accessTokenERC20.connect(creator).mintStaticPrice(
          creator.address,
          [
            {
              tokenId: 1,
              tokenUri: NFT_721_BASE_URI,
              whitelisted: false,
              signature,
            } as StaticPriceParametersStruct,
          ],
          erc20Example.address,
          tokenPurchasePrice,
        ),
      ).to.be.reverted;
    });
  });

  describe('TokenURI test', async () => {
    it('Should return correct metadataUri after mint', async () => {
      const { creator, signer, accessTokenEth } = await loadFixture(fixture);

      const NFT_721_BASE_URI = 'test.com/1';

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await accessTokenEth.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        ETH_ADDRESS,
        ethPurchasePrice,
        {
          value: ethPurchasePrice,
        },
      );

      await expect(accessTokenEth.tokenURI(100)).to.be.revertedWithCustomError(accessTokenEth, 'TokenIdDoesNotExist');
      expect(await accessTokenEth.tokenURI(0)).to.be.equal(NFT_721_BASE_URI);
    });
  });

  describe('Withdraw test', async () => {
    it('Should withdraw all funds when contract has 0 commission', async () => {
      const { creator, accessTokenERC20, erc20Example, signer, factory } = await loadFixture(fixture);

      await erc20Example.connect(creator).mint(creator.address, tokenPurchasePrice);
      await erc20Example.connect(creator).approve(accessTokenERC20.address, ethers.constants.MaxUint256);

      factoryParams.platformCommission = 0;
      await factory.setFactoryParameters(factoryParams, royalties, implementations, referralPercentages);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      const startBalance = await erc20Example.balanceOf(creator.address);

      await accessTokenERC20.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        erc20Example.address,
        tokenPurchasePrice,
      );

      const endBalance = await erc20Example.balanceOf(creator.address);
      expect(endBalance.sub(startBalance)).to.eq(0);
    });

    it('Should withdraw all funds without 10% (commission)', async () => {
      const { creator, accessTokenERC20, erc20Example, signer, factory, owner, referral, charlie, referralCode } =
        await loadFixture(fixture);

      await erc20Example.connect(charlie).mint(charlie.address, tokenPurchasePrice);
      await erc20Example.connect(charlie).approve(accessTokenERC20.address, ethers.constants.MaxUint256);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: charlie.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      const startBalanceOwner = await erc20Example.balanceOf(owner.address);
      const startBalanceReferral = await erc20Example.balanceOf(referral.address);

      await accessTokenERC20.connect(charlie).mintStaticPrice(
        charlie.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        erc20Example.address,
        tokenPurchasePrice,
      );
      expect((await factory.nftFactoryParameters()).platformAddress).to.be.equal(owner.address);
      const endBalanceOwner = await erc20Example.balanceOf(owner.address);
      const endBalanceReferral = await erc20Example.balanceOf(referral.address);

      const fullFees = BigNumber.from(tokenPurchasePrice)
        .mul((await factory.nftFactoryParameters()).platformCommission)
        .div(10000);
      const feesToReferralCreator = await factory.getReferralRate(creator.address, referralCode, fullFees);
      const feesToPlatform = fullFees.sub(feesToReferralCreator);

      expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(feesToPlatform);
      expect(endBalanceReferral.sub(startBalanceReferral)).to.be.equal(feesToReferralCreator);
    });

    it('Should withdraw all funds when contract has 0 commission - ETH', async () => {
      const { creator, accessTokenEth, signer, factory, owner } = await loadFixture(fixture);

      factoryParams.platformCommission = 0;
      await factory.setFactoryParameters(factoryParams, royalties, implementations, referralPercentages);

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: creator.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      const startBalance = await creator.getBalance();

      await accessTokenEth.connect(creator).mintStaticPrice(
        creator.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        ETH_ADDRESS,
        ethPurchasePrice,
        {
          value: ethPurchasePrice,
        },
      );

      const endBalance = await creator.getBalance();
      expect(endBalance.lte(startBalance)).to.be.true; // Account for gas costs
    });

    it('Should withdraw all funds without 10% (commission) - ETH', async () => {
      const { creator, accessTokenEth, signer, factory, owner, referral, charlie, referralCode } = await loadFixture(
        fixture,
      );

      const message = EthCrypto.hash.keccak256([
        { type: 'address', value: charlie.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      const startBalanceOwner = await owner.getBalance();
      const startBalanceReferral = await referral.getBalance();
      const startBalanceCreator = await creator.getBalance();

      await accessTokenEth.connect(charlie).mintStaticPrice(
        charlie.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        ETH_ADDRESS,
        ethPurchasePrice,
        {
          value: ethPurchasePrice,
        },
      );
      expect((await factory.nftFactoryParameters()).platformAddress).to.be.equal(owner.address);
      const endBalanceOwner = await owner.getBalance();
      const endBalanceReferral = await referral.getBalance();
      const endBalanceCreator = await creator.getBalance();

      const fullFees = ethPurchasePrice.div(BigNumber.from('100'));
      const feesToReferralCreator = await factory.getReferralRate(creator.address, referralCode, fullFees);
      const feesToPlatform = fullFees.sub(feesToReferralCreator);

      expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(feesToPlatform);
      expect(endBalanceReferral.sub(startBalanceReferral)).to.be.equal(feesToReferralCreator);
      expect(endBalanceCreator.sub(startBalanceCreator)).to.be.equal(
        ethPurchasePrice.mul(BigNumber.from('99')).div(BigNumber.from('100')),
      );
    });

    it('Should correct distribute royalties 2 payees', async () => {
      const { creator, signer, erc20Example, factory, owner, referral, charlie, referralCode } = await loadFixture(
        fixture,
      );

      AccessTokenEthMetadata.name += '3';
      const { accessToken, royaltiesReceiver } = await deployAccessToken(
        AccessTokenEthMetadata,
        ethPurchasePrice,
        ethPurchasePrice.div(2),
        signer,
        creator,
        factory,
        ethers.constants.HashZero,
      );

      expect(await accessToken.owner()).to.be.equal(creator.address);

      let message = EthCrypto.hash.keccak256([
        { type: 'address', value: charlie.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);

      let startBalanceOwner = await owner.getBalance();
      let startBalanceCreator = await creator.getBalance();

      await accessToken.connect(charlie).mintStaticPrice(
        charlie.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        ETH_ADDRESS,
        ethPurchasePrice,
        {
          value: ethPurchasePrice,
        },
      );

      let endBalanceOwner = await owner.getBalance();
      let endBalanceCreator = await creator.getBalance();

      const fullFees = ethPurchasePrice.div(BigNumber.from('100'));

      expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(fullFees);
      expect(endBalanceCreator.sub(startBalanceCreator)).to.be.equal(
        ethPurchasePrice.mul(BigNumber.from('99')).div(BigNumber.from('100')),
      );

      // NFT was sold for ETH

      let tx = {
        from: owner.address,
        to: royaltiesReceiver.address,
        value: ethers.utils.parseEther('1'),
        gasLimit: 1000000,
      };

      const platformAddress = (await factory.nftFactoryParameters()).platformAddress;

      await owner.sendTransaction(tx);

      let creatorBalanceBefore = await creator.getBalance();
      let platformBalanceBefore = await owner.getBalance();

      await royaltiesReceiver.connect(referral).releaseAll(await royaltiesReceiver.ETH_ADDRESS());

      expect(await royaltiesReceiver.totalReleased(await royaltiesReceiver.ETH_ADDRESS())).to.eq(
        ethers.utils.parseEther('1'),
      );
      expect(await royaltiesReceiver.released(await royaltiesReceiver.ETH_ADDRESS(), creator.address)).to.eq(
        ethers.utils.parseEther('0.8'),
      );
      expect(await royaltiesReceiver.released(await royaltiesReceiver.ETH_ADDRESS(), owner.address)).to.eq(
        ethers.utils.parseEther('0.2'),
      );

      let creatorBalanceAfter = await creator.getBalance();
      let platformBalanceAfter = await owner.getBalance();

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.8'));
      expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.2'));

      // NFT was sold for ERC20

      creatorBalanceBefore = await erc20Example.balanceOf(creator.address);
      platformBalanceBefore = await erc20Example.balanceOf(platformAddress);

      await erc20Example.connect(owner).mint(royaltiesReceiver.address, ethers.utils.parseEther('1'));

      await royaltiesReceiver.connect(referral).releaseAll(erc20Example.address);

      expect(await royaltiesReceiver.totalReleased(erc20Example.address)).to.eq(ethers.utils.parseEther('1'));
      expect(await royaltiesReceiver.released(erc20Example.address, creator.address)).to.eq(
        ethers.utils.parseEther('0.8'),
      );
      expect(await royaltiesReceiver.released(erc20Example.address, owner.address)).to.eq(
        ethers.utils.parseEther('0.2'),
      );

      creatorBalanceAfter = await erc20Example.balanceOf(creator.address);
      platformBalanceAfter = await erc20Example.balanceOf(platformAddress);

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.8'));
      expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.2'));

      // NFT was sold for ETH 2

      tx = {
        from: owner.address,
        to: royaltiesReceiver.address,
        value: ethers.utils.parseEther('1'),
        gasLimit: 1000000,
      };

      await owner.sendTransaction(tx);

      creatorBalanceBefore = await creator.getBalance();
      platformBalanceBefore = await owner.getBalance();

      await royaltiesReceiver.connect(referral).release(await royaltiesReceiver.ETH_ADDRESS(), creator.address);

      expect(await royaltiesReceiver.totalReleased(await royaltiesReceiver.ETH_ADDRESS())).to.eq(
        ethers.utils.parseEther('1.8'),
      );
      expect(await royaltiesReceiver.released(await royaltiesReceiver.ETH_ADDRESS(), creator.address)).to.eq(
        ethers.utils.parseEther('1.6'),
      );
      expect(await royaltiesReceiver.released(await royaltiesReceiver.ETH_ADDRESS(), owner.address)).to.eq(
        ethers.utils.parseEther('0.2'),
      );

      creatorBalanceAfter = await creator.getBalance();
      platformBalanceAfter = await owner.getBalance();

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.8'));
      expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(0);

      // NFT was sold for ERC20 2

      creatorBalanceBefore = await erc20Example.balanceOf(creator.address);
      platformBalanceBefore = await erc20Example.balanceOf(platformAddress);

      await erc20Example.connect(owner).mint(royaltiesReceiver.address, ethers.utils.parseEther('1'));

      await royaltiesReceiver.connect(referral).release(erc20Example.address, owner.address);

      expect(await royaltiesReceiver.totalReleased(erc20Example.address)).to.eq(ethers.utils.parseEther('1.2'));
      expect(await royaltiesReceiver.released(erc20Example.address, creator.address)).to.eq(
        ethers.utils.parseEther('0.8'),
      );
      expect(await royaltiesReceiver.released(erc20Example.address, owner.address)).to.eq(
        ethers.utils.parseEther('0.4'),
      );

      creatorBalanceAfter = await erc20Example.balanceOf(creator.address);
      platformBalanceAfter = await erc20Example.balanceOf(platformAddress);

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(0);
      expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.2'));

      // NFT was sold for ERC20 3

      creatorBalanceBefore = await erc20Example.balanceOf(creator.address);
      platformBalanceBefore = await erc20Example.balanceOf(platformAddress);

      await expect(
        royaltiesReceiver.connect(referral).release(erc20Example.address, charlie.address),
      ).to.be.revertedWithCustomError(royaltiesReceiver, 'AccountNotDuePayment');
      await royaltiesReceiver.connect(referral).release(erc20Example.address, owner.address);

      expect(await royaltiesReceiver.totalReleased(erc20Example.address)).to.eq(ethers.utils.parseEther('1.2'));
      expect(await royaltiesReceiver.released(erc20Example.address, creator.address)).to.eq(
        ethers.utils.parseEther('0.8'),
      );
      expect(await royaltiesReceiver.released(erc20Example.address, owner.address)).to.eq(
        ethers.utils.parseEther('0.4'),
      );

      creatorBalanceAfter = await erc20Example.balanceOf(creator.address);
      platformBalanceAfter = await erc20Example.balanceOf(platformAddress);

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(0);
      expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(0);
    });

    it('Should correct distribute royalties 3 payees', async () => {
      const {
        creator,
        signer,
        royaltiesReceiverEth,
        accessTokenEth,
        erc20Example,
        factory,
        owner,
        referral,
        charlie,
        pete,
        referralCode,
      } = await loadFixture(fixture);

      let message = EthCrypto.hash.keccak256([
        { type: 'address', value: charlie.address },
        { type: 'uint256', value: 0 },
        { type: 'string', value: NFT_721_BASE_URI },
        { type: 'bool', value: false },
        { type: 'uint256', value: chainId },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);

      const startBalanceOwner = await owner.getBalance();
      const startBalanceCreator = await creator.getBalance();
      const startBalanceReferral = await referral.getBalance();

      await accessTokenEth.connect(charlie).mintStaticPrice(
        charlie.address,
        [
          {
            tokenId: 0,
            tokenUri: NFT_721_BASE_URI,
            whitelisted: false,
            signature,
          } as StaticPriceParametersStruct,
        ],
        ETH_ADDRESS,
        ethPurchasePrice,
        {
          value: ethPurchasePrice,
        },
      );

      const endBalanceOwner = await owner.getBalance();
      const endBalanceCreator = await creator.getBalance();
      const endBalanceReferral = await referral.getBalance();

      const fullFees = ethPurchasePrice.div(BigNumber.from('100'));
      const feesToReferralCreator = await factory.getReferralRate(creator.address, referralCode, fullFees);
      const feesToPlatform = fullFees.sub(feesToReferralCreator);

      expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(feesToPlatform);
      expect(endBalanceReferral.sub(startBalanceReferral)).to.be.equal(feesToReferralCreator);
      expect(endBalanceCreator.sub(startBalanceCreator)).to.be.equal(
        ethPurchasePrice.mul(BigNumber.from('99')).div(BigNumber.from('100')),
      );

      let tx = {
        from: owner.address,
        to: royaltiesReceiverEth.address,
        value: ethers.utils.parseEther('1'),
        gasLimit: 1000000,
      };

      const platformAddress = (await factory.nftFactoryParameters()).platformAddress;

      await owner.sendTransaction(tx);

      let creatorBalanceBefore = await creator.getBalance();
      let platformBalanceBefore = await owner.getBalance();
      let referralBalanceBefore = await referral.getBalance();

      await royaltiesReceiverEth.connect(pete).releaseAll(royaltiesReceiverEth.ETH_ADDRESS());

      expect(await royaltiesReceiverEth.totalReleased(royaltiesReceiverEth.ETH_ADDRESS())).to.eq(
        ethers.utils.parseEther('1'),
      );
      expect(await royaltiesReceiverEth.released(royaltiesReceiverEth.ETH_ADDRESS(), creator.address)).to.eq(
        ethers.utils.parseEther('0.8'),
      );
      expect(await royaltiesReceiverEth.released(royaltiesReceiverEth.ETH_ADDRESS(), owner.address)).to.eq(
        ethers.utils.parseEther('0.14'),
      );
      expect(await royaltiesReceiverEth.released(royaltiesReceiverEth.ETH_ADDRESS(), referral.address)).to.eq(
        ethers.utils.parseEther('0.06'),
      );

      let creatorBalanceAfter = await creator.getBalance();
      let platformBalanceAfter = await owner.getBalance();
      let referralBalanceAfter = await referral.getBalance();

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.8'));
      expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.14'));
      expect(referralBalanceAfter.sub(referralBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.06'));

      creatorBalanceBefore = await erc20Example.balanceOf(creator.address);
      platformBalanceBefore = await erc20Example.balanceOf(platformAddress);
      referralBalanceBefore = await erc20Example.balanceOf(referral.address);

      await erc20Example.connect(owner).mint(royaltiesReceiverEth.address, ethers.utils.parseEther('1'));

      await royaltiesReceiverEth.connect(pete).releaseAll(erc20Example.address);

      expect(await royaltiesReceiverEth.totalReleased(erc20Example.address)).to.eq(ethers.utils.parseEther('1'));
      expect(await royaltiesReceiverEth.released(erc20Example.address, creator.address)).to.eq(
        ethers.utils.parseEther('0.8'),
      );
      expect(await royaltiesReceiverEth.released(erc20Example.address, owner.address)).to.eq(
        ethers.utils.parseEther('0.14'),
      );
      expect(await royaltiesReceiverEth.released(erc20Example.address, referral.address)).to.eq(
        ethers.utils.parseEther('0.06'),
      );

      creatorBalanceAfter = await erc20Example.balanceOf(creator.address);
      platformBalanceAfter = await erc20Example.balanceOf(platformAddress);
      referralBalanceAfter = await erc20Example.balanceOf(referral.address);

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.8'));
      expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.14'));
      expect(referralBalanceAfter.sub(referralBalanceBefore)).to.be.equal(ethers.utils.parseEther('0.06'));
    });
  });
});

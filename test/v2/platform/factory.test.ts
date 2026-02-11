import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, BigNumberish } from 'ethers';
import {
  WETHMock,
  MockTransferValidatorV2,
  Factory,
  RoyaltiesReceiverV2,
  CreditToken,
  AccessToken,
  SignatureVerifier,
  VestingWalletExtended,
} from '../../../typechain-types';
import { expect } from 'chai';
import EthCrypto from 'eth-crypto';
import { PromiseOrValue } from '../../../typechain-types/common';
import {
  AccessTokenInfoStruct,
  AccessTokenInfoStructOutput,
  ERC1155InfoStruct,
} from '../../../typechain-types/contracts/v2/platform/Factory';
import { getPercentage, hashAccessTokenInfo, hashERC1155Info, hashVestingInfo } from '../../../helpers/math';
import {
  deployAccessTokenImplementation,
  deployCreditTokenImplementation,
  deployFactory,
  deployLONG,
  deployRoyaltiesReceiverV2Implementation,
  deployVestingWalletImplementation,
} from '../../../helpers/deployFixtures';
import { deploySignatureVerifier } from '../../../helpers/deployLibraries';
import { deployMockTransferValidatorV2, deployWETHMock } from '../../../helpers/deployMockFixtures';
import { VestingWalletInfoStruct } from '../../../typechain-types/contracts/v2/periphery/VestingWalletExtended';
import { LONG } from '../../../typechain-types/contracts/v2/tokens/LONG.sol';

describe('Factory', () => {
  const NATIVE_CURRENCY_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const chainId = 31337;

  let factoryParams: Factory.FactoryParametersStruct,
    referralPercentages: any,
    royalties: Factory.RoyaltiesParametersStruct,
    implementations: Factory.ImplementationsStruct;

  async function fixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();
    const signer = EthCrypto.createIdentity();

    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();
    const erc20Example: WETHMock = await deployWETHMock();
    const LONG: LONG = await deployLONG(owner.address, owner.address, owner.address);
    const validator: MockTransferValidatorV2 = await deployMockTransferValidatorV2();
    const accessToken: AccessToken = await deployAccessTokenImplementation(signatureVerifier.address);
    const rr: RoyaltiesReceiverV2 = await deployRoyaltiesReceiverV2Implementation();
    const creditToken: CreditToken = await deployCreditTokenImplementation();
    const vestingWallet: VestingWalletExtended = await deployVestingWalletImplementation();

    implementations = {
      accessToken: accessToken.address,
      creditToken: creditToken.address,
      royaltiesReceiver: rr.address,
      vestingWallet: vestingWallet.address,
    };

    royalties = {
      amountToCreator: 8000,
      amountToPlatform: 2000,
    };

    factoryParams = {
      transferValidator: validator.address,
      platformAddress: owner.address,
      signerAddress: signer.address,
      platformCommission: 100,
      defaultPaymentCurrency: NATIVE_CURRENCY_ADDRESS,
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

    return {
      signatureVerifier,
      factory,
      validator,
      LONG,
      erc20Example,
      creditToken,
      owner,
      alice,
      bob,
      charlie,
      signer,
    };
  }

  describe('Deployment', () => {
    it('should correct initialize', async () => {
      const { factory, owner, signer, validator } = await loadFixture(fixture);

      expect((await factory.nftFactoryParameters()).platformAddress).to.be.equal(owner.address);
      expect((await factory.nftFactoryParameters()).platformCommission).to.be.equal(factoryParams.platformCommission);
      expect((await factory.nftFactoryParameters()).signerAddress).to.be.equal(signer.address);
      expect((await factory.nftFactoryParameters()).defaultPaymentCurrency).to.be.equal(NATIVE_CURRENCY_ADDRESS);
      expect((await factory.nftFactoryParameters()).maxArraySize).to.be.equal(factoryParams.maxArraySize);
      expect((await factory.nftFactoryParameters()).transferValidator).to.be.equal(validator.address);

      expect((await factory.implementations()).accessToken).to.be.equal(implementations.accessToken);
      expect((await factory.implementations()).creditToken).to.be.equal(implementations.creditToken);
      expect((await factory.implementations()).royaltiesReceiver).to.be.equal(implementations.royaltiesReceiver);

      referralPercentages.forEach(async (pecentage: any, i: PromiseOrValue<BigNumberish>) => {
        expect(await factory.usedToPercentage(i)).to.be.equal(pecentage);
      });
    });

    it('can not be initialized again', async () => {
      const { factory } = await loadFixture(fixture);

      await expect(
        factory.initialize(factoryParams, royalties, implementations, referralPercentages),
      ).to.be.revertedWithCustomError(factory, 'InvalidInitialization');
    });

    it('upgradeToV2()', async () => {
      const { factory } = await loadFixture(fixture);

      const _implementations = {
        accessToken: factory.address,
        creditToken: factory.address,
        royaltiesReceiver: factory.address,
        vestingWallet: factory.address,
      };

      const _royalties = {
        amountToCreator: 2020,
        amountToPlatform: 3030,
      };

      const tx = await factory.upgradeToV2(_royalties, _implementations);

      await expect(tx).to.emit(factory, 'FactoryParametersSet');
      expect((await factory.royaltiesParameters()).amountToCreator).to.eq(_royalties.amountToCreator);
      expect((await factory.royaltiesParameters()).amountToPlatform).to.eq(_royalties.amountToPlatform);
      expect((await factory.implementations()).accessToken).to.eq(_implementations.accessToken);
      expect((await factory.implementations()).creditToken).to.eq(_implementations.creditToken);
      expect((await factory.implementations()).royaltiesReceiver).to.eq(_implementations.royaltiesReceiver);
      expect((await factory.implementations()).vestingWallet).to.eq(_implementations.vestingWallet);

      await expect(factory.upgradeToV2(_royalties, _implementations)).to.be.revertedWithCustomError(
        factory,
        'InvalidInitialization',
      );
    });
  });

  describe('Deploy AccessToken', () => {
    it('should correct deploy AccessToken instance', async () => {
      const { signatureVerifier, factory, validator, alice, signer } = await loadFixture(fixture);

      const nftName = 'AccessToken 1';
      const nftSymbol = 'AT1';
      const contractURI = 'contractURI/AccessToken123';
      const price = ethers.utils.parseEther('0.05');
      const feeNumerator = 500;

      const message = hashAccessTokenInfo(nftName, nftSymbol, contractURI, feeNumerator, chainId);
      const signature = EthCrypto.sign(signer.privateKey, message);
      const info: AccessTokenInfoStruct = {
        metadata: { name: nftName, symbol: nftSymbol },
        contractURI: contractURI,
        paymentToken: NATIVE_CURRENCY_ADDRESS,
        mintPrice: price,
        whitelistMintPrice: price,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator,
        collectionExpire: BigNumber.from('86400'),
        signature: signature,
      };

      const fakeInfo = info;

      const emptyNameMessage = hashAccessTokenInfo('', nftSymbol, contractURI, feeNumerator, chainId);
      const emptyNameSignature = EthCrypto.sign(signer.privateKey, emptyNameMessage);
      fakeInfo.signature = emptyNameSignature;
      await expect(factory.connect(alice).produce(fakeInfo, ethers.constants.HashZero)).to.be.revertedWithCustomError(
        signatureVerifier,
        'InvalidSignature',
      );

      const emptySymbolMessage = hashAccessTokenInfo(nftName, '', contractURI, feeNumerator, chainId);
      const emptySymbolSignature = EthCrypto.sign(signer.privateKey, emptySymbolMessage);
      fakeInfo.signature = emptySymbolSignature;
      await expect(factory.connect(alice).produce(fakeInfo, ethers.constants.HashZero)).to.be.revertedWithCustomError(
        signatureVerifier,
        'InvalidSignature',
      );

      const badMessage = hashAccessTokenInfo(nftName, nftSymbol, contractURI, feeNumerator, chainId + 1);
      const badSignature = EthCrypto.sign(signer.privateKey, badMessage);
      fakeInfo.signature = badSignature;
      await expect(factory.connect(alice).produce(fakeInfo, ethers.constants.HashZero)).to.be.revertedWithCustomError(
        signatureVerifier,
        'InvalidSignature',
      );
      fakeInfo.signature = signature;

      fakeInfo.metadata.name = '';
      await expect(factory.connect(alice).produce(fakeInfo, ethers.constants.HashZero))
        .to.be.revertedWithCustomError(signatureVerifier, 'EmptyMetadata')
        .withArgs(fakeInfo.metadata.name, fakeInfo.metadata.symbol);
      fakeInfo.metadata.name = nftName;

      fakeInfo.metadata.symbol = '';
      await expect(factory.connect(alice).produce(fakeInfo, ethers.constants.HashZero))
        .to.be.revertedWithCustomError(signatureVerifier, 'EmptyMetadata')
        .withArgs(fakeInfo.metadata.name, fakeInfo.metadata.symbol);
      fakeInfo.metadata.symbol = nftSymbol;

      const tx = await factory.connect(alice).produce(info, ethers.constants.HashZero);

      await expect(tx).to.emit(factory, 'AccessTokenCreated');
      const nftInstanceInfo = await factory.nftInstanceInfo(nftName, nftSymbol);
      expect(nftInstanceInfo.nftAddress).to.not.be.equal(ZERO_ADDRESS);
      expect(nftInstanceInfo.metadata.name).to.be.equal(nftName);
      expect(nftInstanceInfo.metadata.symbol).to.be.equal(nftSymbol);
      expect(nftInstanceInfo.creator).to.be.equal(alice.address);

      console.log('instanceAddress = ', nftInstanceInfo.nftAddress);

      const nft = await ethers.getContractAt('AccessToken', nftInstanceInfo.nftAddress);
      const [factoryAddress, creator, feeReceiver, , infoReturned] = await nft.parameters();

      expect(await nft.getTransferValidator()).to.be.equal(validator.address);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.paymentToken).to.be.equal(info.paymentToken);
      expect(infoReturned.mintPrice).to.be.equal(info.mintPrice);
      expect(infoReturned.contractURI).to.be.equal(info.contractURI);
      expect(creator).to.be.equal(alice.address);

      const RoyaltiesReceiverV2: RoyaltiesReceiverV2 = await ethers.getContractAt('RoyaltiesReceiverV2', feeReceiver);

      let payees: RoyaltiesReceiverV2.RoyaltiesReceiversStruct = await RoyaltiesReceiverV2.royaltiesReceivers();

      const shares = await Promise.all([
        RoyaltiesReceiverV2.shares(payees.creator),
        RoyaltiesReceiverV2.shares(payees.platform),
        payees.referral === ethers.constants.AddressZero
          ? Promise.resolve(ethers.BigNumber.from(0))
          : RoyaltiesReceiverV2.shares(payees.referral),
      ]);

      expect(payees.creator).to.eq(alice.address);
      expect(payees.platform).to.eq((await factory.nftFactoryParameters()).platformAddress);
      expect(payees.referral).to.eq(ZERO_ADDRESS);
      expect(shares[0]).to.eq(8000);
      expect(shares[1]).to.eq(2000);
      expect(shares[2]).to.eq(0);
    });

    it('should correctly deploy several AccessToken nfts', async () => {
      const { factory, alice, bob, charlie, signer } = await loadFixture(fixture);

      const nftName1 = 'AccessToken 1';
      const nftName2 = 'AccessToken 2';
      const nftName3 = 'AccessToken 3';
      const nftSymbol1 = 'AT1';
      const nftSymbol2 = 'AT2';
      const nftSymbol3 = 'AT3';
      const contractURI1 = 'contractURI1/AccessToken123';
      const contractURI2 = 'contractURI2/AccessToken123';
      const contractURI3 = 'contractURI3/AccessToken123';
      const price1 = ethers.utils.parseEther('0.01');
      const price2 = ethers.utils.parseEther('0.02');
      const price3 = ethers.utils.parseEther('0.03');

      const message1 = hashAccessTokenInfo(nftName1, nftSymbol1, contractURI1, 500, chainId);
      const signature1 = EthCrypto.sign(signer.privateKey, message1);

      await factory.connect(alice).produce(
        {
          metadata: { name: nftName1, symbol: nftSymbol1 },
          contractURI: contractURI1,
          paymentToken: ZERO_ADDRESS,
          mintPrice: price1,
          whitelistMintPrice: price1,
          transferable: true,
          maxTotalSupply: BigNumber.from('1000'),
          feeNumerator: BigNumber.from('500'),
          collectionExpire: BigNumber.from('86400'),
          signature: signature1,
        } as AccessTokenInfoStructOutput,
        ethers.constants.HashZero,
      );

      const message2 = hashAccessTokenInfo(nftName2, nftSymbol2, contractURI2, 0, chainId);
      const signature2 = EthCrypto.sign(signer.privateKey, message2);

      await factory.connect(bob).produce(
        {
          metadata: { name: nftName2, symbol: nftSymbol2 },
          contractURI: contractURI2,
          paymentToken: NATIVE_CURRENCY_ADDRESS,
          mintPrice: price2,
          whitelistMintPrice: price2,
          transferable: true,
          maxTotalSupply: BigNumber.from('1000'),
          feeNumerator: 0,
          collectionExpire: BigNumber.from('86400'),
          signature: signature2,
        } as AccessTokenInfoStruct,
        ethers.constants.HashZero,
      );

      const message3 = hashAccessTokenInfo(nftName3, nftSymbol3, contractURI3, 500, chainId);
      const signature3 = EthCrypto.sign(signer.privateKey, message3);

      await factory.connect(charlie).produce(
        {
          metadata: { name: nftName3, symbol: nftSymbol3 },
          contractURI: contractURI3,
          paymentToken: NATIVE_CURRENCY_ADDRESS,
          mintPrice: price3,
          whitelistMintPrice: price3,
          transferable: true,
          maxTotalSupply: BigNumber.from('1000'),
          feeNumerator: BigNumber.from('500'),
          collectionExpire: BigNumber.from('86400'),
          signature: signature3,
        } as AccessTokenInfoStruct,
        ethers.constants.HashZero,
      );

      const instanceInfo1 = await factory.nftInstanceInfo(nftName1, nftSymbol1);
      const instanceInfo2 = await factory.nftInstanceInfo(nftName2, nftSymbol2);
      const instanceInfo3 = await factory.nftInstanceInfo(nftName3, nftSymbol3);

      expect(instanceInfo1.nftAddress).to.not.be.equal(ZERO_ADDRESS);
      expect(instanceInfo2.nftAddress).to.not.be.equal(ZERO_ADDRESS);
      expect(instanceInfo3.nftAddress).to.not.be.equal(ZERO_ADDRESS);

      expect(instanceInfo1.metadata.name).to.be.equal(nftName1);
      expect(instanceInfo1.metadata.symbol).to.be.equal(nftSymbol1);
      expect(instanceInfo1.creator).to.be.equal(alice.address);

      expect(instanceInfo2.metadata.name).to.be.equal(nftName2);
      expect(instanceInfo2.metadata.symbol).to.be.equal(nftSymbol2);
      expect(instanceInfo2.creator).to.be.equal(bob.address);

      expect(instanceInfo3.metadata.name).to.be.equal(nftName3);
      expect(instanceInfo3.metadata.symbol).to.be.equal(nftSymbol3);
      expect(instanceInfo3.creator).to.be.equal(charlie.address);

      console.log('instanceAddress1 = ', instanceInfo1.nftAddress);
      console.log('instanceAddress2 = ', instanceInfo2.nftAddress);
      console.log('instanceAddress3 = ', instanceInfo3.nftAddress);

      const nft1 = await ethers.getContractAt('AccessToken', instanceInfo1.nftAddress);
      let [factoryAddress, creator, feeReceiver, referralCode, infoReturned] = await nft1.parameters();
      expect(infoReturned.paymentToken).to.be.equal(NATIVE_CURRENCY_ADDRESS);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.mintPrice).to.be.equal(price1);
      expect(infoReturned.contractURI).to.be.equal(contractURI1);
      expect(creator).to.be.equal(alice.address);
      expect(feeReceiver).not.to.be.equal(ZERO_ADDRESS);

      const nft2 = await ethers.getContractAt('AccessToken', instanceInfo2.nftAddress);
      [factoryAddress, creator, feeReceiver, referralCode, infoReturned] = await nft2.parameters();
      expect(infoReturned.paymentToken).to.be.equal(NATIVE_CURRENCY_ADDRESS);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.mintPrice).to.be.equal(price2);
      expect(infoReturned.contractURI).to.be.equal(contractURI2);
      expect(creator).to.be.equal(bob.address);
      expect(feeReceiver).to.be.equal(ZERO_ADDRESS);

      const nft3 = await ethers.getContractAt('AccessToken', instanceInfo3.nftAddress);
      [factoryAddress, creator, feeReceiver, referralCode, infoReturned] = await nft3.parameters();
      expect(infoReturned.paymentToken).to.be.equal(NATIVE_CURRENCY_ADDRESS);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.mintPrice).to.be.equal(price3);
      expect(infoReturned.contractURI).to.be.equal(contractURI3);
      expect(creator).to.be.equal(charlie.address);
      expect(feeReceiver).not.to.be.equal(ZERO_ADDRESS);
    });
  });

  describe('Deploy CreditToken', () => {
    it('should correct deploy CreditToken instance', async () => {
      const { signatureVerifier, factory, alice, signer } = await loadFixture(fixture);

      const nftName = 'CreditToken 1';
      const nftSymbol = 'CT1';
      const uri = 'contractURI/CreditToken123';

      const ctInfo: ERC1155InfoStruct = {
        name: nftName,
        symbol: nftSymbol,
        defaultAdmin: alice.address,
        manager: alice.address,
        minter: alice.address,
        burner: alice.address,
        uri: uri,
        transferable: true,
      };

      const fakeInfo = ctInfo;

      const message = hashERC1155Info(ctInfo, chainId);
      const signature = EthCrypto.sign(signer.privateKey, message);

      const emptyNameMessage = hashERC1155Info(
        {
          name: '',
          symbol: nftSymbol,
          defaultAdmin: alice.address,
          manager: alice.address,
          minter: alice.address,
          burner: alice.address,
          uri: uri,
          transferable: true,
        },
        chainId,
      );
      const emptyNameSignature = EthCrypto.sign(signer.privateKey, emptyNameMessage);
      await expect(
        factory.connect(alice).produceCreditToken(fakeInfo, emptyNameSignature),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');

      const emptySymbolMessage = hashERC1155Info(
        {
          name: nftName,
          symbol: '',
          defaultAdmin: alice.address,
          manager: alice.address,
          minter: alice.address,
          burner: alice.address,
          uri: uri,
          transferable: true,
        },
        chainId,
      );
      const emptySymbolSignature = EthCrypto.sign(signer.privateKey, emptySymbolMessage);
      await expect(
        factory.connect(alice).produceCreditToken(ctInfo, emptySymbolSignature),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');

      const badMessage = hashERC1155Info(ctInfo, chainId + 1);
      const badSignature = EthCrypto.sign(signer.privateKey, badMessage);
      await expect(factory.connect(alice).produceCreditToken(ctInfo, badSignature)).to.be.revertedWithCustomError(
        signatureVerifier,
        'InvalidSignature',
      );

      fakeInfo.name = '';
      await expect(factory.connect(alice).produceCreditToken(fakeInfo, emptyNameSignature))
        .to.be.revertedWithCustomError(signatureVerifier, 'EmptyMetadata')
        .withArgs(fakeInfo.name, fakeInfo.symbol);
      fakeInfo.name = nftName;

      fakeInfo.symbol = '';
      await expect(factory.connect(alice).produceCreditToken(fakeInfo, emptyNameSignature))
        .to.be.revertedWithCustomError(signatureVerifier, 'EmptyMetadata')
        .withArgs(fakeInfo.name, fakeInfo.symbol);
      fakeInfo.symbol = nftSymbol;

      const tx = await factory.connect(alice).produceCreditToken(ctInfo, signature);

      await expect(tx).to.emit(factory, 'CreditTokenCreated');
      const nftInstanceInfo = await factory.getCreditTokenInstanceInfo(nftName, nftSymbol);
      expect(nftInstanceInfo.creditToken).to.not.be.equal(ZERO_ADDRESS);
      expect(nftInstanceInfo.name).to.be.equal(nftName);
      expect(nftInstanceInfo.symbol).to.be.equal(nftSymbol);

      console.log('instanceAddress = ', nftInstanceInfo.creditToken);

      const nft: CreditToken = await ethers.getContractAt('CreditToken', nftInstanceInfo.creditToken);

      expect(await nft.name()).to.be.equal(nftName);
      expect(await nft.symbol()).to.be.equal(nftSymbol);
      expect(await nft['uri()']()).to.be.equal(uri);
      expect(await nft.transferable()).to.be.true;
      expect(await nft.hasRole(alice.address, await nft.DEFAULT_ADMIN_ROLE())).to.be.true;
      expect(await nft.hasRole(alice.address, await nft.MANAGER_ROLE())).to.be.true;
      expect(await nft.hasRole(alice.address, await nft.MINTER_ROLE())).to.be.true;
      expect(await nft.hasRole(alice.address, await nft.BURNER_ROLE())).to.be.true;

      await expect(factory.connect(alice).produceCreditToken(ctInfo, signature)).to.be.revertedWithCustomError(
        factory,
        'TokenAlreadyExists',
      );
    });

    it('should correctly deploy several CreditToken nfts', async () => {
      const { factory, alice, bob, charlie, signer } = await loadFixture(fixture);

      const nftName1 = 'CreditToken 1';
      const nftName2 = 'CreditToken 2';
      const nftName3 = 'CreditToken 3';
      const nftSymbol1 = 'CT1';
      const nftSymbol2 = 'CT2';
      const nftSymbol3 = 'CT3';
      const uri1 = 'contractURI1/CreditToken123';
      const uri2 = 'contractURI2/CreditToken123';
      const uri3 = 'contractURI3/CreditToken123';

      const info1: ERC1155InfoStruct = {
        name: nftName1,
        symbol: nftSymbol1,
        defaultAdmin: alice.address,
        manager: alice.address,
        minter: alice.address,
        burner: alice.address,
        uri: uri1,
        transferable: true,
      };
      const message1 = hashERC1155Info(info1, chainId);
      const signature1 = EthCrypto.sign(signer.privateKey, message1);
      await factory.connect(alice).produceCreditToken(info1, signature1);

      const info2: ERC1155InfoStruct = {
        name: nftName2,
        symbol: nftSymbol2,
        defaultAdmin: bob.address,
        manager: bob.address,
        minter: bob.address,
        burner: bob.address,
        uri: uri2,
        transferable: true,
      };
      const message2 = hashERC1155Info(info2, chainId);
      const signature2 = EthCrypto.sign(signer.privateKey, message2);
      await factory.connect(bob).produceCreditToken(info2, signature2);

      const info3: ERC1155InfoStruct = {
        name: nftName3,
        symbol: nftSymbol3,
        defaultAdmin: charlie.address,
        manager: charlie.address,
        minter: charlie.address,
        burner: charlie.address,
        uri: uri3,
        transferable: true,
      };
      const message3 = hashERC1155Info(info3, chainId);
      const signature3 = EthCrypto.sign(signer.privateKey, message3);
      await factory.connect(bob).produceCreditToken(info3, signature3);

      const instanceInfo1 = await factory.getCreditTokenInstanceInfo(nftName1, nftSymbol1);
      const instanceInfo2 = await factory.getCreditTokenInstanceInfo(nftName2, nftSymbol2);
      const instanceInfo3 = await factory.getCreditTokenInstanceInfo(nftName3, nftSymbol3);

      expect(instanceInfo1.creditToken).to.not.be.equal(ZERO_ADDRESS);
      expect(instanceInfo1.name).to.be.equal(nftName1);
      expect(instanceInfo1.symbol).to.be.equal(nftSymbol1);

      expect(instanceInfo2.creditToken).to.not.be.equal(ZERO_ADDRESS);
      expect(instanceInfo2.name).to.be.equal(nftName2);
      expect(instanceInfo2.symbol).to.be.equal(nftSymbol2);

      expect(instanceInfo3.creditToken).to.not.be.equal(ZERO_ADDRESS);
      expect(instanceInfo3.name).to.be.equal(nftName3);
      expect(instanceInfo3.symbol).to.be.equal(nftSymbol3);

      console.log('instanceAddress1 = ', instanceInfo1.creditToken);
      console.log('instanceAddress2 = ', instanceInfo2.creditToken);
      console.log('instanceAddress3 = ', instanceInfo3.creditToken);

      const nft1: CreditToken = await ethers.getContractAt('CreditToken', instanceInfo1.creditToken);

      expect(await nft1.name()).to.be.equal(nftName1);
      expect(await nft1.symbol()).to.be.equal(nftSymbol1);
      expect(await nft1['uri()']()).to.be.equal(uri1);
      expect(await nft1.transferable()).to.be.true;
      expect(await nft1.hasRole(alice.address, await nft1.DEFAULT_ADMIN_ROLE())).to.be.true;
      expect(await nft1.hasRole(alice.address, await nft1.MANAGER_ROLE())).to.be.true;
      expect(await nft1.hasRole(alice.address, await nft1.MINTER_ROLE())).to.be.true;
      expect(await nft1.hasRole(alice.address, await nft1.BURNER_ROLE())).to.be.true;

      const nft2: CreditToken = await ethers.getContractAt('CreditToken', instanceInfo2.creditToken);

      expect(await nft2.name()).to.be.equal(nftName2);
      expect(await nft2.symbol()).to.be.equal(nftSymbol2);
      expect(await nft2['uri()']()).to.be.equal(uri2);
      expect(await nft2.transferable()).to.be.true;
      expect(await nft2.hasRole(bob.address, await nft2.DEFAULT_ADMIN_ROLE())).to.be.true;
      expect(await nft2.hasRole(bob.address, await nft2.MANAGER_ROLE())).to.be.true;
      expect(await nft2.hasRole(bob.address, await nft2.MINTER_ROLE())).to.be.true;
      expect(await nft2.hasRole(bob.address, await nft2.BURNER_ROLE())).to.be.true;

      const nft3: CreditToken = await ethers.getContractAt('CreditToken', instanceInfo3.creditToken);

      expect(await nft3.name()).to.be.equal(nftName3);
      expect(await nft3.symbol()).to.be.equal(nftSymbol3);
      expect(await nft3['uri()']()).to.be.equal(uri3);
      expect(await nft3.transferable()).to.be.true;
      expect(await nft3.hasRole(charlie.address, await nft3.DEFAULT_ADMIN_ROLE())).to.be.true;
      expect(await nft3.hasRole(charlie.address, await nft3.MANAGER_ROLE())).to.be.true;
      expect(await nft3.hasRole(charlie.address, await nft3.MINTER_ROLE())).to.be.true;
      expect(await nft3.hasRole(charlie.address, await nft3.BURNER_ROLE())).to.be.true;
    });
  });

  describe('Deploy VestingWallet', () => {
    it('should correct deploy VestingWallet instance', async () => {
      const { LONG, signatureVerifier, factory, owner, alice, signer } = await loadFixture(fixture);

      const description = 'VestingWallet';

      const now = await time.latest();
      const startTimestamp = now + 5;
      const cliffDurationSeconds = 60;
      const durationSeconds = 360;

      let info: VestingWalletInfoStruct = {
        startTimestamp,
        cliffDurationSeconds: 0,
        durationSeconds: 0,
        token: LONG.address,
        beneficiary: alice.address,
        totalAllocation: ethers.utils.parseEther('100'), // 100 LONG
        tgeAmount: ethers.utils.parseEther('100'), // 10 LONG at TGE
        linearAllocation: ethers.utils.parseEther('60'), // 60 LONG linearly after cliff for 360s
        description,
      };

      let message = hashVestingInfo(owner.address, info, chainId);
      let signature = EthCrypto.sign(signer.privateKey, message);

      await expect(
        factory
          .connect(owner)
          .deployVestingWalletWithInitialFunding(owner.address, info, signature, info.totalAllocation),
      )
        .to.be.revertedWithCustomError(factory, 'BadDurations')
        .withArgs(0, 0);

      info.durationSeconds = 1;
      message = hashVestingInfo(owner.address, info, chainId);
      signature = EthCrypto.sign(signer.privateKey, message);
      await expect(
        factory
          .connect(owner)
          .deployVestingWalletWithInitialFunding(owner.address, info, signature, info.totalAllocation),
      )
        .to.be.revertedWithCustomError(factory, 'AllocationMismatch')
        .withArgs(BigNumber.from(info.linearAllocation).add(await info.tgeAmount), info.totalAllocation);

      const vestingWalletInfo: VestingWalletInfoStruct = {
        startTimestamp,
        cliffDurationSeconds,
        durationSeconds,
        token: LONG.address,
        beneficiary: alice.address,
        totalAllocation: ethers.utils.parseEther('100'),
        tgeAmount: ethers.utils.parseEther('10'),
        linearAllocation: ethers.utils.parseEther('60'),
        description,
      };

      const vestingWalletMessage = hashVestingInfo(owner.address, vestingWalletInfo, chainId);
      const venueTokenSignature = EthCrypto.sign(signer.privateKey, vestingWalletMessage);

      const wrongMessage = hashVestingInfo(owner.address, vestingWalletInfo, chainId + 1);
      const wrongSignature = EthCrypto.sign(signer.privateKey, wrongMessage);

      await expect(
        factory.connect(owner).deployVestingWalletWithInitialFunding(
          owner.address,
          vestingWalletInfo,
          wrongSignature,
          vestingWalletInfo.totalAllocation,
        ),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');
      await expect(
        factory.connect(alice).deployVestingWalletWithInitialFunding(
          owner.address,
          vestingWalletInfo,
          wrongSignature,
          vestingWalletInfo.totalAllocation,
        ),
      ).to.be.revertedWithCustomError(factory, 'NotEnoughFundsToVest');

      await LONG.approve(factory.address, vestingWalletInfo.totalAllocation);

      const tx = await factory
        .connect(owner)
        .deployVestingWalletWithInitialFunding(
          owner.address,
          vestingWalletInfo,
          venueTokenSignature,
          vestingWalletInfo.totalAllocation,
        );

      await expect(tx).to.emit(factory, 'VestingWalletCreated');
      const vestingWalletInstanceInfo = await factory.getVestingWalletInstanceInfo(vestingWalletInfo.beneficiary, 0);
      expect(vestingWalletInstanceInfo.vestingWallet).to.not.be.equal(ZERO_ADDRESS);
      expect(vestingWalletInstanceInfo.description).to.be.equal(description);

      console.log('instanceAddress = ', vestingWalletInstanceInfo.vestingWallet);

      const vestingWallet: VestingWalletExtended = await ethers.getContractAt(
        'VestingWalletExtended',
        vestingWalletInstanceInfo.vestingWallet,
      );

      expect(await vestingWallet.description()).to.be.equal(description);
      expect((await vestingWallet.vestingStorage()).beneficiary).to.be.equal(vestingWalletInfo.beneficiary);
      expect((await vestingWallet.vestingStorage()).cliffDurationSeconds).to.be.equal(
        vestingWalletInfo.cliffDurationSeconds,
      );
      expect((await vestingWallet.vestingStorage()).durationSeconds).to.be.equal(vestingWalletInfo.durationSeconds);
      expect((await vestingWallet.vestingStorage()).linearAllocation).to.be.equal(vestingWalletInfo.linearAllocation);
      expect((await vestingWallet.vestingStorage()).startTimestamp).to.be.equal(vestingWalletInfo.startTimestamp);
      expect((await vestingWallet.vestingStorage()).tgeAmount).to.be.equal(vestingWalletInfo.tgeAmount);
      expect((await vestingWallet.vestingStorage()).token).to.be.equal(vestingWalletInfo.token);
      expect((await vestingWallet.vestingStorage()).totalAllocation).to.be.equal(vestingWalletInfo.totalAllocation);
      expect(await vestingWallet.owner()).to.be.equal(owner.address);

      expect(await vestingWallet.start()).to.be.equal(startTimestamp);
      expect(await vestingWallet.cliff()).to.be.equal(startTimestamp + cliffDurationSeconds);
      expect(await vestingWallet.duration()).to.be.equal(durationSeconds);
      expect(await vestingWallet.end()).to.be.equal(startTimestamp + cliffDurationSeconds + durationSeconds);

      expect(await LONG.balanceOf(vestingWallet.address)).to.eq(vestingWalletInfo.totalAllocation);
    });

    it('should deploy VestingWallet with optional initial funding', async () => {
      const { LONG, factory, owner, alice, signer } = await loadFixture(fixture);

      const description = 'VestingWallet optional funding';

      const now = await time.latest();
      const startTimestamp = now + 5;
      const cliffDurationSeconds = 60;
      const durationSeconds = 360;

      const vestingWalletInfo: VestingWalletInfoStruct = {
        startTimestamp,
        cliffDurationSeconds,
        durationSeconds,
        token: LONG.address,
        beneficiary: alice.address,
        totalAllocation: ethers.utils.parseEther('100'),
        tgeAmount: ethers.utils.parseEther('10'),
        linearAllocation: ethers.utils.parseEther('60'),
        description,
      };

      const vestingWalletMessage = hashVestingInfo(owner.address, vestingWalletInfo, chainId);
      const signature = EthCrypto.sign(signer.privateKey, vestingWalletMessage);

      const invalidInitialFunding = vestingWalletInfo.totalAllocation.add(1);
      await expect(
        factory
          .connect(owner)
          .deployVestingWalletWithInitialFunding(owner.address, vestingWalletInfo, signature, invalidInitialFunding),
      )
        .to.be.revertedWithCustomError(factory, 'InitialFundingExceedsAllocation')
        .withArgs(invalidInitialFunding, vestingWalletInfo.totalAllocation);

      const tx = await factory
        .connect(alice)
        .deployVestingWalletWithInitialFunding(owner.address, vestingWalletInfo, signature, 0);

      await expect(tx).to.emit(factory, 'VestingWalletCreated');

      const vestingWalletInstanceInfo = await factory.getVestingWalletInstanceInfo(vestingWalletInfo.beneficiary, 0);
      expect(vestingWalletInstanceInfo.vestingWallet).to.not.be.equal(ZERO_ADDRESS);

      const vestingWallet: VestingWalletExtended = await ethers.getContractAt(
        'VestingWalletExtended',
        vestingWalletInstanceInfo.vestingWallet,
      );

      expect(await vestingWallet.owner()).to.be.equal(owner.address);
      expect(await LONG.balanceOf(vestingWallet.address)).to.eq(0);
    });

    it('should correctly deploy several VestingWallets', async () => {
      const { LONG, factory, owner, alice, bob, charlie, signer } = await loadFixture(fixture);

      const description1 = 'VestingWallet 1';
      const description2 = 'VestingWallet 2';
      const description3 = 'VestingWallet 3';

      const now1 = await time.latest();
      const startTimestamp1 = now1 + 5;
      const cliffDurationSeconds1 = 60;
      const durationSeconds1 = 360;

      const vestingWalletInfo1: VestingWalletInfoStruct = {
        startTimestamp: startTimestamp1,
        cliffDurationSeconds: cliffDurationSeconds1,
        durationSeconds: durationSeconds1,
        token: LONG.address,
        beneficiary: alice.address,
        totalAllocation: ethers.utils.parseEther('100'),
        tgeAmount: ethers.utils.parseEther('10'),
        linearAllocation: ethers.utils.parseEther('60'),
        description: description1,
      };

      const vestingWalletMessage1 = hashVestingInfo(owner.address, vestingWalletInfo1, chainId);
      const venueTokenSignature1 = EthCrypto.sign(signer.privateKey, vestingWalletMessage1);

      await LONG.approve(factory.address, vestingWalletInfo1.totalAllocation);

      await factory.connect(owner).deployVestingWalletWithInitialFunding(
        owner.address,
        vestingWalletInfo1,
        venueTokenSignature1,
        vestingWalletInfo1.totalAllocation,
      );

      const now2 = await time.latest();
      const startTimestamp2 = now2 + 5;
      const cliffDurationSeconds2 = 60;
      const durationSeconds2 = 360;

      const vestingWalletInfo2: VestingWalletInfoStruct = {
        startTimestamp: startTimestamp2,
        cliffDurationSeconds: cliffDurationSeconds2,
        durationSeconds: durationSeconds2,
        token: LONG.address,
        beneficiary: bob.address,
        totalAllocation: ethers.utils.parseEther('100'),
        tgeAmount: ethers.utils.parseEther('10'),
        linearAllocation: ethers.utils.parseEther('60'),
        description: description2,
      };

      const vestingWalletMessage2 = hashVestingInfo(owner.address, vestingWalletInfo2, chainId);
      const venueTokenSignature2 = EthCrypto.sign(signer.privateKey, vestingWalletMessage2);

      await LONG.approve(factory.address, vestingWalletInfo2.totalAllocation);

      await factory.connect(owner).deployVestingWalletWithInitialFunding(
        owner.address,
        vestingWalletInfo2,
        venueTokenSignature2,
        vestingWalletInfo2.totalAllocation,
      );

      const now3 = await time.latest();
      const startTimestamp3 = now3 + 5;
      const cliffDurationSeconds3 = 60;
      const durationSeconds3 = 360;

      const vestingWalletInfo3: VestingWalletInfoStruct = {
        startTimestamp: startTimestamp3,
        cliffDurationSeconds: cliffDurationSeconds3,
        durationSeconds: durationSeconds3,
        token: LONG.address,
        beneficiary: charlie.address,
        totalAllocation: ethers.utils.parseEther('100'),
        tgeAmount: ethers.utils.parseEther('10'),
        linearAllocation: ethers.utils.parseEther('60'),
        description: description3,
      };

      const vestingWalletMessage3 = hashVestingInfo(owner.address, vestingWalletInfo3, chainId);
      const venueTokenSignature3 = EthCrypto.sign(signer.privateKey, vestingWalletMessage3);

      await LONG.approve(factory.address, vestingWalletInfo3.totalAllocation);

      await factory.connect(owner).deployVestingWalletWithInitialFunding(
        owner.address,
        vestingWalletInfo3,
        venueTokenSignature3,
        vestingWalletInfo3.totalAllocation,
      );

      const vestingWalletInstanceInfo1 = await factory.getVestingWalletInstanceInfo(vestingWalletInfo1.beneficiary, 0);
      const vestingWalletInstanceInfo2 = await factory.getVestingWalletInstanceInfo(vestingWalletInfo2.beneficiary, 0);
      const vestingWalletInstanceInfo3 = await factory.getVestingWalletInstanceInfo(vestingWalletInfo3.beneficiary, 0);

      expect(vestingWalletInstanceInfo1.vestingWallet).to.not.be.equal(ZERO_ADDRESS);
      expect(vestingWalletInstanceInfo1.description).to.be.equal(description1);

      expect(vestingWalletInstanceInfo2.vestingWallet).to.not.be.equal(ZERO_ADDRESS);
      expect(vestingWalletInstanceInfo2.description).to.be.equal(description2);

      expect(vestingWalletInstanceInfo3.vestingWallet).to.not.be.equal(ZERO_ADDRESS);
      expect(vestingWalletInstanceInfo3.description).to.be.equal(description3);

      console.log('instanceAddress1 = ', vestingWalletInstanceInfo1.vestingWallet);
      console.log('instanceAddress2 = ', vestingWalletInstanceInfo2.vestingWallet);
      console.log('instanceAddress3 = ', vestingWalletInstanceInfo3.vestingWallet);

      const vestingWallet1: VestingWalletExtended = await ethers.getContractAt(
        'VestingWalletExtended',
        vestingWalletInstanceInfo1.vestingWallet,
      );

      expect(await vestingWallet1.start()).to.be.equal(startTimestamp1);
      expect(await vestingWallet1.cliff()).to.be.equal(startTimestamp1 + cliffDurationSeconds1);
      expect(await vestingWallet1.duration()).to.be.equal(durationSeconds1);
      expect(await vestingWallet1.end()).to.be.equal(startTimestamp1 + cliffDurationSeconds1 + durationSeconds1);

      const vestingWallet2: VestingWalletExtended = await ethers.getContractAt(
        'VestingWalletExtended',
        vestingWalletInstanceInfo2.vestingWallet,
      );

      expect(await vestingWallet2.start()).to.be.equal(startTimestamp2);
      expect(await vestingWallet2.cliff()).to.be.equal(startTimestamp2 + cliffDurationSeconds2);
      expect(await vestingWallet2.duration()).to.be.equal(durationSeconds2);
      expect(await vestingWallet2.end()).to.be.equal(startTimestamp2 + cliffDurationSeconds2 + durationSeconds2);

      const vestingWallet3: VestingWalletExtended = await ethers.getContractAt(
        'VestingWalletExtended',
        vestingWalletInstanceInfo3.vestingWallet,
      );

      expect(await vestingWallet3.start()).to.be.equal(startTimestamp3);
      expect(await vestingWallet3.cliff()).to.be.equal(startTimestamp3 + cliffDurationSeconds3);
      expect(await vestingWallet3.duration()).to.be.equal(durationSeconds3);
      expect(await vestingWallet3.end()).to.be.equal(startTimestamp3 + cliffDurationSeconds3 + durationSeconds3);
    });
  });

  describe('Referrals', () => {
    it('Can create referral code', async () => {
      const { factory, alice } = await loadFixture(fixture);

      const hashedCode = EthCrypto.hash.keccak256([
        { type: 'address', value: alice.address },
        { type: 'address', value: factory.address },
        { type: 'uint256', value: chainId },
      ]);

      const tx = await factory.connect(alice).createReferralCode();

      await expect(tx).to.emit(factory, 'ReferralCodeCreated').withArgs(alice.address, hashedCode);
      expect(await factory.getReferralCreator(hashedCode)).to.eq(alice.address);
      expect(await factory.getReferralCodeByCreator(alice.address)).to.eq(hashedCode);

      await expect(factory.connect(alice).createReferralCode())
        .to.be.revertedWithCustomError(factory, 'ReferralCodeExists')
        .withArgs(alice.address, hashedCode);
    });

    it('Can set referral', async () => {
      const { factory, signer, alice, bob } = await loadFixture(fixture);

      const hashedCode = EthCrypto.hash.keccak256([
        { type: 'address', value: alice.address },
        { type: 'address', value: factory.address },
        { type: 'uint256', value: chainId },
      ]);

      const hashedCodeFalse = EthCrypto.hash.keccak256([
        { type: 'address', value: bob.address },
        { type: 'address', value: factory.address },
        { type: 'uint256', value: chainId },
      ]);

      await factory.connect(alice).createReferralCode();

      let nftName = 'Name';
      let nftSymbol = 'AT';
      const contractURI = 'contractURI/AccessToken123';
      const price = ethers.utils.parseEther('0.01');
      const feeNumerator = 500;

      let message = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName },
        { type: 'string', value: nftSymbol },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: feeNumerator },
        { type: 'uint256', value: chainId },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);

      await expect(
        factory.connect(alice).produce(
          {
            metadata: { name: nftName, symbol: nftSymbol },
            contractURI: contractURI,
            paymentToken: NATIVE_CURRENCY_ADDRESS,
            mintPrice: price,
            whitelistMintPrice: price,
            transferable: true,
            maxTotalSupply: BigNumber.from('1000'),
            feeNumerator: feeNumerator,
            collectionExpire: BigNumber.from('86400'),
            signature: signature,
          } as AccessTokenInfoStruct,
          hashedCodeFalse,
        ),
      ).to.be.revertedWithCustomError(factory, 'ReferralCreatorNotExists');

      await expect(
        factory.connect(alice).produce(
          {
            metadata: { name: nftName, symbol: nftSymbol },
            contractURI: contractURI,
            paymentToken: NATIVE_CURRENCY_ADDRESS,
            mintPrice: price,
            whitelistMintPrice: price,
            transferable: true,
            maxTotalSupply: BigNumber.from('1000'),
            feeNumerator: feeNumerator,
            collectionExpire: BigNumber.from('86400'),
            signature: signature,
          } as AccessTokenInfoStruct,
          hashedCode,
        ),
      ).to.be.revertedWithCustomError(factory, 'ReferralUserIsReferralCreator');

      const tx = await factory.connect(bob).produce(
        {
          metadata: { name: nftName, symbol: nftSymbol },
          contractURI: contractURI,
          paymentToken: NATIVE_CURRENCY_ADDRESS,
          mintPrice: price,
          whitelistMintPrice: price,
          transferable: true,
          maxTotalSupply: BigNumber.from('1000'),
          feeNumerator: feeNumerator,
          collectionExpire: BigNumber.from('86400'),
          signature: signature,
        } as AccessTokenInfoStruct,
        hashedCode,
      );

      await expect(tx).to.emit(factory, 'ReferralCodeUsed').withArgs(hashedCode, bob.address);
      expect((await factory.getReferralUsers(hashedCode))[0]).to.eq(bob.address);

      const amount = 10000;
      await expect(factory.getReferralRate(bob.address, hashedCodeFalse, amount))
        .to.be.revertedWithCustomError(factory, 'ReferralCodeNotUsedByUser')
        .withArgs(bob.address, hashedCodeFalse);
      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(amount / 2);

      nftName = 'Name2';
      nftSymbol = 'S2';

      message = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName },
        { type: 'string', value: nftSymbol },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: feeNumerator },
        { type: 'uint256', value: chainId },
      ]);

      signature = EthCrypto.sign(signer.privateKey, message);

      await factory.connect(bob).produce(
        {
          metadata: { name: nftName, symbol: nftSymbol },
          contractURI: contractURI,
          paymentToken: NATIVE_CURRENCY_ADDRESS,
          mintPrice: price,
          whitelistMintPrice: price,
          transferable: true,
          maxTotalSupply: BigNumber.from('1000'),
          feeNumerator: feeNumerator,
          collectionExpire: BigNumber.from('86400'),
          signature: signature,
        } as AccessTokenInfoStruct,
        hashedCode,
      );

      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(
        getPercentage(amount, referralPercentages[2]),
      );

      nftName = 'Name3';
      nftSymbol = 'S3';

      message = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName },
        { type: 'string', value: nftSymbol },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: feeNumerator },
        { type: 'uint256', value: chainId },
      ]);

      signature = EthCrypto.sign(signer.privateKey, message);

      await factory.connect(bob).produce(
        {
          metadata: { name: nftName, symbol: nftSymbol },
          contractURI: contractURI,
          paymentToken: NATIVE_CURRENCY_ADDRESS,
          mintPrice: price,
          whitelistMintPrice: price,
          transferable: true,
          maxTotalSupply: BigNumber.from('1000'),
          feeNumerator: feeNumerator,
          collectionExpire: BigNumber.from('86400'),
          signature: signature,
        } as AccessTokenInfoStruct,
        hashedCode,
      );

      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(
        getPercentage(amount, referralPercentages[3]),
      );

      nftName = 'Name4';
      nftSymbol = 'S4';

      message = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName },
        { type: 'string', value: nftSymbol },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: feeNumerator },
        { type: 'uint256', value: chainId },
      ]);

      signature = EthCrypto.sign(signer.privateKey, message);

      await factory.connect(bob).produce(
        {
          metadata: { name: nftName, symbol: nftSymbol },
          contractURI: contractURI,
          paymentToken: NATIVE_CURRENCY_ADDRESS,
          mintPrice: price,
          whitelistMintPrice: price,
          transferable: true,
          maxTotalSupply: BigNumber.from('1000'),
          feeNumerator: feeNumerator,
          collectionExpire: BigNumber.from('86400'),
          signature: signature,
        } as AccessTokenInfoStruct,
        hashedCode,
      );

      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(
        getPercentage(amount, referralPercentages[4]),
      );

      nftName = 'Name5';
      nftSymbol = 'S5';

      message = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName },
        { type: 'string', value: nftSymbol },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: feeNumerator },
        { type: 'uint256', value: chainId },
      ]);

      signature = EthCrypto.sign(signer.privateKey, message);

      await factory.connect(bob).produce(
        {
          metadata: { name: nftName, symbol: nftSymbol },
          contractURI: contractURI,
          paymentToken: NATIVE_CURRENCY_ADDRESS,
          mintPrice: price,
          whitelistMintPrice: price,
          transferable: true,
          maxTotalSupply: BigNumber.from('1000'),
          feeNumerator: feeNumerator,
          collectionExpire: BigNumber.from('86400'),
          signature: signature,
        } as AccessTokenInfoStruct,
        hashedCode,
      );

      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(
        getPercentage(amount, referralPercentages[4]),
      );

      nftName = 'Name6';
      nftSymbol = 'S6';

      message = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName },
        { type: 'string', value: nftSymbol },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: feeNumerator },
        { type: 'uint256', value: chainId },
      ]);

      signature = EthCrypto.sign(signer.privateKey, message);

      await factory.connect(bob).produce(
        {
          metadata: { name: nftName, symbol: nftSymbol },
          contractURI: contractURI,
          paymentToken: NATIVE_CURRENCY_ADDRESS,
          mintPrice: price,
          whitelistMintPrice: price,
          transferable: true,
          maxTotalSupply: BigNumber.from('1000'),
          feeNumerator: feeNumerator,
          collectionExpire: BigNumber.from('86400'),
          signature: signature,
        } as AccessTokenInfoStruct,
        hashedCode,
      );

      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(
        getPercentage(amount, referralPercentages[4]),
      );
    });
  });

  describe('Set functions', () => {
    it('Can set params', async () => {
      const { factory, alice } = await loadFixture(fixture);

      let _factoryParams = factoryParams;

      await expect(
        factory.connect(alice).setFactoryParameters(_factoryParams, royalties, implementations, referralPercentages),
      ).to.be.revertedWithCustomError(factory, 'Unauthorized');
      referralPercentages[1] = 10001;
      await expect(factory.setFactoryParameters(_factoryParams, royalties, implementations, referralPercentages))
        .to.be.revertedWithCustomError(factory, 'PercentageExceedsMax')
        .withArgs(10001);
      referralPercentages[1] = 1;

      royalties.amountToCreator = 9000;
      royalties.amountToPlatform = 1001;
      await expect(
        factory.setFactoryParameters(_factoryParams, royalties, implementations, referralPercentages),
      ).to.be.revertedWithCustomError(factory, 'TotalRoyaltiesExceed100Pecents');

      royalties.amountToCreator = 9000;
      royalties.amountToPlatform = 1000;

      const tx = await factory.setFactoryParameters(_factoryParams, royalties, implementations, referralPercentages);
      await expect(tx).to.emit(factory, 'FactoryParametersSet');
      await expect(tx).to.emit(factory, 'ReferralParametersSet');
    });
  });

  describe('Errors', () => {
    it('produce() params check', async () => {
      const { factory, alice, signer } = await loadFixture(fixture);

      const nftName = 'AccessToken 1';
      const nftSymbol = 'AT1';
      const contractURI = 'contractURI/AccessToken123';
      const price = ethers.utils.parseEther('0.05');

      const message = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName },
        { type: 'string', value: nftSymbol },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: 500 },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await factory.connect(alice).produce(
        {
          metadata: { name: nftName, symbol: nftSymbol },
          contractURI: contractURI,
          paymentToken: NATIVE_CURRENCY_ADDRESS,
          mintPrice: price,
          whitelistMintPrice: price,
          transferable: true,
          maxTotalSupply: BigNumber.from('1000'),
          feeNumerator: BigNumber.from('500'),
          collectionExpire: BigNumber.from('86400'),
          signature: signature,
        } as AccessTokenInfoStruct,
        ethers.constants.HashZero,
      );

      await expect(
        factory.connect(alice).produce(
          {
            metadata: { name: nftName, symbol: nftSymbol },
            contractURI: contractURI,
            paymentToken: NATIVE_CURRENCY_ADDRESS,
            mintPrice: price,
            whitelistMintPrice: price,
            transferable: true,
            maxTotalSupply: BigNumber.from('1000'),
            feeNumerator: BigNumber.from('500'),
            collectionExpire: BigNumber.from('86400'),
            signature: signature,
          } as AccessTokenInfoStruct,
          ethers.constants.HashZero,
        ),
      ).to.be.revertedWithCustomError(factory, 'TokenAlreadyExists');
    });
  });
});

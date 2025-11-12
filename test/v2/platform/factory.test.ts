import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, BigNumberish, BytesLike } from 'ethers';
import {
  WETHMock,
  MockTransferValidatorV2,
  Factory,
  RoyaltiesReceiverV2,
  CreditToken,
  AccessToken,
  SignatureVerifier,
  VestingWalletExtended,
  LONG,
} from '../../../typechain-types';
import { expect } from 'chai';
import EthCrypto from 'eth-crypto';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { PromiseOrValue } from '../../../typechain-types/common';
import {
  AccessTokenInfoStruct,
  AccessTokenInfoStructOutput,
  ERC1155InfoStruct,
} from '../../../typechain-types/contracts/v2/platform/Factory';
import {
  abiEncodeHash,
  getPercentage,
  hashAccessTokenInfo,
  hashERC1155Info,
  hashVestingInfo,
} from '../../../helpers/math';
import {
  signAccessTokenInfo,
  signCreditTokenInfo,
  signVestingWalletInfo,
  SignatureOverrides,
} from '../../../helpers/signature';
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

describe.only('Factory', () => {
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

  async function produceAccessToken(
    factory: Factory,
    caller: SignerWithAddress,
    signerPk: string,
    info: AccessTokenInfoStruct,
    referralCode: BytesLike,
    overrides?: SignatureOverrides,
  ) {
    const protection = await signAccessTokenInfo(factory.address, signerPk, info, overrides);
    return factory.connect(caller).produce(info, referralCode, protection);
  }

  async function produceCreditToken(
    factory: Factory,
    caller: SignerWithAddress,
    signerPk: string,
    info: ERC1155InfoStruct,
    overrides?: SignatureOverrides,
  ) {
    const protection = await signCreditTokenInfo(factory.address, signerPk, info, overrides);
    return factory.connect(caller).produceCreditToken(info, protection);
  }

  async function deployVestingWalletWithSignature(
    factory: Factory,
    caller: SignerWithAddress,
    signerPk: string,
    ownerAddr: string,
    info: VestingWalletInfoStruct,
    overrides?: SignatureOverrides,
  ) {
    const protection = await signVestingWalletInfo(factory.address, signerPk, ownerAddr, info, overrides);
    return factory.connect(caller).deployVestingWallet(ownerAddr, info, protection);
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
        amountToCreator: 8000,
        amountToPlatform: 2000,
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

      const info: AccessTokenInfoStruct = {
        creator: alice.address,
        metadata: { name: nftName, symbol: nftSymbol },
        contractURI: contractURI,
        paymentToken: NATIVE_CURRENCY_ADDRESS,
        mintPrice: price,
        whitelistMintPrice: price,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator,
        collectionExpire: BigNumber.from('86400'),
      };

      const wrongNameSignature = await signAccessTokenInfo(factory.address, signer.privateKey, {
        ...info,
        metadata: { name: '', symbol: nftSymbol },
      });
      await expect(factory.connect(alice).produce(info, ethers.constants.HashZero, wrongNameSignature))
        .to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature')
        .withArgs(wrongNameSignature.signature);

      const wrongSymbolSignature = await signAccessTokenInfo(factory.address, signer.privateKey, {
        ...info,
        metadata: { name: nftName, symbol: '' },
      });
      await expect(factory.connect(alice).produce(info, ethers.constants.HashZero, wrongSymbolSignature))
        .to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature')
        .withArgs(wrongSymbolSignature.signature);

      const badChainSignature = await signAccessTokenInfo(factory.address, signer.privateKey, info, {
        chainId: chainId + 1,
      });
      await expect(factory.connect(alice).produce(info, ethers.constants.HashZero, badChainSignature))
        .to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature')
        .withArgs(badChainSignature.signature);

      const emptyNameInfo: AccessTokenInfoStruct = {
        ...info,
        metadata: { ...info.metadata, name: '' },
      };
      await expect(produceAccessToken(factory, alice, signer.privateKey, emptyNameInfo, ethers.constants.HashZero))
        .to.be.revertedWithCustomError(signatureVerifier, 'EmptyMetadata')
        .withArgs(emptyNameInfo.metadata.name, emptyNameInfo.metadata.symbol);

      const emptySymbolInfo: AccessTokenInfoStruct = {
        ...info,
        metadata: { ...info.metadata, symbol: '' },
      };
      await expect(produceAccessToken(factory, alice, signer.privateKey, emptySymbolInfo, ethers.constants.HashZero))
        .to.be.revertedWithCustomError(signatureVerifier, 'EmptyMetadata')
        .withArgs(emptySymbolInfo.metadata.name, emptySymbolInfo.metadata.symbol);

      const tx = await produceAccessToken(factory, alice, signer.privateKey, info, ethers.constants.HashZero);

      await expect(tx).to.emit(factory, 'AccessTokenCreated');
      const nftInstanceInfo = await factory.nftInstanceInfo(nftName, nftSymbol);
      expect(nftInstanceInfo.nftAddress).to.not.be.equal(ZERO_ADDRESS);
      expect(nftInstanceInfo.metadata.name).to.be.equal(nftName);
      expect(nftInstanceInfo.metadata.symbol).to.be.equal(nftSymbol);
      expect(nftInstanceInfo.creator).to.be.equal(alice.address);

      console.log('instanceAddress = ', nftInstanceInfo.nftAddress);

      const nft = await ethers.getContractAt('AccessToken', nftInstanceInfo.nftAddress);
      const [factoryAddress, feeReceiver, , infoReturned] = await nft.parameters();

      expect(await nft.getTransferValidator()).to.be.equal(validator.address);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.paymentToken).to.be.equal(info.paymentToken);
      expect(infoReturned.mintPrice).to.be.equal(info.mintPrice);
      expect(infoReturned.contractURI).to.be.equal(info.contractURI);
      expect(infoReturned.creator).to.be.equal(alice.address);

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

      const accessTokenInfo1 = {
        creator: alice.address,
        metadata: { name: nftName1, symbol: nftSymbol1 },
        contractURI: contractURI1,
        paymentToken: ZERO_ADDRESS,
        mintPrice: price1,
        whitelistMintPrice: price1,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator: BigNumber.from('500'),
        collectionExpire: BigNumber.from('86400'),
      } as AccessTokenInfoStructOutput;
      const accessTokenInfoProtection1 = await signAccessTokenInfo(
        factory.address,
        signer.privateKey,
        accessTokenInfo1,
      );

      await factory.connect(alice).produce(accessTokenInfo1, ethers.constants.HashZero, accessTokenInfoProtection1);

      const accessTokenInfo2 = {
        creator: bob.address,
        metadata: { name: nftName2, symbol: nftSymbol2 },
        contractURI: contractURI2,
        paymentToken: ZERO_ADDRESS,
        mintPrice: price2,
        whitelistMintPrice: price2,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator: BigNumber.from('0'),
        collectionExpire: BigNumber.from('86400'),
      } as AccessTokenInfoStructOutput;
      const accessTokenInfoProtection2 = await signAccessTokenInfo(
        factory.address,
        signer.privateKey,
        accessTokenInfo2,
      );

      await factory.connect(bob).produce(accessTokenInfo2, ethers.constants.HashZero, accessTokenInfoProtection2);

      const accessTokenInfo3 = {
        creator: charlie.address,
        metadata: { name: nftName3, symbol: nftSymbol3 },
        contractURI: contractURI3,
        paymentToken: ZERO_ADDRESS,
        mintPrice: price3,
        whitelistMintPrice: price3,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator: BigNumber.from('500'),
        collectionExpire: BigNumber.from('86400'),
      } as AccessTokenInfoStructOutput;
      const accessTokenInfoProtection3 = await signAccessTokenInfo(
        factory.address,
        signer.privateKey,
        accessTokenInfo3,
      );

      await factory.connect(charlie).produce(accessTokenInfo3, ethers.constants.HashZero, accessTokenInfoProtection3);

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
      let [factoryAddress, feeReceiver, referralCode, infoReturned] = await nft1.parameters();
      expect(infoReturned.paymentToken).to.be.equal(NATIVE_CURRENCY_ADDRESS);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.mintPrice).to.be.equal(price1);
      expect(infoReturned.contractURI).to.be.equal(contractURI1);
      expect(infoReturned.creator).to.be.equal(alice.address);
      expect(feeReceiver).not.to.be.equal(ZERO_ADDRESS);

      const nft2 = await ethers.getContractAt('AccessToken', instanceInfo2.nftAddress);
      [factoryAddress, feeReceiver, referralCode, infoReturned] = await nft2.parameters();
      expect(infoReturned.paymentToken).to.be.equal(NATIVE_CURRENCY_ADDRESS);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.mintPrice).to.be.equal(price2);
      expect(infoReturned.contractURI).to.be.equal(contractURI2);
      expect(infoReturned.creator).to.be.equal(bob.address);
      expect(feeReceiver).to.be.equal(ZERO_ADDRESS);

      const nft3 = await ethers.getContractAt('AccessToken', instanceInfo3.nftAddress);
      [factoryAddress, feeReceiver, referralCode, infoReturned] = await nft3.parameters();
      expect(infoReturned.paymentToken).to.be.equal(NATIVE_CURRENCY_ADDRESS);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.mintPrice).to.be.equal(price3);
      expect(infoReturned.contractURI).to.be.equal(contractURI3);
      expect(infoReturned.creator).to.be.equal(charlie.address);
      expect(feeReceiver).not.to.be.equal(ZERO_ADDRESS);
    });
  });

  describe('Deploy CreditToken', () => {
    it('should correct deploy CreditToken instance', async () => {
      const { signatureVerifier, factory, alice, signer } = await loadFixture(fixture);

      const nftName = 'CreditToken 1';
      const nftSymbol = 'CT1';
      const uri = 'contractURI/CreditToken123';

      const creditTokenInfo: ERC1155InfoStruct = {
        name: nftName,
        symbol: nftSymbol,
        defaultAdmin: alice.address,
        manager: alice.address,
        minter: alice.address,
        burner: alice.address,
        uri: uri,
        transferable: true,
      };
      const creditTokenInfoProtection = await signCreditTokenInfo(factory.address, signer.privateKey, creditTokenInfo);

      const creditTokenInfoNoName: ERC1155InfoStruct = {
        name: '',
        symbol: nftSymbol,
        defaultAdmin: alice.address,
        manager: alice.address,
        minter: alice.address,
        burner: alice.address,
        uri: uri,
        transferable: true,
      };
      const creditTokenInfoNoNameProtection = await signCreditTokenInfo(
        factory.address,
        signer.privateKey,
        creditTokenInfoNoName,
      );

      const creditTokenInfoNoSymbol: ERC1155InfoStruct = {
        name: nftName,
        symbol: '',
        defaultAdmin: alice.address,
        manager: alice.address,
        minter: alice.address,
        burner: alice.address,
        uri: uri,
        transferable: true,
      };
      const creditTokenInfoNoSymbolProtection = await signCreditTokenInfo(
        factory.address,
        signer.privateKey,
        creditTokenInfoNoSymbol,
      );

      await expect(factory.connect(alice).produceCreditToken(creditTokenInfoNoName, creditTokenInfoNoNameProtection))
        .to.be.revertedWithCustomError(signatureVerifier, 'EmptyMetadata')
        .withArgs('', nftSymbol);

      await expect(
        factory.connect(alice).produceCreditToken(creditTokenInfoNoSymbol, creditTokenInfoNoSymbolProtection),
      )
        .to.be.revertedWithCustomError(signatureVerifier, 'EmptyMetadata')
        .withArgs(nftName, '');

      await expect(
        factory.connect(alice).produceCreditToken(creditTokenInfo, creditTokenInfoNoSymbolProtection),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');

      const tx = await factory.connect(alice).produceCreditToken(creditTokenInfo, creditTokenInfoProtection);

      await expect(tx).to.emit(factory, 'CreditTokenCreated');
      const nftInstanceInfo = await factory.getCreditTokenInstanceInfo(nftName, nftSymbol);
      expect(nftInstanceInfo.creditToken).to.not.be.equal(ZERO_ADDRESS);
      expect(nftInstanceInfo.name).to.be.equal(nftName);
      expect(nftInstanceInfo.symbol).to.be.equal(nftSymbol);

      console.log('instanceAddress = ', nftInstanceInfo.creditToken);

      const nft: CreditToken = await ethers.getContractAt('CreditToken', nftInstanceInfo.creditToken);

      expect(await nft.name()).to.be.equal(nftName);
      expect(await nft.symbol()).to.be.equal(nftSymbol);
      expect(await nft.uri(1)).to.be.equal(uri);
      expect(await nft.transferable()).to.be.true;
      expect(await nft.hasRole(alice.address, await nft.DEFAULT_ADMIN_ROLE())).to.be.true;
      expect(await nft.hasRole(alice.address, await nft.MANAGER_ROLE())).to.be.true;
      expect(await nft.hasRole(alice.address, await nft.MINTER_ROLE())).to.be.true;
      expect(await nft.hasRole(alice.address, await nft.BURNER_ROLE())).to.be.true;

      await expect(
        factory.connect(alice).produceCreditToken(creditTokenInfo, creditTokenInfoProtection),
      ).to.be.revertedWithCustomError(factory, 'TokenAlreadyExists');
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

      const creditTokenInfo1: ERC1155InfoStruct = {
        name: nftName1,
        symbol: nftSymbol1,
        defaultAdmin: alice.address,
        manager: alice.address,
        minter: alice.address,
        burner: alice.address,
        uri: uri1,
        transferable: true,
      };
      const creditTokenInfoProtection1 = await signCreditTokenInfo(
        factory.address,
        signer.privateKey,
        creditTokenInfo1,
      );
      await factory.connect(alice).produceCreditToken(creditTokenInfo1, creditTokenInfoProtection1);

      const creditTokenInfo2: ERC1155InfoStruct = {
        name: nftName2,
        symbol: nftSymbol2,
        defaultAdmin: bob.address,
        manager: bob.address,
        minter: bob.address,
        burner: bob.address,
        uri: uri2,
        transferable: true,
      };
      const creditTokenInfoProtection2 = await signCreditTokenInfo(
        factory.address,
        signer.privateKey,
        creditTokenInfo2,
      );
      await factory.connect(alice).produceCreditToken(creditTokenInfo2, creditTokenInfoProtection2);

      const creditTokenInfo3: ERC1155InfoStruct = {
        name: nftName3,
        symbol: nftSymbol3,
        defaultAdmin: charlie.address,
        manager: charlie.address,
        minter: charlie.address,
        burner: charlie.address,
        uri: uri3,
        transferable: true,
      };
      const creditTokenInfoProtection3 = await signCreditTokenInfo(
        factory.address,
        signer.privateKey,
        creditTokenInfo3,
      );
      await factory.connect(alice).produceCreditToken(creditTokenInfo3, creditTokenInfoProtection3);

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
      expect(await nft1.uri(1)).to.be.equal(uri1);
      expect(await nft1.transferable()).to.be.true;
      expect(await nft1.hasRole(alice.address, await nft1.DEFAULT_ADMIN_ROLE())).to.be.true;
      expect(await nft1.hasRole(alice.address, await nft1.MANAGER_ROLE())).to.be.true;
      expect(await nft1.hasRole(alice.address, await nft1.MINTER_ROLE())).to.be.true;
      expect(await nft1.hasRole(alice.address, await nft1.BURNER_ROLE())).to.be.true;

      const nft2: CreditToken = await ethers.getContractAt('CreditToken', instanceInfo2.creditToken);

      expect(await nft2.name()).to.be.equal(nftName2);
      expect(await nft2.symbol()).to.be.equal(nftSymbol2);
      expect(await nft2.uri(1)).to.be.equal(uri2);
      expect(await nft2.transferable()).to.be.true;
      expect(await nft2.hasRole(bob.address, await nft2.DEFAULT_ADMIN_ROLE())).to.be.true;
      expect(await nft2.hasRole(bob.address, await nft2.MANAGER_ROLE())).to.be.true;
      expect(await nft2.hasRole(bob.address, await nft2.MINTER_ROLE())).to.be.true;
      expect(await nft2.hasRole(bob.address, await nft2.BURNER_ROLE())).to.be.true;

      const nft3: CreditToken = await ethers.getContractAt('CreditToken', instanceInfo3.creditToken);

      expect(await nft3.name()).to.be.equal(nftName3);
      expect(await nft3.symbol()).to.be.equal(nftSymbol3);
      expect(await nft3.uri(1)).to.be.equal(uri3);
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

      const vestingInfoFake: VestingWalletInfoStruct = {
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
      let vestingInfoFakeProtection = await signVestingWalletInfo(
        factory.address,
        signer.privateKey,
        owner.address,
        vestingInfoFake,
      );

      await expect(
        factory.connect(owner).deployVestingWallet(owner.address, vestingInfoFake, vestingInfoFakeProtection),
      ).to.be.revertedWithCustomError(factory, 'BadDurations');

      vestingInfoFake.durationSeconds = 1;
      vestingInfoFakeProtection = await signVestingWalletInfo(
        factory.address,
        signer.privateKey,
        owner.address,
        vestingInfoFake,
      );
      await expect(
        factory.connect(owner).deployVestingWallet(owner.address, vestingInfoFake, vestingInfoFakeProtection),
      )
        .to.be.revertedWithCustomError(factory, 'AllocationMismatch')
        .withArgs(vestingInfoFake.totalAllocation);

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
      const vestingInfoProtection = await signVestingWalletInfo(
        factory.address,
        signer.privateKey,
        owner.address,
        vestingWalletInfo,
      );

      await expect(
        factory.connect(owner).deployVestingWallet(owner.address, vestingWalletInfo, vestingInfoFakeProtection),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');
      await expect(
        factory.connect(alice).deployVestingWallet(owner.address, vestingWalletInfo, vestingInfoProtection),
      ).to.be.revertedWithCustomError(factory, 'NotEnoughFundsToVest');

      await LONG.approve(factory.address, vestingWalletInfo.totalAllocation);

      const tx = await factory
        .connect(owner)
        .deployVestingWallet(owner.address, vestingWalletInfo, vestingInfoProtection);

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
      const vestingInfoProtection1 = await signVestingWalletInfo(
        factory.address,
        signer.privateKey,
        owner.address,
        vestingWalletInfo1,
      );

      await LONG.approve(factory.address, vestingWalletInfo1.totalAllocation);

      await factory.connect(owner).deployVestingWallet(owner.address, vestingWalletInfo1, vestingInfoProtection1);

      const now2 = await time.latest();
      const startTimestamp2 = now2 + 5;
      const cliffDurationSeconds2 = 60;
      const durationSeconds2 = 360;

      const vestingWalletInfo2: VestingWalletInfoStruct = {
        startTimestamp: startTimestamp2,
        cliffDurationSeconds: cliffDurationSeconds2,
        durationSeconds: durationSeconds2,
        token: LONG.address,
        beneficiary: alice.address,
        totalAllocation: ethers.utils.parseEther('100'),
        tgeAmount: ethers.utils.parseEther('10'),
        linearAllocation: ethers.utils.parseEther('60'),
        description: description2,
      };
      const vestingInfoProtection2 = await signVestingWalletInfo(
        factory.address,
        signer.privateKey,
        owner.address,
        vestingWalletInfo2,
      );

      await LONG.approve(factory.address, vestingWalletInfo2.totalAllocation);

      await factory.connect(owner).deployVestingWallet(owner.address, vestingWalletInfo2, vestingInfoProtection2);

      const now3 = await time.latest();
      const startTimestamp3 = now3 + 5;
      const cliffDurationSeconds3 = 60;
      const durationSeconds3 = 360;

      const vestingWalletInfo3: VestingWalletInfoStruct = {
        startTimestamp: startTimestamp3,
        cliffDurationSeconds: cliffDurationSeconds3,
        durationSeconds: durationSeconds3,
        token: LONG.address,
        beneficiary: alice.address,
        totalAllocation: ethers.utils.parseEther('100'),
        tgeAmount: ethers.utils.parseEther('10'),
        linearAllocation: ethers.utils.parseEther('60'),
        description: description3,
      };
      const vestingInfoProtection3 = await signVestingWalletInfo(
        factory.address,
        signer.privateKey,
        owner.address,
        vestingWalletInfo3,
      );

      await LONG.approve(factory.address, vestingWalletInfo3.totalAllocation);

      await factory.connect(owner).deployVestingWallet(owner.address, vestingWalletInfo3, vestingInfoProtection3);

      const vestingWalletInstanceInfo1 = await factory.getVestingWalletInstanceInfo(vestingWalletInfo1.beneficiary, 0);
      const vestingWalletInstanceInfo2 = await factory.getVestingWalletInstanceInfo(vestingWalletInfo2.beneficiary, 1);
      const vestingWalletInstanceInfo3 = await factory.getVestingWalletInstanceInfo(vestingWalletInfo3.beneficiary, 2);

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

      const hashedCode = abiEncodeHash([
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

      const hashedCode = abiEncodeHash([
        { type: 'address', value: alice.address },
        { type: 'address', value: factory.address },
        { type: 'uint256', value: chainId },
      ]);

      const hashedCodeFalse = abiEncodeHash([
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

      const accessTokenInfo = {
        creator: alice.address,
        metadata: { name: nftName, symbol: nftSymbol },
        contractURI: contractURI,
        paymentToken: NATIVE_CURRENCY_ADDRESS,
        mintPrice: price,
        whitelistMintPrice: price,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator: feeNumerator,
        collectionExpire: BigNumber.from('86400'),
      } as AccessTokenInfoStruct;
      const accessTokenInfoProtection = await signAccessTokenInfo(factory.address, signer.privateKey, accessTokenInfo);

      await expect(
        factory.connect(alice).produce(accessTokenInfo, hashedCodeFalse, accessTokenInfoProtection),
      ).to.be.revertedWithCustomError(factory, 'ReferralCreatorNotExists');

      await expect(
        factory.connect(alice).produce(accessTokenInfo, hashedCode, accessTokenInfoProtection),
      ).to.be.revertedWithCustomError(factory, 'ReferralUserIsReferralCreator');

      accessTokenInfo.creator = bob.address;
      const accessTokenInfoProtectionBob = await signAccessTokenInfo(
        factory.address,
        signer.privateKey,
        accessTokenInfo,
      );

      const tx = await factory.connect(bob).produce(accessTokenInfo, hashedCode, accessTokenInfoProtectionBob);

      await expect(tx).to.emit(factory, 'ReferralCodeUsed').withArgs(hashedCode, bob.address);
      expect((await factory.getReferralUsers(hashedCode))[0]).to.eq(bob.address);

      const amount = 10000;
      await expect(factory.getReferralRate(bob.address, hashedCodeFalse, amount))
        .to.be.revertedWithCustomError(factory, 'ReferralCodeNotUsedByUser')
        .withArgs(bob.address, hashedCodeFalse);
      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(amount / 2);

      nftName = 'Name2';
      nftSymbol = 'S2';

      const accessTokenInfo2 = {
        creator: bob.address,
        metadata: { name: nftName, symbol: nftSymbol },
        contractURI: contractURI,
        paymentToken: NATIVE_CURRENCY_ADDRESS,
        mintPrice: price,
        whitelistMintPrice: price,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator: feeNumerator,
        collectionExpire: BigNumber.from('86400'),
      } as AccessTokenInfoStruct;
      const accessTokenInfoProtection2 = await signAccessTokenInfo(
        factory.address,
        signer.privateKey,
        accessTokenInfo2,
      );

      await factory.connect(bob).produce(accessTokenInfo2, hashedCode, accessTokenInfoProtection2);

      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(
        getPercentage(amount, referralPercentages[2]),
      );

      nftName = 'Name3';
      nftSymbol = 'S3';

      const accessTokenInfo3 = {
        creator: bob.address,
        metadata: { name: nftName, symbol: nftSymbol },
        contractURI: contractURI,
        paymentToken: NATIVE_CURRENCY_ADDRESS,
        mintPrice: price,
        whitelistMintPrice: price,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator: feeNumerator,
        collectionExpire: BigNumber.from('86400'),
      } as AccessTokenInfoStruct;
      const accessTokenInfoProtection3 = await signAccessTokenInfo(
        factory.address,
        signer.privateKey,
        accessTokenInfo3,
      );

      await factory.connect(bob).produce(accessTokenInfo3, hashedCode, accessTokenInfoProtection3);

      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(
        getPercentage(amount, referralPercentages[3]),
      );

      nftName = 'Name4';
      nftSymbol = 'S4';

      const accessTokenInfo4 = {
        creator: bob.address,
        metadata: { name: nftName, symbol: nftSymbol },
        contractURI: contractURI,
        paymentToken: NATIVE_CURRENCY_ADDRESS,
        mintPrice: price,
        whitelistMintPrice: price,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator: feeNumerator,
        collectionExpire: BigNumber.from('86400'),
      } as AccessTokenInfoStruct;
      const accessTokenInfoProtection4 = await signAccessTokenInfo(
        factory.address,
        signer.privateKey,
        accessTokenInfo4,
      );

      await factory.connect(bob).produce(accessTokenInfo4, hashedCode, accessTokenInfoProtection4);

      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(
        getPercentage(amount, referralPercentages[4]),
      );

      nftName = 'Name5';
      nftSymbol = 'S5';

      const accessTokenInfo5 = {
        creator: bob.address,
        metadata: { name: nftName, symbol: nftSymbol },
        contractURI: contractURI,
        paymentToken: NATIVE_CURRENCY_ADDRESS,
        mintPrice: price,
        whitelistMintPrice: price,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator: feeNumerator,
        collectionExpire: BigNumber.from('86400'),
      } as AccessTokenInfoStruct;
      const accessTokenInfoProtection5 = await signAccessTokenInfo(
        factory.address,
        signer.privateKey,
        accessTokenInfo5,
      );

      await factory.connect(bob).produce(accessTokenInfo5, hashedCode, accessTokenInfoProtection5);

      expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(
        getPercentage(amount, referralPercentages[4]),
      );

      nftName = 'Name6';
      nftSymbol = 'S6';

      const accessTokenInfo6 = {
        creator: bob.address,
        metadata: { name: nftName, symbol: nftSymbol },
        contractURI: contractURI,
        paymentToken: NATIVE_CURRENCY_ADDRESS,
        mintPrice: price,
        whitelistMintPrice: price,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator: feeNumerator,
        collectionExpire: BigNumber.from('86400'),
      } as AccessTokenInfoStruct;
      const accessTokenInfoProtection6 = await signAccessTokenInfo(
        factory.address,
        signer.privateKey,
        accessTokenInfo6,
      );

      await factory.connect(bob).produce(accessTokenInfo6, hashedCode, accessTokenInfoProtection6);

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
      ).to.be.revertedWithCustomError(factory, 'TotalRoyaltiesNot100Percent');

      royalties.amountToCreator = 9000;
      royalties.amountToPlatform = 900;
      await expect(
        factory.setFactoryParameters(_factoryParams, royalties, implementations, referralPercentages),
      ).to.be.revertedWithCustomError(factory, 'TotalRoyaltiesNot100Percent');

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

      const accessTokenInfo = {
        creator: alice.address,
        metadata: { name: nftName, symbol: nftSymbol },
        contractURI: contractURI,
        paymentToken: NATIVE_CURRENCY_ADDRESS,
        mintPrice: price,
        whitelistMintPrice: price,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator: BigNumber.from('500'),
        collectionExpire: BigNumber.from('86400'),
      } as AccessTokenInfoStruct;
      const accessTokenInfoProtection = await signAccessTokenInfo(factory.address, signer.privateKey, accessTokenInfo);

      await factory.connect(alice).produce(accessTokenInfo, ethers.constants.HashZero, accessTokenInfoProtection);

      await expect(
        factory.connect(alice).produce(accessTokenInfo, ethers.constants.HashZero, accessTokenInfoProtection),
      ).to.be.revertedWithCustomError(factory, 'TokenAlreadyExists');
    });
  });
});

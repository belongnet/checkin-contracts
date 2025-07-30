import { ethers, upgrades } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, BigNumberish, ContractFactory } from 'ethers';
import {
  WETHMock,
  MockTransferValidator,
  Factory,
  RoyaltiesReceiverV2,
  CreditToken,
  AccessToken,
} from '../../../typechain-types';
import { expect } from 'chai';
import EthCrypto from 'eth-crypto';
import { PromiseOrValue } from '../../../typechain-types/common';
import {
  AccessTokenInfoStruct,
  AccessTokenInfoStructOutput,
} from '../../../typechain-types/contracts/v2/platform/Factory';
import { getPercentage } from '../helpers/getPercentage';

describe('Factory', () => {
  const PLATFORM_COMISSION = '10';
  const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const chainId = 31337;

  let factoryParams: Factory.FactoryParametersStruct,
    referralPercentages: any,
    royalties: Factory.RoyaltiesParametersStruct,
    implementations: Factory.ImplementationsStruct;

  async function fixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();
    const signer = EthCrypto.createIdentity();

    const Erc20Example: ContractFactory = await ethers.getContractFactory('WETHMock');
    const erc20Example: WETHMock = (await Erc20Example.deploy()) as WETHMock;
    await erc20Example.deployed();

    const Validator: ContractFactory = await ethers.getContractFactory('MockTransferValidatorV2');
    const validator: MockTransferValidator = (await Validator.deploy(true)) as MockTransferValidator;
    await validator.deployed();

    const AccessToken: ContractFactory = await ethers.getContractFactory('AccessToken');
    const accessToken: AccessToken = (await AccessToken.deploy()) as AccessToken;
    await accessToken.deployed();

    const RRImplementation: ContractFactory = await ethers.getContractFactory('RoyaltiesReceiverV2');
    const rr: RoyaltiesReceiverV2 = (await RRImplementation.deploy()) as RoyaltiesReceiverV2;
    await rr.deployed();

    const CreditToken: ContractFactory = await ethers.getContractFactory('CreditToken');
    const creditToken: CreditToken = (await CreditToken.deploy()) as CreditToken;
    await creditToken.deployed();

    implementations = {
      accessToken: accessToken.address,
      creditToken: creditToken.address,
      royaltiesReceiver: rr.address,
    };

    royalties = {
      amountToCreator: 8000,
      amountToPlatform: 2000,
    };

    factoryParams = {
      transferValidator: validator.address,
      feeCollector: owner.address,
      signer: signer.address,
      commissionInBps: PLATFORM_COMISSION,
      defaultPaymentToken: ETH_ADDRESS,
      maxArraySize: 10,
    };

    referralPercentages = [0, 5000, 3000, 1500, 500];

    const Factory: ContractFactory = await ethers.getContractFactory('Factory');
    const factory: Factory = (await upgrades.deployProxy(
      Factory,
      [factoryParams, royalties, implementations, referralPercentages],
      {
        unsafeAllow: ['constructor'],
      },
    )) as Factory;
    await factory.deployed();

    return {
      factory,
      validator,
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

      expect((await factory.nftFactoryParameters()).feeCollector).to.be.equal(owner.address);
      expect((await factory.nftFactoryParameters()).commissionInBps).to.be.equal(+PLATFORM_COMISSION);
      expect((await factory.nftFactoryParameters()).signer).to.be.equal(signer.address);
      expect((await factory.nftFactoryParameters()).defaultPaymentToken).to.be.equal(ETH_ADDRESS);
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
  });

  describe('Deploy AccessToken', () => {
    it('should correct deploy AccessToken instance', async () => {
      const { factory, validator, alice, signer } = await loadFixture(fixture);

      const nftName = 'AccessToken 1';
      const nftSymbol = 'AT1';
      const contractURI = 'contractURI/AccessToken123';
      const price = ethers.utils.parseEther('0.05');
      const feeNumerator = 500;

      const message = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName },
        { type: 'string', value: nftSymbol },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: feeNumerator },
        { type: 'uint256', value: chainId },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      const info: AccessTokenInfoStruct = {
        name: nftName,
        symbol: nftSymbol,
        contractURI: contractURI,
        paymentToken: ETH_ADDRESS,
        mintPrice: price,
        whitelistMintPrice: price,
        transferable: true,
        maxTotalSupply: BigNumber.from('1000'),
        feeNumerator,
        collectionExpire: BigNumber.from('86400'),
        signature: signature,
      };

      const fakeInfo = info;

      const emptyNameMessage = EthCrypto.hash.keccak256([
        { type: 'string', value: '' },
        { type: 'string', value: nftSymbol },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: feeNumerator },
        { type: 'uint256', value: chainId },
      ]);

      const emptyNameSignature = EthCrypto.sign(signer.privateKey, emptyNameMessage);
      fakeInfo.signature = emptyNameSignature;

      await expect(factory.connect(alice).produce(fakeInfo, ethers.constants.HashZero)).to.be.revertedWithCustomError(
        factory,
        'InvalidSignature',
      );

      const emptySymbolMessage = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName },
        { type: 'string', value: '' },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: feeNumerator },
        { type: 'uint256', value: chainId },
      ]);

      const emptySymbolSignature = EthCrypto.sign(signer.privateKey, emptySymbolMessage);
      fakeInfo.signature = emptySymbolSignature;

      await expect(factory.connect(alice).produce(fakeInfo, ethers.constants.HashZero)).to.be.revertedWithCustomError(
        factory,
        'InvalidSignature',
      );

      const badMessage = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName },
        { type: 'string', value: nftSymbol },
        { type: 'string', value: contractURI },
        { type: 'uint96' as any, value: feeNumerator },
        { type: 'uint256', value: chainId + 1 },
      ]);

      const badSignature = EthCrypto.sign(signer.privateKey, badMessage);
      fakeInfo.signature = badSignature;

      await expect(factory.connect(alice).produce(fakeInfo, ethers.constants.HashZero)).to.be.revertedWithCustomError(
        factory,
        'InvalidSignature',
      );
      fakeInfo.signature = signature;

      const tx = await factory.connect(alice).produce(info, ethers.constants.HashZero);

      await expect(tx).to.emit(factory, 'AccessTokenCreated');
      const nftInstanceInfo = await factory.getNftInstanceInfo(nftName, nftSymbol);
      expect(nftInstanceInfo.accessToken).to.not.be.equal(ZERO_ADDRESS);
      expect(nftInstanceInfo.name).to.be.equal(nftName);
      expect(nftInstanceInfo.symbol).to.be.equal(nftSymbol);
      expect(nftInstanceInfo.creator).to.be.equal(alice.address);

      console.log('instanceAddress = ', nftInstanceInfo.accessToken);

      const nft = await ethers.getContractAt('AccessToken', nftInstanceInfo.accessToken);
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
      expect(payees.platform).to.eq((await factory.nftFactoryParameters()).feeCollector);
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

      const message1 = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName1 },
        { type: 'string', value: nftSymbol1 },
        { type: 'string', value: contractURI1 },
        { type: 'uint96' as any, value: 500 },
        { type: 'uint256', value: chainId },
      ]);

      const signature1 = EthCrypto.sign(signer.privateKey, message1);

      await factory.connect(alice).produce(
        {
          name: nftName1,
          symbol: nftSymbol1,
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

      const message2 = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName2 },
        { type: 'string', value: nftSymbol2 },
        { type: 'string', value: contractURI2 },
        { type: 'uint96' as any, value: 0 },
        { type: 'uint256', value: chainId },
      ]);

      const signature2 = EthCrypto.sign(signer.privateKey, message2);

      await factory.connect(bob).produce(
        {
          name: nftName2,
          symbol: nftSymbol2,
          contractURI: contractURI2,
          paymentToken: ETH_ADDRESS,
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

      const message3 = EthCrypto.hash.keccak256([
        { type: 'string', value: nftName3 },
        { type: 'string', value: nftSymbol3 },
        { type: 'string', value: contractURI3 },
        { type: 'uint96' as any, value: 500 },
        { type: 'uint256', value: chainId },
      ]);

      const signature3 = EthCrypto.sign(signer.privateKey, message3);

      await factory.connect(charlie).produce(
        {
          name: nftName3,
          symbol: nftSymbol3,
          contractURI: contractURI3,
          paymentToken: ETH_ADDRESS,
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

      const instanceInfo1 = await factory.getNftInstanceInfo(nftName1, nftSymbol1);
      const instanceInfo2 = await factory.getNftInstanceInfo(nftName2, nftSymbol2);
      const instanceInfo3 = await factory.getNftInstanceInfo(nftName3, nftSymbol3);

      expect(instanceInfo1.accessToken).to.not.be.equal(ZERO_ADDRESS);
      expect(instanceInfo2.accessToken).to.not.be.equal(ZERO_ADDRESS);
      expect(instanceInfo3.accessToken).to.not.be.equal(ZERO_ADDRESS);

      expect(instanceInfo1.name).to.be.equal(nftName1);
      expect(instanceInfo1.symbol).to.be.equal(nftSymbol1);
      expect(instanceInfo1.creator).to.be.equal(alice.address);

      expect(instanceInfo2.name).to.be.equal(nftName2);
      expect(instanceInfo2.symbol).to.be.equal(nftSymbol2);
      expect(instanceInfo2.creator).to.be.equal(bob.address);

      expect(instanceInfo3.name).to.be.equal(nftName3);
      expect(instanceInfo3.symbol).to.be.equal(nftSymbol3);
      expect(instanceInfo3.creator).to.be.equal(charlie.address);

      console.log('instanceAddress1 = ', instanceInfo1.accessToken);
      console.log('instanceAddress2 = ', instanceInfo2.accessToken);
      console.log('instanceAddress3 = ', instanceInfo3.accessToken);

      const nft1 = await ethers.getContractAt('AccessToken', instanceInfo1.accessToken);
      let [factoryAddress, creator, feeReceiver, referralCode, infoReturned] = await nft1.parameters();
      expect(infoReturned.paymentToken).to.be.equal(ETH_ADDRESS);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.mintPrice).to.be.equal(price1);
      expect(infoReturned.contractURI).to.be.equal(contractURI1);
      expect(creator).to.be.equal(alice.address);
      expect(feeReceiver).not.to.be.equal(ZERO_ADDRESS);

      const nft2 = await ethers.getContractAt('AccessToken', instanceInfo2.accessToken);
      [factoryAddress, creator, feeReceiver, referralCode, infoReturned] = await nft2.parameters();
      expect(infoReturned.paymentToken).to.be.equal(ETH_ADDRESS);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.mintPrice).to.be.equal(price2);
      expect(infoReturned.contractURI).to.be.equal(contractURI2);
      expect(creator).to.be.equal(bob.address);
      expect(feeReceiver).to.be.equal(ZERO_ADDRESS);

      const nft3 = await ethers.getContractAt('AccessToken', instanceInfo3.accessToken);
      [factoryAddress, creator, feeReceiver, referralCode, infoReturned] = await nft3.parameters();
      expect(infoReturned.paymentToken).to.be.equal(ETH_ADDRESS);
      expect(factoryAddress).to.be.equal(factory.address);
      expect(infoReturned.mintPrice).to.be.equal(price3);
      expect(infoReturned.contractURI).to.be.equal(contractURI3);
      expect(creator).to.be.equal(charlie.address);
      expect(feeReceiver).not.to.be.equal(ZERO_ADDRESS);
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
            name: nftName,
            symbol: nftSymbol,
            contractURI: contractURI,
            paymentToken: ETH_ADDRESS,
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
      ).to.be.revertedWithCustomError(factory, 'ReferralCodeOwnerError');

      await expect(
        factory.connect(alice).produce(
          {
            name: nftName,
            symbol: nftSymbol,
            contractURI: contractURI,
            paymentToken: ETH_ADDRESS,
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
      ).to.be.revertedWithCustomError(factory, 'ReferralCodeOwnerError');

      const tx = await factory.connect(bob).produce(
        {
          name: nftName,
          symbol: nftSymbol,
          contractURI: contractURI,
          paymentToken: ETH_ADDRESS,
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
          name: nftName,
          symbol: nftSymbol,
          contractURI: contractURI,
          paymentToken: ETH_ADDRESS,
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
          name: nftName,
          symbol: nftSymbol,
          contractURI: contractURI,
          paymentToken: ETH_ADDRESS,
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
          name: nftName,
          symbol: nftSymbol,
          contractURI: contractURI,
          paymentToken: ETH_ADDRESS,
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
          name: nftName,
          symbol: nftSymbol,
          contractURI: contractURI,
          paymentToken: ETH_ADDRESS,
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
          name: nftName,
          symbol: nftSymbol,
          contractURI: contractURI,
          paymentToken: ETH_ADDRESS,
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
          name: nftName,
          symbol: nftSymbol,
          contractURI: contractURI,
          paymentToken: ETH_ADDRESS,
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
            name: nftName,
            symbol: nftSymbol,
            contractURI: contractURI,
            paymentToken: ETH_ADDRESS,
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

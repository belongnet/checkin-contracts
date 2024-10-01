
import { ethers, upgrades } from 'hardhat';
import { loadFixture, } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, BigNumberish, ContractFactory } from "ethers";
import { Erc20Example, MockTransferValidator, NFTFactory } from "../typechain-types";
import { expect } from "chai";
import { InstanceInfoStruct } from "../typechain-types/contracts/NFT";
import EthCrypto from "eth-crypto";
import { NftFactoryParametersStruct, NftInstanceInfoStruct, ReferralPercentagesStruct } from '../typechain-types/contracts/factories/NFTFactory';

describe('NFTFactory', () => {
	const PLATFORM_COMISSION = "10";
	const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
	const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
	const chainId = 31337;

	let nftInfo: NftFactoryParametersStruct, referralPercentages: ReferralPercentagesStruct;

	async function fixture() {
		const [owner, alice, bob, charlie] = await ethers.getSigners();
		const signer = EthCrypto.createIdentity();

		const Erc20Example: ContractFactory = await ethers.getContractFactory("Erc20Example");
		const erc20Example: Erc20Example = await Erc20Example.deploy() as Erc20Example;
		await erc20Example.deployed();

		const Validator: ContractFactory = await ethers.getContractFactory("MockTransferValidator");
		const validator: MockTransferValidator = await Validator.deploy(true) as MockTransferValidator;
		await validator.deployed();

		nftInfo = {
			transferValidator: validator.address,
			platformAddress: owner.address,
			signerAddress: signer.address,
			platformCommission: PLATFORM_COMISSION,
			defaultPaymentCurrency: ETH_ADDRESS,
			maxArraySize: 10
		} as NftFactoryParametersStruct;

		referralPercentages = {
			initial: 5000,
			second: 3000,
			third: 1500,
			byDefault: 500
		};

		const NFTFactory: ContractFactory = await ethers.getContractFactory("NFTFactory", owner);
		const factory: NFTFactory = await upgrades.deployProxy(NFTFactory, [
			referralPercentages,
			nftInfo,
		]) as NFTFactory;
		await factory.deployed();

		return { factory, validator, erc20Example, owner, alice, bob, charlie, signer };
	}

	describe('Deployment', () => {
		it("should correct initialize", async () => {
			const { factory, owner, signer, validator } = await loadFixture(fixture);

			expect((await factory.nftFactoryParameters()).platformAddress).to.be.equal(owner.address);
			expect((await factory.nftFactoryParameters()).platformCommission).to.be.equal(+PLATFORM_COMISSION);
			expect((await factory.nftFactoryParameters()).signerAddress).to.be.equal(signer.address);
			expect((await factory.nftFactoryParameters()).defaultPaymentCurrency).to.be.equal(ETH_ADDRESS);
			expect((await factory.nftFactoryParameters()).maxArraySize).to.be.equal(nftInfo.maxArraySize);
			expect((await factory.nftFactoryParameters()).transferValidator).to.be.equal(validator.address);
			expect(await factory.usedToPercentage(1)).to.be.equal(referralPercentages.initial);
			expect(await factory.usedToPercentage(2)).to.be.equal(referralPercentages.second);
			expect(await factory.usedToPercentage(3)).to.be.equal(referralPercentages.third);
			expect(await factory.usedToPercentage(4)).to.be.equal(referralPercentages.byDefault);
		});

		it("can not be initialized again", async () => {
			const { factory } = await loadFixture(fixture);

			await expect(factory.initialize(referralPercentages, nftInfo,)).to.be.revertedWithCustomError(factory, 'InvalidInitialization')
		});
	});

	describe('Deploy NFT', () => {
		it("should correct deploy NFT instance", async () => {
			const { factory, validator, owner, alice, signer } = await loadFixture(fixture);

			const nftName = "Name 1";
			const nftSymbol = "S1";
			const contractURI = "contractURI/123";
			const price = ethers.utils.parseEther("0.05");
			const feeNumerator = 500;
			const feeReceiver = owner.address;

			const message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "address", value: owner.address },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			const info: InstanceInfoStruct = {
				name: nftName,
				symbol: nftSymbol,
				contractURI,
				payingToken: ETH_ADDRESS,
				mintPrice: price,
				whitelistMintPrice: price,
				transferable: true,
				maxTotalSupply: BigNumber.from("1000"),
				feeNumerator,
				feeReceiver,
				collectionExpire: BigNumber.from("86400"),
				signature: signature
			};

			const fakeInfo = info;

			const emptyNameMessage = EthCrypto.hash.keccak256([
				{ type: "string", value: "" },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "address", value: owner.address },
				{ type: "uint256", value: chainId },
			]);

			const emptyNameSignature = EthCrypto.sign(
				signer.privateKey,
				emptyNameMessage
			);
			fakeInfo.signature = emptyNameSignature;

			await expect(
				factory
					.connect(alice)
					.produce(fakeInfo, ethers.constants.HashZero)
			).to.be.revertedWithCustomError(factory, 'InvalidSignature');;

			const emptySymbolMessage = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: "" },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "address", value: owner.address },
				{ type: "uint256", value: chainId },
			]);

			const emptySymbolSignature = EthCrypto.sign(
				signer.privateKey,
				emptySymbolMessage
			);
			fakeInfo.signature = emptySymbolSignature;

			await expect(
				factory
					.connect(alice)
					.produce(fakeInfo, ethers.constants.HashZero)
			).to.be.revertedWithCustomError(factory, 'InvalidSignature');;

			const badMessage = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "address", value: ZERO_ADDRESS },
				{ type: "uint256", value: chainId },
			]);

			const badSignature = EthCrypto.sign(signer.privateKey, badMessage);
			fakeInfo.signature = badSignature;

			await expect(
				factory
					.connect(alice)
					.produce(fakeInfo, ethers.constants.HashZero)
			).to.be.revertedWithCustomError(factory, 'InvalidSignature');;
			fakeInfo.signature = signature;

			await factory.connect(alice).produce(info, ethers.constants.HashZero);

			const hash = ethers.utils.solidityKeccak256(
				['string', 'string'],
				[nftName, nftSymbol]
			);

			const nftInstanceInfo = await factory.getNftInstanceInfo(hash);
			const nftAddress = nftInstanceInfo.nftAddress;
			expect(nftAddress).to.not.be.equal(ZERO_ADDRESS);
			expect(nftInstanceInfo.name).to.be.equal(nftName);
			expect(nftInstanceInfo.symbol).to.be.equal(nftSymbol);
			expect(nftInstanceInfo.creator).to.be.equal(alice.address);

			console.log("instanceAddress = ", nftAddress);

			const nft = await ethers.getContractAt("NFT", nftAddress);
			const [transferValidator, factoryAddress, infoReturned, creator, referralCode] = await nft.parameters();

			expect(transferValidator).to.be.equal(validator.address);
			expect(factoryAddress).to.be.equal(factory.address);
			expect(infoReturned.payingToken).to.be.equal(info.payingToken);
			expect(infoReturned.mintPrice).to.be.equal(info.mintPrice);
			expect(infoReturned.contractURI).to.be.equal(info.contractURI);
			expect(creator).to.be.equal(alice.address);
		});

		it("should correctly deploy several NFT nfts", async () => {
			const { factory, owner, alice, bob, charlie, signer } = await loadFixture(fixture);

			const nftName1 = "Name 1";
			const nftName2 = "Name 2";
			const nftName3 = "Name 3";
			const nftSymbol1 = "S1";
			const nftSymbol2 = "S2";
			const nftSymbol3 = "S3";
			const contractURI1 = "contractURI1/123";
			const contractURI2 = "contractURI2/123";
			const contractURI3 = "contractURI3/123";
			const price1 = ethers.utils.parseEther("0.01");
			const price2 = ethers.utils.parseEther("0.02");
			const price3 = ethers.utils.parseEther("0.03");

			const message1 = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName1 },
				{ type: "string", value: nftSymbol1 },
				{ type: "string", value: contractURI1 },
				{ type: "uint96", value: 500 },
				{ type: "address", value: owner.address },
				{ type: "uint256", value: chainId },
			]);

			const signature1 = EthCrypto.sign(signer.privateKey, message1);

			await factory
				.connect(alice)
				.produce({
					name: nftName1,
					symbol: nftSymbol1,
					contractURI: contractURI1,
					payingToken: ZERO_ADDRESS,
					mintPrice: price1,
					whitelistMintPrice: price1,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: BigNumber.from("500"),
					feeReceiver: owner.address,
					collectionExpire: BigNumber.from("86400"),
					signature: signature1,
				} as InstanceInfoStruct,
					ethers.constants.HashZero);

			const message2 = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName2 },
				{ type: "string", value: nftSymbol2 },
				{ type: "string", value: contractURI2 },
				{ type: "uint96", value: 500 },
				{ type: "address", value: owner.address },
				{ type: "uint256", value: chainId },
			]);

			const signature2 = EthCrypto.sign(signer.privateKey, message2);

			await factory
				.connect(bob)
				.produce({
					name: nftName2,
					symbol: nftSymbol2,
					contractURI: contractURI2,
					payingToken: ETH_ADDRESS,
					mintPrice: price2,
					whitelistMintPrice: price2,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: BigNumber.from("500"),
					feeReceiver: owner.address,
					collectionExpire: BigNumber.from("86400"),
					signature: signature2,
				} as InstanceInfoStruct,
					ethers.constants.HashZero);

			const message3 = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName3 },
				{ type: "string", value: nftSymbol3 },
				{ type: "string", value: contractURI3 },
				{ type: "uint96", value: 500 },
				{ type: "address", value: owner.address },
				{ type: "uint256", value: chainId },
			]);

			const signature3 = EthCrypto.sign(signer.privateKey, message3);

			await factory
				.connect(charlie)
				.produce({
					name: nftName3,
					symbol: nftSymbol3,
					contractURI: contractURI3,
					payingToken: ETH_ADDRESS,
					mintPrice: price3,
					whitelistMintPrice: price3,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: BigNumber.from("500"),
					feeReceiver: owner.address,
					collectionExpire: BigNumber.from("86400"),
					signature: signature3,
				} as InstanceInfoStruct,
					ethers.constants.HashZero);

			const hash1 = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName1 },
				{ type: "string", value: nftSymbol1 },
			]);

			const hash2 = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName2 },
				{ type: "string", value: nftSymbol2 },
			]);

			const hash3 = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName3 },
				{ type: "string", value: nftSymbol3 },
			]);

			const instanceInfo1 = await factory.getNftInstanceInfo(hash1);
			const instanceInfo2 = await factory.getNftInstanceInfo(hash2);
			const instanceInfo3 = await factory.getNftInstanceInfo(hash3);

			expect(instanceInfo1.nftAddress).to.not.be.equal(ZERO_ADDRESS);
			expect(instanceInfo2.nftAddress).to.not.be.equal(ZERO_ADDRESS);
			expect(instanceInfo3.nftAddress).to.not.be.equal(ZERO_ADDRESS);

			expect(instanceInfo1.name).to.be.equal(nftName1);
			expect(instanceInfo1.symbol).to.be.equal(nftSymbol1);
			expect(instanceInfo1.creator).to.be.equal(alice.address);

			expect(instanceInfo2.name).to.be.equal(nftName2);
			expect(instanceInfo2.symbol).to.be.equal(nftSymbol2);
			expect(instanceInfo2.creator).to.be.equal(bob.address);

			expect(instanceInfo3.name).to.be.equal(nftName3);
			expect(instanceInfo3.symbol).to.be.equal(nftSymbol3);
			expect(instanceInfo3.creator).to.be.equal(charlie.address);

			console.log("instanceAddress1 = ", instanceInfo1.nftAddress);
			console.log("instanceAddress2 = ", instanceInfo2.nftAddress);
			console.log("instanceAddress3 = ", instanceInfo3.nftAddress);

			const nft1 = await ethers.getContractAt("NFT", instanceInfo1.nftAddress);
			let [transferValidator, factoryAddress, infoReturned, creator, referralCode] = await nft1.parameters();
			expect(infoReturned.payingToken).to.be.equal(ETH_ADDRESS);
			expect(factoryAddress).to.be.equal(factory.address);
			expect(infoReturned.mintPrice).to.be.equal(price1);
			expect(infoReturned.contractURI).to.be.equal(contractURI1);
			expect(creator).to.be.equal(alice.address);

			const nft2 = await ethers.getContractAt("NFT", instanceInfo2.nftAddress);
			[transferValidator, factoryAddress, infoReturned, creator, referralCode] = await nft2.parameters();
			expect(infoReturned.payingToken).to.be.equal(ETH_ADDRESS);
			expect(factoryAddress).to.be.equal(factory.address);
			expect(infoReturned.mintPrice).to.be.equal(price2);
			expect(infoReturned.contractURI).to.be.equal(contractURI2);
			expect(creator).to.be.equal(bob.address);

			const nft3 = await ethers.getContractAt("NFT", instanceInfo3.nftAddress);
			[transferValidator, factoryAddress, infoReturned, creator, referralCode] = await nft3.parameters();
			expect(infoReturned.payingToken).to.be.equal(ETH_ADDRESS);
			expect(factoryAddress).to.be.equal(factory.address);
			expect(infoReturned.mintPrice).to.be.equal(price3);
			expect(infoReturned.contractURI).to.be.equal(contractURI3);
			expect(creator).to.be.equal(charlie.address);
		});
	});

	describe('Deploy NFT', () => {
		it("Can create referral code", async () => {
			const { factory, alice } = await loadFixture(fixture);

			const hashedCode = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
			]);

			const tx = await factory.connect(alice).createReferralCode();

			await expect(tx).to.emit(factory, 'ReferralCodeCreated').withArgs(alice.address, hashedCode);
			expect(await factory.getReferralCreator(hashedCode)).to.eq(alice.address);

			await expect(factory.connect(alice).createReferralCode()).to.be.revertedWithCustomError(factory, 'ReferralCodeExists').withArgs(alice.address, hashedCode);
		});

		it("Can set referral", async () => {
			const { factory, signer, owner, alice, bob } = await loadFixture(fixture);

			const hashedCode = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
			]);

			const hashedCodeFalse = EthCrypto.hash.keccak256([
				{ type: "address", value: bob.address },
			]);

			await factory.connect(alice).createReferralCode();

			let nftName = "Name";
			let nftSymbol = "S";
			const contractURI = "contractURI/123";
			const price = ethers.utils.parseEther("0.01");
			const feeNumerator = 500;
			const feeReceiver = owner.address;

			let message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "address", value: feeReceiver },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			await expect(factory
				.connect(alice)
				.produce({
					name: nftName,
					symbol: nftSymbol,
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					feeReceiver: feeReceiver,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCodeFalse)).to.be.revertedWithCustomError(factory, 'ReferralCodeOwnerNotExist');

			await expect(factory
				.connect(alice)
				.produce({
					name: nftName,
					symbol: nftSymbol,
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					feeReceiver: feeReceiver,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode)).to.be.revertedWithCustomError(factory, 'CanNotAddAsReferrerOurself');

			const tx = await factory
				.connect(bob)
				.produce({
					name: nftName,
					symbol: nftSymbol,
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					feeReceiver: feeReceiver,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			await expect(tx).to.emit(factory, 'ReferreralCodeUsed').withArgs(hashedCode, bob.address);
			expect((await factory.getReferralUsers(hashedCode))[0]).to.eq(bob.address);

			const amount = 10000;
			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(amount / 2);

			nftName = "Name2";
			nftSymbol = "S2";

			message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "address", value: feeReceiver },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(bob)
				.produce({
					name: nftName,
					symbol: nftSymbol,
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					feeReceiver: feeReceiver,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(getPercentage(amount, referralPercentages.second));

			nftName = "Name3";
			nftSymbol = "S3";

			message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "address", value: feeReceiver },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(bob)
				.produce({
					name: nftName,
					symbol: nftSymbol,
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					feeReceiver: feeReceiver,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(getPercentage(amount, referralPercentages.third));

			nftName = "Name4";
			nftSymbol = "S4";

			message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "address", value: feeReceiver },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(bob)
				.produce({
					name: nftName,
					symbol: nftSymbol,
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					feeReceiver: feeReceiver,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(getPercentage(amount, referralPercentages.byDefault));

			nftName = "Name5";
			nftSymbol = "S5";

			message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "address", value: feeReceiver },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(bob)
				.produce({
					name: nftName,
					symbol: nftSymbol,
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					feeReceiver: feeReceiver,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(getPercentage(amount, referralPercentages.byDefault));

			nftName = "Name6";
			nftSymbol = "S6";

			message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "address", value: feeReceiver },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(bob)
				.produce({
					name: nftName,
					symbol: nftSymbol,
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					feeReceiver: feeReceiver,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(getPercentage(amount, referralPercentages.byDefault));
		});
	});

	describe('Works properly', () => {
		it("Can set max array size", async () => {
			const { factory, alice } = await loadFixture(fixture);

			await expect(factory.connect(alice).setMaxArraySize(2)).to.be.revertedWithCustomError(factory, 'Unauthorized');

			const tx = await factory.setMaxArraySize(2);

			await expect(tx).to.emit(factory, 'MaxArraySizeSet').withArgs(2);
			expect((await factory.nftFactoryParameters()).maxArraySize).to.be.equal(2);
		});

		it("Can set default currency", async () => {
			const { factory, erc20Example, alice } = await loadFixture(fixture);

			await expect(factory.connect(alice).setDefaultPaymentCurrency(alice.address)).to.be.revertedWithCustomError(factory, 'Unauthorized');
			await expect(factory.setDefaultPaymentCurrency(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPassed');

			const tx = await factory.setDefaultPaymentCurrency(erc20Example.address);

			await expect(tx).to.emit(factory, 'DefaultPaymentCurrencySet').withArgs(erc20Example.address);
			expect((await factory.nftFactoryParameters()).defaultPaymentCurrency).to.be.equal(erc20Example.address);
		});

		it("Can set platform comision", async () => {
			const { factory, alice } = await loadFixture(fixture);

			await expect(factory.connect(alice).setPlatformCommission(2)).to.be.revertedWithCustomError(factory, 'Unauthorized');

			const tx = await factory.setPlatformCommission(2);

			await expect(tx).to.emit(factory, 'PlatformCommissionSet').withArgs(2);
			expect((await factory.nftFactoryParameters()).platformCommission).to.be.equal(2);
		});

		it("Can set platform address", async () => {
			const { factory, erc20Example, alice } = await loadFixture(fixture);

			await expect(factory.connect(alice).setPlatformAddress(alice.address)).to.be.revertedWithCustomError(factory, 'Unauthorized');
			await expect(factory.setPlatformAddress(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPassed');

			const tx = await factory.setPlatformAddress(erc20Example.address);

			await expect(tx).to.emit(factory, 'PlatformAddressSet').withArgs(erc20Example.address);
			expect((await factory.nftFactoryParameters()).platformAddress).to.be.equal(erc20Example.address);
		});

		it("Can set signer", async () => {
			const { factory, erc20Example, alice } = await loadFixture(fixture);

			await expect(factory.connect(alice).setSigner(alice.address)).to.be.revertedWithCustomError(factory, 'Unauthorized');
			await expect(factory.setSigner(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPassed');

			const tx = await factory.setSigner(erc20Example.address);

			await expect(tx).to.emit(factory, 'SignerSet').withArgs(erc20Example.address);
			expect((await factory.nftFactoryParameters()).signerAddress).to.be.equal(erc20Example.address);
		});
	});

	describe('Errors', () => {
		it("should correct set parameters", async () => {
			const { factory, owner, bob, charlie, } = await loadFixture(fixture);
			const newPlatformAddress = bob.address;
			const newSigner = charlie.address;

			const tx1 = await factory.connect(owner).setDefaultPaymentCurrency(newPlatformAddress);
			expect((await factory.nftFactoryParameters()).defaultPaymentCurrency).to.be.equal(newPlatformAddress);
			await expect(tx1).to.emit(factory, 'DefaultPaymentCurrencySet').withArgs(newPlatformAddress);

			const tx2 = await factory.connect(owner).setMaxArraySize(2);
			expect((await factory.nftFactoryParameters()).maxArraySize).to.be.equal(2);
			await expect(tx2).to.emit(factory, 'MaxArraySizeSet').withArgs(2);

			const tx3 = await factory.connect(owner).setPlatformCommission(2);
			expect((await factory.nftFactoryParameters()).platformCommission).to.be.equal(2);
			await expect(tx3).to.emit(factory, 'PlatformCommissionSet').withArgs(2);

			const tx4 = await factory.connect(owner).setPlatformAddress(newPlatformAddress);
			expect((await factory.nftFactoryParameters()).platformAddress).to.be.equal(newPlatformAddress);
			await expect(tx4).to.emit(factory, 'PlatformAddressSet').withArgs(newPlatformAddress);

			const tx5 = await factory.connect(owner).setSigner(newSigner);
			expect((await factory.nftFactoryParameters()).signerAddress).to.be.equal(newSigner);
			await expect(tx5).to.emit(factory, 'SignerSet').withArgs(newSigner);

			const tx6 = await factory.connect(owner).setTransferValidator(newPlatformAddress);
			expect((await factory.nftFactoryParameters()).transferValidator).to.be.equal(newPlatformAddress);
			await expect(tx6).to.emit(factory, 'TransferValidatorSet').withArgs(newPlatformAddress);

			referralPercentages.byDefault = 1;
			const tx7 = await factory.connect(owner).setReferralPercentages(referralPercentages);
			expect(await factory.usedToPercentage(4)).to.be.equal(referralPercentages.byDefault);
			await expect(tx7).to.emit(factory, 'PercentagesSet');
		});

		it("only owner", async () => {
			const { factory, alice } = await loadFixture(fixture);

			await expect(factory.connect(alice).setPlatformCommission(1)).to.be.revertedWithCustomError(factory, 'Unauthorized');
			await expect(factory.connect(alice).setSigner(alice.address)).to.be.revertedWithCustomError(factory, 'Unauthorized');
			await expect(factory.connect(alice).setPlatformAddress(alice.address)).to.be.revertedWithCustomError(factory, 'Unauthorized');
			await expect(factory.connect(alice).setTransferValidator(alice.address)).to.be.revertedWithCustomError(factory, 'Unauthorized');
			await expect(factory.connect(alice).setMaxArraySize(2)).to.be.revertedWithCustomError(factory, 'Unauthorized');
			await expect(factory.connect(alice).setTransferValidator(alice.address)).to.be.revertedWithCustomError(factory, 'Unauthorized');
			await expect(factory.connect(alice).setReferralPercentages(referralPercentages)).to.be.revertedWithCustomError(factory, 'Unauthorized');
		});

		it("zero params check", async () => {
			const { factory, } = await loadFixture(fixture);

			await expect(factory.setSigner(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPassed');
			await expect(factory.setPlatformAddress(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPassed');
			await expect(factory.setTransferValidator(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPassed');
			await expect(factory.setTransferValidator(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPassed');
		});


		it("produce() params check", async () => {
			const { factory, owner, alice, signer } = await loadFixture(fixture);

			const uri = "test.com";
			const nftName = "Name 1";
			const nftSymbol = "S1";
			const contractURI = "contractURI/123";
			const price = ethers.utils.parseEther("0.05");

			const message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: 500 },
				{ type: "address", value: owner.address },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(alice)
				.produce({
					name: nftName,
					symbol: nftSymbol,
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: BigNumber.from("500"),
					feeReceiver: owner.address,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					ethers.constants.HashZero);

			await expect(
				factory
					.connect(alice)
					.produce({
						name: nftName,
						symbol: nftSymbol,
						contractURI: contractURI,
						payingToken: ETH_ADDRESS,
						mintPrice: price,
						whitelistMintPrice: price,
						transferable: true,
						maxTotalSupply: BigNumber.from("1000"),
						feeNumerator: BigNumber.from("500"),
						feeReceiver: owner.address,
						collectionExpire: BigNumber.from("86400"),
						signature: signature,
					} as InstanceInfoStruct,
						ethers.constants.HashZero)
			).to.be.revertedWithCustomError(factory, "NFTAlreadyExists");

			await expect(
				factory
					.connect(alice)
					.produce({
						name: '',
						symbol: nftSymbol,
						contractURI: contractURI,
						payingToken: ETH_ADDRESS,
						mintPrice: price,
						whitelistMintPrice: price,
						transferable: true,
						maxTotalSupply: BigNumber.from("1000"),
						feeNumerator: BigNumber.from("500"),
						feeReceiver: owner.address,
						collectionExpire: BigNumber.from("86400"),
						signature: signature,
					} as InstanceInfoStruct,
						ethers.constants.HashZero)
			).to.be.revertedWithCustomError(factory, "EmptyNameSymbolPassed");

			await expect(
				factory
					.connect(alice)
					.produce({
						name: nftName,
						symbol: '',
						contractURI: contractURI,
						payingToken: ETH_ADDRESS,
						mintPrice: price,
						whitelistMintPrice: price,
						transferable: true,
						maxTotalSupply: BigNumber.from("1000"),
						feeNumerator: BigNumber.from("500"),
						feeReceiver: owner.address,
						collectionExpire: BigNumber.from("86400"),
						signature: signature,
					} as InstanceInfoStruct,
						ethers.constants.HashZero)
			).to.be.revertedWithCustomError(factory, "EmptyNameSymbolPassed");
		});
	});
});

function getPercentage(
	amount: BigNumberish,
	percentage: BigNumberish
): number {
	return (amount * percentage) /
		10000;
}
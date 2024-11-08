
import { ethers, upgrades } from 'hardhat';
import { loadFixture, } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, BigNumberish, ContractFactory } from "ethers";
import { WETHMock, MockTransferValidator, NFTFactory, RoyaltiesReceiver } from "../typechain-types";
import { expect } from "chai";
import { InstanceInfoStruct } from "../typechain-types/contracts/NFT";
import EthCrypto from "eth-crypto";
import { NftFactoryParametersStruct, NftInstanceInfoStruct } from '../typechain-types/contracts/factories/NFTFactory';

describe('NFTFactory', () => {
	const PLATFORM_COMISSION = "10";
	const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
	const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
	const chainId = 31337;

	let factoryParams: NftFactoryParametersStruct, referralPercentages: number[];

	async function fixture() {
		const [owner, alice, bob, charlie] = await ethers.getSigners();
		const signer = EthCrypto.createIdentity();

		const Erc20Example: ContractFactory = await ethers.getContractFactory("WETHMock");
		const erc20Example: WETHMock = await Erc20Example.deploy() as WETHMock;
		await erc20Example.deployed();

		const Validator: ContractFactory = await ethers.getContractFactory("MockTransferValidatorV2");
		const validator: MockTransferValidator = await Validator.deploy(true) as MockTransferValidator;
		await validator.deployed();

		factoryParams = {
			transferValidator: validator.address,
			platformAddress: owner.address,
			signerAddress: signer.address,
			platformCommission: PLATFORM_COMISSION,
			defaultPaymentCurrency: ETH_ADDRESS,
			maxArraySize: 10
		} as NftFactoryParametersStruct;

		referralPercentages = [0, 5000, 3000, 1500, 500];

		const NFTFactory: ContractFactory = await ethers.getContractFactory("NFTFactory");
		const factory: NFTFactory = await upgrades.deployProxy(NFTFactory, [
			factoryParams,
			referralPercentages,
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
			expect((await factory.nftFactoryParameters()).maxArraySize).to.be.equal(factoryParams.maxArraySize);
			expect((await factory.nftFactoryParameters()).transferValidator).to.be.equal(validator.address);

			referralPercentages.forEach(async (pecentage, i) => {
				expect(await factory.usedToPercentage(i)).to.be.equal(pecentage);
			});
		});

		it("can not be initialized again", async () => {
			const { factory } = await loadFixture(fixture);

			await expect(factory.initialize(factoryParams, referralPercentages,)).to.be.revertedWithCustomError(factory, 'InvalidInitialization')
		});
	});

	describe('Deploy NFT', () => {
		it.only("should correct deploy NFT instance", async () => {
			const { factory, validator, owner, alice, signer } = await loadFixture(fixture);

			const nftName = "Name 1";
			const nftSymbol = "S1";
			const contractURI = "contractURI/123";
			const price = ethers.utils.parseEther("0.05");
			const feeNumerator = 500;

			const message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			const info: InstanceInfoStruct = {
				metadata: {
					name: nftName,
					symbol: nftSymbol
				},
				contractURI,
				payingToken: ETH_ADDRESS,
				mintPrice: price,
				whitelistMintPrice: price,
				transferable: true,
				maxTotalSupply: BigNumber.from("1000"),
				feeNumerator,
				collectionExpire: BigNumber.from("86400"),
				signature: signature
			};

			const fakeInfo = info;

			const emptyNameMessage = EthCrypto.hash.keccak256([
				{ type: "string", value: "" },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
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
				{ type: "uint256", value: chainId + 1 },
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
			expect(nftInstanceInfo.metadata.name).to.be.equal(nftName);
			expect(nftInstanceInfo.metadata.symbol).to.be.equal(nftSymbol);
			expect(nftInstanceInfo.creator).to.be.equal(alice.address);

			console.log("instanceAddress = ", nftAddress);

			const nft = await ethers.getContractAt("NFT", nftAddress);
			const [transferValidator, factoryAddress, creator, feeReceiver, referralCode, infoReturned] = await nft.parameters();

			expect(transferValidator).to.be.equal(validator.address);
			expect(factoryAddress).to.be.equal(factory.address);
			expect(infoReturned.payingToken).to.be.equal(info.payingToken);
			expect(infoReturned.mintPrice).to.be.equal(info.mintPrice);
			expect(infoReturned.contractURI).to.be.equal(info.contractURI);
			expect(creator).to.be.equal(alice.address);

			const RoyaltiesReceiver: RoyaltiesReceiver = await ethers.getContractAt("RoyaltiesReceiver", feeReceiver);

			let payees: string[] = [];
			let shares: BigNumber[] = [];

			for (let i = 0; i < 3; ++i) {
				payees[i] = (await RoyaltiesReceiver.payees(i));
				shares[i] = (await RoyaltiesReceiver.shares(payees[i]));
			}

			expect(payees[0]).to.eq(alice.address);
			expect(payees[1]).to.eq((await factory.nftFactoryParameters()).platformAddress);
			expect(payees[2]).to.eq(ZERO_ADDRESS);
			expect(shares[0]).to.eq(8000);
			expect(shares[1]).to.eq(2000);
			expect(shares[2]).to.eq(0);
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
				{ type: "uint256", value: chainId },
			]);

			const signature1 = EthCrypto.sign(signer.privateKey, message1);

			await factory
				.connect(alice)
				.produce({
					metadata: {
						name: nftName1,
						symbol: nftSymbol1
					},
					contractURI: contractURI1,
					payingToken: ZERO_ADDRESS,
					mintPrice: price1,
					whitelistMintPrice: price1,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: BigNumber.from("500"),
					collectionExpire: BigNumber.from("86400"),
					signature: signature1,
				} as InstanceInfoStruct,
					ethers.constants.HashZero);

			const message2 = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName2 },
				{ type: "string", value: nftSymbol2 },
				{ type: "string", value: contractURI2 },
				{ type: "uint96", value: 500 },
				{ type: "uint256", value: chainId },
			]);

			const signature2 = EthCrypto.sign(signer.privateKey, message2);

			await factory
				.connect(bob)
				.produce({
					metadata: {
						name: nftName2,
						symbol: nftSymbol2
					},
					contractURI: contractURI2,
					payingToken: ETH_ADDRESS,
					mintPrice: price2,
					whitelistMintPrice: price2,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: BigNumber.from("500"),
					collectionExpire: BigNumber.from("86400"),
					signature: signature2,
				} as InstanceInfoStruct,
					ethers.constants.HashZero);

			const message3 = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName3 },
				{ type: "string", value: nftSymbol3 },
				{ type: "string", value: contractURI3 },
				{ type: "uint96", value: 500 },
				{ type: "uint256", value: chainId },
			]);

			const signature3 = EthCrypto.sign(signer.privateKey, message3);

			await factory
				.connect(charlie)
				.produce({
					metadata: {
						name: nftName3,
						symbol: nftSymbol3
					},
					contractURI: contractURI3,
					payingToken: ETH_ADDRESS,
					mintPrice: price3,
					whitelistMintPrice: price3,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: BigNumber.from("500"),
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

			expect(instanceInfo1.metadata.name).to.be.equal(nftName1);
			expect(instanceInfo1.metadata.symbol).to.be.equal(nftSymbol1);
			expect(instanceInfo1.creator).to.be.equal(alice.address);

			expect(instanceInfo2.metadata.name).to.be.equal(nftName2);
			expect(instanceInfo2.metadata.symbol).to.be.equal(nftSymbol2);
			expect(instanceInfo2.creator).to.be.equal(bob.address);

			expect(instanceInfo3.metadata.name).to.be.equal(nftName3);
			expect(instanceInfo3.metadata.symbol).to.be.equal(nftSymbol3);
			expect(instanceInfo3.creator).to.be.equal(charlie.address);

			console.log("instanceAddress1 = ", instanceInfo1.nftAddress);
			console.log("instanceAddress2 = ", instanceInfo2.nftAddress);
			console.log("instanceAddress3 = ", instanceInfo3.nftAddress);

			const nft1 = await ethers.getContractAt("NFT", instanceInfo1.nftAddress);
			let [transferValidator, factoryAddress, creator, feeReceiver, referralCode, infoReturned] = await nft1.parameters();
			expect(infoReturned.payingToken).to.be.equal(ETH_ADDRESS);
			expect(factoryAddress).to.be.equal(factory.address);
			expect(infoReturned.mintPrice).to.be.equal(price1);
			expect(infoReturned.contractURI).to.be.equal(contractURI1);
			expect(creator).to.be.equal(alice.address);

			const nft2 = await ethers.getContractAt("NFT", instanceInfo2.nftAddress);
			[transferValidator, factoryAddress, creator, feeReceiver, referralCode, infoReturned] = await nft2.parameters();
			expect(infoReturned.payingToken).to.be.equal(ETH_ADDRESS);
			expect(factoryAddress).to.be.equal(factory.address);
			expect(infoReturned.mintPrice).to.be.equal(price2);
			expect(infoReturned.contractURI).to.be.equal(contractURI2);
			expect(creator).to.be.equal(bob.address);

			const nft3 = await ethers.getContractAt("NFT", instanceInfo3.nftAddress);
			[transferValidator, factoryAddress, creator, feeReceiver, referralCode, infoReturned] = await nft3.parameters();
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
				{ type: "address", value: factory.address },
				{ type: "uint256", value: chainId },
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
				{ type: "address", value: factory.address },
				{ type: "uint256", value: chainId },
			]);

			const hashedCodeFalse = EthCrypto.hash.keccak256([
				{ type: "address", value: bob.address },
				{ type: "address", value: factory.address },
				{ type: "uint256", value: chainId },
			]);

			await factory.connect(alice).createReferralCode();

			let nftName = "Name";
			let nftSymbol = "S";
			const contractURI = "contractURI/123";
			const price = ethers.utils.parseEther("0.01");
			const feeNumerator = 500;

			let message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			await expect(factory
				.connect(alice)
				.produce({
					metadata: {
						name: nftName,
						symbol: nftSymbol
					},
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCodeFalse)).to.be.revertedWithCustomError(factory, 'ReferralCodeOwnerError');

			await expect(factory
				.connect(alice)
				.produce({
					metadata: {
						name: nftName,
						symbol: nftSymbol
					},
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode)).to.be.revertedWithCustomError(factory, 'ReferralCodeOwnerError');

			const tx = await factory
				.connect(bob)
				.produce({
					metadata: {
						name: nftName,
						symbol: nftSymbol
					},
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			await expect(tx).to.emit(factory, 'ReferralCodeUsed').withArgs(hashedCode, bob.address);
			expect((await factory.getReferralUsers(hashedCode))[0]).to.eq(bob.address);

			const amount = 10000;
			await expect(factory.getReferralRate(bob.address, hashedCodeFalse, amount)).to.be.revertedWithCustomError(factory, 'ReferralCodeNotUsedByUser').withArgs(bob.address, hashedCodeFalse);
			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(amount / 2);

			nftName = "Name2";
			nftSymbol = "S2";

			message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(bob)
				.produce({
					metadata: {
						name: nftName,
						symbol: nftSymbol
					},
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(getPercentage(amount, referralPercentages[2]));

			nftName = "Name3";
			nftSymbol = "S3";

			message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(bob)
				.produce({
					metadata: {
						name: nftName,
						symbol: nftSymbol
					},
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(getPercentage(amount, referralPercentages[3]));

			nftName = "Name4";
			nftSymbol = "S4";

			message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(bob)
				.produce({
					metadata: {
						name: nftName,
						symbol: nftSymbol
					},
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(getPercentage(amount, referralPercentages[4]));

			nftName = "Name5";
			nftSymbol = "S5";

			message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(bob)
				.produce({
					metadata: {
						name: nftName,
						symbol: nftSymbol
					},
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(getPercentage(amount, referralPercentages[4]));

			nftName = "Name6";
			nftSymbol = "S6";

			message = EthCrypto.hash.keccak256([
				{ type: "string", value: nftName },
				{ type: "string", value: nftSymbol },
				{ type: "string", value: contractURI },
				{ type: "uint96", value: feeNumerator },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(bob)
				.produce({
					metadata: {
						name: nftName,
						symbol: nftSymbol
					},
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: feeNumerator,
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					hashedCode);

			expect(await factory.getReferralRate(bob.address, hashedCode, amount)).to.eq(getPercentage(amount, referralPercentages[4]));
		});
	});

	describe('Works properly', () => {
		it("Can set params", async () => {
			const { factory, alice } = await loadFixture(fixture);

			let _factoryParams = factoryParams;

			await expect(factory.connect(alice).setFactoryParameters(_factoryParams, referralPercentages)).to.be.revertedWithCustomError(factory, 'Unauthorized');

			referralPercentages[1] = 1;

			const tx = await factory.setFactoryParameters(_factoryParams, referralPercentages);
			await expect(tx).to.emit(factory, 'FactoryParametersSet');
			await expect(tx).to.emit(factory, 'PercentagesSet');
		});
	});

	describe('Errors', () => {
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
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await factory
				.connect(alice)
				.produce({
					metadata: {
						name: nftName,
						symbol: nftSymbol
					},
					contractURI: contractURI,
					payingToken: ETH_ADDRESS,
					mintPrice: price,
					whitelistMintPrice: price,
					transferable: true,
					maxTotalSupply: BigNumber.from("1000"),
					feeNumerator: BigNumber.from("500"),
					collectionExpire: BigNumber.from("86400"),
					signature: signature,
				} as InstanceInfoStruct,
					ethers.constants.HashZero);

			await expect(
				factory
					.connect(alice)
					.produce({
						metadata: {
							name: nftName,
							symbol: nftSymbol
						},
						contractURI: contractURI,
						payingToken: ETH_ADDRESS,
						mintPrice: price,
						whitelistMintPrice: price,
						transferable: true,
						maxTotalSupply: BigNumber.from("1000"),
						feeNumerator: BigNumber.from("500"),
						collectionExpire: BigNumber.from("86400"),
						signature: signature,
					} as InstanceInfoStruct,
						ethers.constants.HashZero)
			).to.be.revertedWithCustomError(factory, "NFTAlreadyExists");
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
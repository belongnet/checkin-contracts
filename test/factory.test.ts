
import { ethers, upgrades } from 'hardhat';
import { loadFixture, } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, ContractFactory } from "ethers";
import { Erc20Example, MockTransferValidator, NFTFactory, StorageContract } from "../typechain-types";
import { expect } from "chai";
import { InstanceInfoStruct } from "../typechain-types/contracts/nft-with-royalties/NFT";
import EthCrypto from "eth-crypto";
import { NftFactoryInfoStruct } from '../typechain-types/contracts/nft-with-royalties/factories/NFTFactory';

describe('NFTFactory', () => {
	const PLATFORM_COMISSION = "10";
	const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
	const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
	const chainId = 31337;

	let nftInfo: NftFactoryInfoStruct;

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
			platformAddress: owner.address,
			signerAddress: signer.address,
			platformCommission: PLATFORM_COMISSION,
			defaultPaymentCurrency: ETH_ADDRESS
		} as NftFactoryInfoStruct

		const NFTFactory: ContractFactory = await ethers.getContractFactory("NFTFactory", owner);
		const factory: NFTFactory = await upgrades.deployProxy(NFTFactory, [
			nftInfo,
			validator.address,
		]) as NFTFactory;
		await factory.deployed();

		return { factory, validator, erc20Example, owner, alice, bob, charlie, signer };
	}

	describe('Deployment', () => {
		it("should correct initialize", async () => {
			const { factory, owner, signer } = await loadFixture(fixture);

			expect(await factory.platformAddress()).to.be.equal(owner.address);
			expect(await factory.platformCommission()).to.be.equal(+PLATFORM_COMISSION);
			expect(await factory.signerAddress()).to.be.equal(signer.address);
			expect(await factory.defaultPaymentCurrency()).to.be.equal(ETH_ADDRESS);
		});

		it("can not be initialized again", async () => {
			const { factory, validator } = await loadFixture(fixture);

			await expect(factory.initialize(nftInfo, validator.address,)).to.be.revertedWithCustomError(factory, 'InvalidInitialization')
		});
	});

	describe('Deploy NFT', () => {
		it("should correct deploy NFT instance", async () => {
			const { factory, owner, alice, signer } = await loadFixture(fixture);

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
					.produce(fakeInfo)
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
					.produce(fakeInfo)
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
					.produce(fakeInfo)
			).to.be.revertedWithCustomError(factory, 'InvalidSignature');;
			fakeInfo.signature = signature;

			await factory.connect(alice).produce(info);

			const hash = ethers.utils.solidityKeccak256(
				['string', 'string'],
				[nftName, nftSymbol]
			);

			const instanceAddress = await factory.getInstance(hash);
			expect(instanceAddress).to.not.be.equal(ZERO_ADDRESS);
			expect(instanceAddress).to.be.equal(await factory.instances(0));
			const instanceInfo = await factory.getInstanceInfo(0);
			expect(instanceInfo.name).to.be.equal(nftName);
			expect(instanceInfo.symbol).to.be.equal(nftSymbol);
			expect(instanceInfo.creator).to.be.equal(alice.address);
			await expect(factory.getInstanceInfo(10)).to.be.revertedWithCustomError(factory, 'IncorrectInstanceId');

			console.log("instanceAddress = ", instanceAddress);

			const nft = await ethers.getContractAt("NFT", instanceAddress);
			const [factoryAddress, infoReturned, creator] = await nft.parameters();

			expect(factoryAddress).to.be.equal(factory.address);
			expect(infoReturned.payingToken).to.be.equal(info.payingToken);
			expect(infoReturned.mintPrice).to.be.equal(info.mintPrice);
			expect(infoReturned.contractURI).to.be.equal(info.contractURI);
			expect(creator).to.be.equal(alice.address);
			expect(await factory.instancesCount()).to.be.equal(1);
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
				} as InstanceInfoStruct);

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
				} as InstanceInfoStruct);

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
				} as InstanceInfoStruct);

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

			const instanceAddress1 = await factory.getInstance(hash1);
			const instanceAddress2 = await factory.getInstance(hash2);
			const instanceAddress3 = await factory.getInstance(hash3);

			expect(instanceAddress1).to.not.be.equal(ZERO_ADDRESS);
			expect(instanceAddress2).to.not.be.equal(ZERO_ADDRESS);
			expect(instanceAddress3).to.not.be.equal(ZERO_ADDRESS);

			expect(instanceAddress1).to.be.equal(await factory.instances(0));
			expect(instanceAddress2).to.be.equal(await factory.instances(1));
			expect(instanceAddress3).to.be.equal(await factory.instances(2));

			const instanceInfo1 = await factory.getInstanceInfo(0);
			const instanceInfo2 = await factory.getInstanceInfo(1);
			const instanceInfo3 = await factory.getInstanceInfo(2);

			expect(instanceInfo1.name).to.be.equal(nftName1);
			expect(instanceInfo1.symbol).to.be.equal(nftSymbol1);
			expect(instanceInfo1.creator).to.be.equal(alice.address);

			expect(instanceInfo2.name).to.be.equal(nftName2);
			expect(instanceInfo2.symbol).to.be.equal(nftSymbol2);
			expect(instanceInfo2.creator).to.be.equal(bob.address);

			expect(instanceInfo3.name).to.be.equal(nftName3);
			expect(instanceInfo3.symbol).to.be.equal(nftSymbol3);
			expect(instanceInfo3.creator).to.be.equal(charlie.address);

			console.log("instanceAddress1 = ", instanceAddress1);
			console.log("instanceAddress2 = ", instanceAddress2);
			console.log("instanceAddress3 = ", instanceAddress3);

			const nft1 = await ethers.getContractAt("NFT", instanceAddress1);
			let [factoryAddress, info, creator] = await nft1.parameters();
			expect(info.payingToken).to.be.equal(ETH_ADDRESS);
			expect(factoryAddress).to.be.equal(factory.address);
			expect(info.mintPrice).to.be.equal(price1);
			expect(info.contractURI).to.be.equal(contractURI1);
			expect(creator).to.be.equal(alice.address);

			const nft2 = await ethers.getContractAt("NFT", instanceAddress2);
			[factoryAddress, info, creator] = await nft2.parameters();
			expect(info.payingToken).to.be.equal(ETH_ADDRESS);
			expect(factoryAddress).to.be.equal(factory.address);
			expect(info.mintPrice).to.be.equal(price2);
			expect(info.contractURI).to.be.equal(contractURI2);
			expect(creator).to.be.equal(bob.address);

			const nft3 = await ethers.getContractAt("NFT", instanceAddress3);
			[factoryAddress, info, creator] = await nft3.parameters();
			expect(info.payingToken).to.be.equal(ETH_ADDRESS);
			expect(factoryAddress).to.be.equal(factory.address);
			expect(info.mintPrice).to.be.equal(price3);
			expect(info.contractURI).to.be.equal(contractURI3);
			expect(creator).to.be.equal(charlie.address);
		});

		it("should correct set parameters", async () => {
			const { factory, owner, bob, charlie, } = await loadFixture(fixture);
			const newPlatformAddress = bob.address;
			const newSigner = charlie.address;

			await factory.connect(owner).setPlatformAddress(newPlatformAddress);
			expect(await factory.platformAddress()).to.be.equal(newPlatformAddress);
			await expect(factory.connect(owner).setSigner(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPasted');
			await factory.connect(owner).setSigner(newSigner);
			expect(await factory.signerAddress()).to.be.equal(newSigner);
		});
	});

	describe('Works properly', () => {
		it("Can set default currency", async () => {
			const { factory, erc20Example, alice } = await loadFixture(fixture);

			await expect(factory.connect(alice).setDefaultPaymentCurrency(alice.address)).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount').withArgs(alice.address);
			await expect(factory.setDefaultPaymentCurrency(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPasted');

			await factory.setDefaultPaymentCurrency(erc20Example.address);
			expect(await factory.defaultPaymentCurrency()).to.be.equal(erc20Example.address);
		});

		it("Can set platform address", async () => {
			const { factory, erc20Example, alice } = await loadFixture(fixture);

			await expect(factory.connect(alice).setPlatformAddress(alice.address)).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount').withArgs(alice.address);
			await expect(factory.setPlatformAddress(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPasted');

			await factory.setPlatformAddress(erc20Example.address);
			expect(await factory.platformAddress()).to.be.equal(erc20Example.address);
		});

		it("Can set signer", async () => {
			const { factory, erc20Example, alice } = await loadFixture(fixture);

			await expect(factory.connect(alice).setSigner(alice.address)).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount').withArgs(alice.address);
			await expect(factory.setSigner(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPasted');

			await factory.setSigner(erc20Example.address);
			expect(await factory.signerAddress()).to.be.equal(erc20Example.address);
		});
	});

	describe('Errors', () => {
		it("only owner", async () => {
			const { factory, alice } = await loadFixture(fixture);

			await expect(factory.connect(alice).setPlatformCommission(1)).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount').withArgs(alice.address);
			await expect(factory.connect(alice).setSigner(alice.address)).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount').withArgs(alice.address);
			await expect(factory.connect(alice).setPlatformAddress(alice.address)).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount').withArgs(alice.address);
			await expect(factory.connect(alice).setTransferValidator(alice.address)).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount').withArgs(alice.address);
		});

		it("zero params check", async () => {
			const { factory, } = await loadFixture(fixture);

			await expect(factory.setSigner(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPasted');
			await expect(factory.setPlatformAddress(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPasted');
			await expect(factory.setTransferValidator(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPasted');
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
				} as InstanceInfoStruct);

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
					} as InstanceInfoStruct)
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
					} as InstanceInfoStruct)
			).to.be.revertedWithCustomError(factory, "EmptyNamePasted");

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
					} as InstanceInfoStruct)
			).to.be.revertedWithCustomError(factory, "EmptySymbolPasted");
		});
	});
});

import { ethers, upgrades } from "hardhat";
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, ContractFactory } from "ethers";
import { MockTransferValidator, NFTFactory, StorageContract } from "../typechain-types";
import { expect } from "chai";
import { InstanceInfoStruct } from "../typechain-types/contracts/nft-with-royalties/NFT";
import EthCrypto from "eth-crypto";

describe('NFTFactory', () => {
	const PLATFORM_COMISSION = "10";
	const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
	const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
	const chainId = 31337;

	async function fixture() {
		const [owner, alice, bob, charlie, signer] = await ethers.getSigners();

		const Storage: ContractFactory = await ethers.getContractFactory("StorageContract", owner);
		const storage: StorageContract = await Storage.deploy() as StorageContract;
		await storage.deployed();

		const Validator: ContractFactory = await ethers.getContractFactory("MockTransferValidator");
		const validator: MockTransferValidator = await Validator.deploy(true) as MockTransferValidator;
		await validator.deployed();

		const NFTFactory: ContractFactory = await ethers.getContractFactory("NFTFactory", owner);
		const factory: NFTFactory = await upgrades.deployProxy(NFTFactory, [
			signer.address,
			owner.address,
			PLATFORM_COMISSION,
			storage.address,
			validator.address,
		]) as NFTFactory;
		await factory.deployed();

		await storage.connect(owner).setFactory(factory.address);

		console.log(owner.address, bob.address, charlie.address, alice.address)

		return { storage, factory, validator, owner, alice, bob, charlie, signer };
	}

	describe('Deployment', () => {
		it("should correct initialize", async () => {
			const { factory, storage, owner, signer } = await loadFixture(fixture);

			expect(await factory.platformAddress()).to.be.equal(owner.address);
			expect(await factory.storageContract()).to.be.equal(storage.address);
			expect(await factory.platformCommission()).to.be.equal(+PLATFORM_COMISSION);
			expect(await factory.signerAddress()).to.be.equal(signer.address);
		});
	});

	describe('Deploy NFT', () => {
		it("should correct deploy NFT instance", async () => {
			const { factory, storage, owner, alice, signer } = await loadFixture(fixture);

			const nftName = "Name 1";
			const nftSymbol = "S1";
			const contractURI = "contractURI/123";
			const price = ethers.utils.parseEther("0.05");
			const feeNumerator = BigNumber.from("500");
			const feeReceiver = owner.address;

			// EIP-712 Domain
			const domain = {
				name: "NFTFactory",
				version: "1",
				chainId: chainId,
				verifyingContract: factory.address
			};

			// Types
			const types = {
				InstanceInfo: [
					{ name: "name", type: "string" },
					{ name: "symbol", type: "string" },
					{ name: "contractURI", type: "string" },
					{ name: "feeNumerator", type: "uint96" },
					{ name: "feeReceiver", type: "address" },
					{ name: "chainId", type: "uint256" }
				]
			};

			// Value to sign
			const value = {
				name: nftName,
				symbol: nftSymbol,
				contractURI: contractURI,
				feeNumerator: feeNumerator,
				feeReceiver: feeReceiver,
				chainId: chainId
			};

			// Sign the data using EIP-712 structured data
			const signature = await signer._signTypedData(domain, types, value);

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

			await expect(
				factory
					.connect(alice)
					.produce(fakeInfo)
			).to.be.revertedWithCustomError(factory, 'InvalidSignature');
			fakeInfo.payingToken = ETH_ADDRESS;

			fakeInfo.feeReceiver = ZERO_ADDRESS;
			await expect(
				factory
					.connect(alice)
					.produce(fakeInfo)
			).to.be.revertedWithCustomError(factory, 'InvalidSignature');
			fakeInfo.feeReceiver = owner.address;

			const emptyNameMessage = ethers.utils.solidityKeccak256(
				["string", "string", "string", "uint96", "address", "uint256"],
				['', nftSymbol, contractURI, BigNumber.from("500"), ZERO_ADDRESS, chainId]
			);
			const emptyNameSignature = await signer.signMessage(emptyNameMessage);
			fakeInfo.signature = emptyNameSignature;

			await expect(
				factory
					.connect(alice)
					.produce(fakeInfo)
			).to.be.revertedWithCustomError(factory, 'InvalidSignature');;

			const emptySymbolMessage = ethers.utils.solidityKeccak256(
				["string", "string", "string", "uint96", "address", "uint256"],
				[nftName, '', contractURI, BigNumber.from("500"), ZERO_ADDRESS, chainId]
			);
			const emptySymbolSignature = await signer.signMessage(emptySymbolMessage);
			fakeInfo.signature = emptySymbolSignature;

			await expect(
				factory
					.connect(alice)
					.produce(fakeInfo)
			).to.be.revertedWithCustomError(factory, 'InvalidSignature');;

			const badMessage = ethers.utils.solidityKeccak256(
				["string", "string", "string", "uint96", "address", "uint256"],
				[nftName, nftSymbol, contractURI, BigNumber.from("500"), ZERO_ADDRESS, chainId]
			);
			const badSignature = await signer.signMessage(badMessage);
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

			const instanceAddress = await storage.getInstance(hash);
			expect(instanceAddress).to.not.be.equal(ZERO_ADDRESS);
			expect(instanceAddress).to.be.equal(await storage.instances(0));
			const instanceInfo = await storage.getInstanceInfo(0);
			expect(instanceInfo.name).to.be.equal(nftName);
			expect(instanceInfo.symbol).to.be.equal(nftSymbol);
			expect(instanceInfo.creator).to.be.equal(signer.address);

			console.log("instanceAddress = ", instanceAddress);

			const nft = await ethers.getContractAt("NFT", instanceAddress);
			const [storageContract, infoReturned, creator] = await nft.parameters();

			expect(storageContract).to.be.equal(storage.address);
			expect(infoReturned.payingToken).to.be.equal(info.payingToken);
			expect(infoReturned.mintPrice).to.be.equal(info.mintPrice);
			expect(infoReturned.contractURI).to.be.equal(info.contractURI);
			expect(creator).to.be.equal(signer.address);
		});
	});
});
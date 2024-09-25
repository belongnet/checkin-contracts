
import { ethers, upgrades } from 'hardhat';
import { loadFixture, } from '@nomicfoundation/hardhat-network-helpers';
import { ContractFactory } from "ethers";
import { Erc20Example, PricePointFactory } from "../typechain-types";
import { expect } from "chai";
import { PricePointInfoStruct } from '../typechain-types/contracts/price-point/PricePoint';
import EthCrypto from "eth-crypto";

describe('PricePointFactory', () => {
	const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
	const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
	const chainId = 31337;

	const name = "Name 1";
	const symbol = "S1";
	const contractURI = "contractURI/123";
	const price = ethers.utils.parseEther("0.003");

	async function fixture() {
		const [platform, user, bob, charlie] = await ethers.getSigners();
		const signer = EthCrypto.createIdentity();

		const Erc20Example: ContractFactory = await ethers.getContractFactory("Erc20Example");
		const erc20Example: Erc20Example = await Erc20Example.deploy() as Erc20Example;
		await erc20Example.deployed();

		const PricePointFactory: ContractFactory = await ethers.getContractFactory("PricePointFactory");
		const factory: PricePointFactory = await upgrades.deployProxy(PricePointFactory, [
			ETH_ADDRESS,
			signer.address,
			platform.address
		]) as PricePointFactory;
		await factory.deployed();

		return { factory, erc20Example, platform, user, bob, charlie, signer };
	}

	describe('Deployment', () => {
		it("should correct initialize", async () => {
			const { factory, platform, signer } = await loadFixture(fixture);

			expect(await factory.owner()).to.be.equal(platform.address);
			expect(await factory.defaultPaymentCurrency()).to.be.equal(ETH_ADDRESS);
			expect(await factory.signerAddress()).to.be.equal(signer.address);
			expect(await factory.platformAddress()).to.be.equal(platform.address);
		});

		it("can not be initialized again", async () => {
			const { factory, platform, signer } = await loadFixture(fixture);

			await expect(factory.initialize(
				ETH_ADDRESS,
				signer.address,
				platform.address,)).to.be.revertedWithCustomError(factory, 'InvalidInitialization')
		});
	});

	describe('Works properly', () => {
		it("Can set default currency", async () => {
			const { factory, erc20Example, user } = await loadFixture(fixture);

			await expect(factory.connect(user).setDefaultPaymentCurrency(user.address)).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount').withArgs(user.address);
			await expect(factory.setDefaultPaymentCurrency(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPasted');

			await factory.setDefaultPaymentCurrency(erc20Example.address);
			expect(await factory.defaultPaymentCurrency()).to.be.equal(erc20Example.address);
		});

		it("Can set platform address", async () => {
			const { factory, erc20Example, user } = await loadFixture(fixture);

			await expect(factory.connect(user).setPlatformAddress(user.address)).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount').withArgs(user.address);
			await expect(factory.setPlatformAddress(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPasted');

			await factory.setPlatformAddress(erc20Example.address);
			expect(await factory.platformAddress()).to.be.equal(erc20Example.address);
		});

		it("Can set signer", async () => {
			const { factory, erc20Example, user } = await loadFixture(fixture);

			await expect(factory.connect(user).setSigner(user.address)).to.be.revertedWithCustomError(factory, 'OwnableUnauthorizedAccount').withArgs(user.address);
			await expect(factory.setSigner(ZERO_ADDRESS)).to.be.revertedWithCustomError(factory, 'ZeroAddressPasted');

			await factory.setSigner(erc20Example.address);
			expect(await factory.signerAddress()).to.be.equal(erc20Example.address);
		});


		it("should correct deploy NFT instance", async () => {
			const { factory, platform, user, bob, signer } = await loadFixture(fixture);

			let message = EthCrypto.hash.keccak256([
				{ type: "address", value: user.address },
				{ type: "string", value: name },
				{ type: "string", value: symbol },
				{ type: "string", value: contractURI },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			let info: PricePointInfoStruct = {
				user: user.address,
				name,
				symbol,
				contractURI,
				paymentCurrency: ETH_ADDRESS,
				transferable: false,
				signature: signature
			};

			const fakeInfo = info;

			await factory.connect(user).produce(info);

			let hash = ethers.utils.solidityKeccak256(
				['address', 'string', 'string'],
				[user.address, name, symbol]
			);
			await expect(factory.connect(user).produce(info)).to.be.revertedWithCustomError(factory, 'PricePointAlreadyExists').withArgs(hash);

			let pricePointAddress = await factory.pricePointsByHash(hash);
			expect(pricePointAddress).to.not.be.equal(ZERO_ADDRESS);
			expect(pricePointAddress).to.be.equal(await factory.pricePoints(0));

			let pricePoint = await ethers.getContractAt("PricePoint", pricePointAddress);

			expect(await pricePoint.factory()).to.be.equal(factory.address);
			expect(await pricePoint.owner()).to.be.equal(platform.address);
			expect(await pricePoint.paymentCurrency()).to.be.equal(ETH_ADDRESS);
			expect(await pricePoint.name()).to.be.equal(name);
			expect(await pricePoint.symbol()).to.be.equal(symbol);
			expect(await pricePoint.user()).to.be.equal(user.address);
			expect(await pricePoint.contractURI()).to.be.equal(contractURI);
			expect(await pricePoint.transferable()).to.be.equal(false);
			expect(await pricePoint.signature()).to.be.equal(signature);
			expect(await pricePoint.platform()).to.be.equal(platform.address);

			fakeInfo.name = '';
			await expect(factory.connect(user).produce(fakeInfo)).to.be.revertedWithCustomError(factory, 'EmptyNamePasted');
			fakeInfo.name = name;
			fakeInfo.symbol = '';
			await expect(factory.connect(user).produce(fakeInfo)).to.be.revertedWithCustomError(factory, 'EmptySymbolPasted');
			fakeInfo.symbol = name;
			await expect(factory.connect(user).produce(fakeInfo)).to.be.revertedWithCustomError(factory, 'InvalidSignature');

			message = EthCrypto.hash.keccak256([
				{ type: "address", value: bob.address },
				{ type: "string", value: name },
				{ type: "string", value: symbol },
				{ type: "string", value: contractURI },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);

			info = {
				user: bob.address,
				name,
				symbol,
				contractURI,
				paymentCurrency: ZERO_ADDRESS,
				transferable: false,
				signature: signature
			};

			await factory.connect(bob).produce(info);
			hash = ethers.utils.solidityKeccak256(
				['address', 'string', 'string'],
				[bob.address, name, symbol]
			);
			pricePointAddress = await factory.pricePointsByHash(hash);
			pricePoint = await ethers.getContractAt("PricePoint", pricePointAddress);

			expect(await pricePoint.paymentCurrency()).to.be.equal(ETH_ADDRESS);
		});
	});
}); 
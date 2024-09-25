
import { ethers, upgrades, } from 'hardhat';
import { loadFixture, } from '@nomicfoundation/hardhat-network-helpers';
import { ContractFactory } from "ethers";
import { Erc20Example, PricePoint, PricePointFactory, } from "../typechain-types";
import { expect, use } from "chai";
import { PricePointInfoStruct, PricePointParametersStruct } from '../typechain-types/contracts/price-point/PricePoint';
import EthCrypto from "eth-crypto";

describe('PricePoint', () => {
	const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
	const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
	const chainId = 31337;

	const name = 'ERC721PricePoint';
	const symbol = 'PPNT';
	const contractURI = 'uri/uri/uri';
	const price = ethers.utils.parseEther('0.003');


	async function fixture() {
		const [platform, user, bob] = await ethers.getSigners();
		const signer = EthCrypto.createIdentity();

		const Erc20Example: ContractFactory = await ethers.getContractFactory("Erc20Example");
		const erc20Example: Erc20Example = await Erc20Example.deploy() as Erc20Example;
		await erc20Example.deployed();

		const PricePointFactory: ContractFactory = await ethers.getContractFactory("PricePointFactory") as ContractFactory;
		const factory: PricePointFactory = await upgrades.deployProxy(PricePointFactory, [
			ETH_ADDRESS,
			signer.address,
			platform.address
		]) as PricePointFactory;
		await factory.deployed();

		const PricePoint: ContractFactory = await ethers.getContractFactory("PricePoint") as ContractFactory;

		const message = EthCrypto.hash.keccak256([
			{ type: "address", value: user.address },
			{ type: "string", value: name },
			{ type: "string", value: symbol },
			{ type: "string", value: contractURI },
			{ type: "uint256", value: chainId },
		]);

		const signature = EthCrypto.sign(signer.privateKey, message);

		const params_eth: PricePointParametersStruct = {
			info: {
				user: user.address,
				name,
				symbol,
				contractURI,
				paymentCurrency: ETH_ADDRESS,
				transferable: false,
				signature,
			} as PricePointInfoStruct,
			platform: platform.address
		}

		const params_erc20: PricePointParametersStruct = {
			info: {
				user: user.address,
				name,
				symbol,
				contractURI,
				paymentCurrency: erc20Example.address,
				transferable: false,
				signature,
			} as PricePointInfoStruct,
			platform: platform.address
		}
		const nft_eth: PricePoint = await PricePoint.deploy(params_eth, factory.address) as PricePoint;
		await nft_eth.deployed();
		const nft_erc20: PricePoint = await PricePoint.deploy(params_erc20, factory.address) as PricePoint;
		await nft_erc20.deployed();

		return { nft_eth, nft_erc20, erc20Example, platform, factory, signature, user, bob, signer };
	}

	describe('Deployment', () => {
		it("should correctly deployed", async () => {
			const { nft_eth, nft_erc20, erc20Example, factory, platform, signature, user } = await loadFixture(fixture);

			expect(await nft_eth.factory()).to.be.equal(factory.address);
			expect(await nft_eth.owner()).to.be.equal(platform.address);
			expect(await nft_eth.paymentCurrency()).to.be.equal(ETH_ADDRESS);
			expect(await nft_eth.name()).to.be.equal(name);
			expect(await nft_eth.symbol()).to.be.equal(symbol);
			expect(await nft_eth.user()).to.be.equal(user.address);
			expect(await nft_eth.contractURI()).to.be.equal(contractURI);
			expect(await nft_eth.transferable()).to.be.equal(false);
			expect(await nft_eth.signature()).to.be.equal(signature);
			expect(await nft_eth.platform()).to.be.equal(platform.address);

			expect(await nft_erc20.paymentCurrency()).to.be.equal(erc20Example.address);
		});
	});

	describe('Project works properly', () => {
		it("should change payment currency", async () => {
			const { nft_eth, erc20Example, user, } = await loadFixture(fixture);

			await expect(nft_eth.connect(user).setPaymentCurrency(user.address)).to.be.revertedWithCustomError(nft_eth, 'Unauthorized');
			await expect(nft_eth.setPaymentCurrency(ZERO_ADDRESS)).to.be.revertedWithCustomError(nft_eth, 'ZeroAddressPasted');

			const tx = await nft_eth.setPaymentCurrency(erc20Example.address);

			await expect(tx).to.emit(nft_eth, 'PaymentCurrencyChanged').withArgs(erc20Example.address);
			expect(await nft_eth.paymentCurrency()).to.eq(erc20Example.address);
		});

		it("should set factory", async () => {
			const { nft_eth, erc20Example, user } = await loadFixture(fixture);

			await expect(nft_eth.connect(user).setFactory(user.address)).to.be.revertedWithCustomError(nft_eth, 'Unauthorized');
			await expect(nft_eth.setFactory(ZERO_ADDRESS)).to.be.revertedWithCustomError(nft_eth, 'ZeroAddressPasted');

			const tx = await nft_eth.setFactory(erc20Example.address);

			await expect(tx).to.emit(nft_eth, 'PricePointFactoryChanged').withArgs(erc20Example.address);
			expect(await nft_eth.factory()).to.eq(erc20Example.address);
		});

		it("should set transferable", async () => {
			const { nft_eth, erc20Example, user } = await loadFixture(fixture);

			await expect(nft_eth.connect(user).setTransferable(true)).to.be.revertedWithCustomError(nft_eth, 'Unauthorized');

			const tx = await nft_eth.setTransferable(true);

			await expect(tx).to.emit(nft_eth, 'TransferableChanged').withArgs(true);
		});

		it("should correctly mint NFT with ETH payment", async () => {
			const { nft_eth, user, signer, platform } = await loadFixture(fixture);

			const paymentId = 0;
			const tokenUri = 'dawdawdaw';

			let message = EthCrypto.hash.keccak256([
				{ type: "address", value: platform.address },
				{ type: "uint256", value: paymentId },
				{ type: "string", value: tokenUri },
				{ type: "uint256", value: price },
				{ type: "uint256", value: chainId },
			]);
			let signature = EthCrypto.sign(signer.privateKey, message);

			await expect(nft_eth.connect(user).pay(platform.address, paymentId, tokenUri, price, signature, { value: price })).to.be.revertedWithCustomError(nft_eth, 'CanBePaidOnlyByUser').withArgs(user.address);

			message = EthCrypto.hash.keccak256([
				{ type: "address", value: user.address },
				{ type: "uint256", value: paymentId },
				{ type: "string", value: tokenUri },
				{ type: "uint256", value: price },
				{ type: "uint256", value: chainId },
			]);
			signature = EthCrypto.sign(signer.privateKey, message);

			await expect(nft_eth.connect(user).pay(platform.address, paymentId, tokenUri, price, signature, { value: price })).to.be.revertedWithCustomError(nft_eth, 'InvalidSignature');

			const tx = await nft_eth.connect(user).pay(user.address, paymentId, tokenUri, price, signature, { value: price });

			await expect(tx).to.emit(nft_eth, 'Paid').withArgs(paymentId, user.address, ETH_ADDRESS, price);
			await expect(tx).to.changeEtherBalances([user, platform], [-price, price])

			const tokenId = 0;
			expect(await nft_eth.balanceOf(user.address)).eq(1);
			expect(await nft_eth.ownerOf(tokenId)).eq(user.address);
			expect(await nft_eth.getReceipt(tokenId)).eq(price);
			expect(await nft_eth.tokenURI(tokenId)).eq(tokenUri);

			await expect(nft_eth.connect(user).transferFrom(user.address, platform.address, paymentId,)).to.be.revertedWithCustomError(nft_eth, 'NotTransferable');
			await nft_eth.setTransferable(true);
			await nft_eth.connect(user).transferFrom(user.address, platform.address, paymentId);
			expect(await nft_eth.balanceOf(user.address)).eq(0);
			expect(await nft_eth.balanceOf(platform.address)).eq(1);
		});

		it("should correctly mint NFT with ERC20 payment", async () => {
			const { nft_erc20, user, signer, platform, erc20Example } = await loadFixture(fixture);

			const paymentId = 0;
			const tokenUri = 'dawdawdaw';

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: user.address },
				{ type: "uint256", value: paymentId },
				{ type: "string", value: tokenUri },
				{ type: "uint256", value: price },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await erc20Example.transfer(user.address, price);
			await erc20Example.connect(user).approve(nft_erc20.address, price);

			const aliceBalanceBefore = await erc20Example.balanceOf(user.address);
			const owner_balance_before = await erc20Example.balanceOf(platform.address);

			const tx = await nft_erc20.connect(user).pay(user.address, paymentId, tokenUri, price, signature,);

			const aliceBalanceAfter = await erc20Example.balanceOf(user.address);
			const owner_balance_after = await erc20Example.balanceOf(platform.address);

			const tokenId = 0;

			await expect(tx).to.emit(nft_erc20, 'Paid').withArgs(paymentId, user.address, erc20Example.address, price);
			expect(aliceBalanceBefore.sub(price)).eq(aliceBalanceAfter);
			expect(owner_balance_before.add(price)).eq(owner_balance_after);
			expect(await nft_erc20.balanceOf(user.address)).eq(1);
			expect(await nft_erc20.ownerOf(tokenId)).eq(user.address);
			expect(await nft_erc20.getReceipt(tokenId)).eq(price);
			expect(await nft_erc20.tokenURI(tokenId)).eq(tokenUri);
		});
	});
}); 
import { ethers, upgrades } from 'hardhat';
import { loadFixture, } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, ContractFactory } from "ethers";
import { Erc20Example, MockTransferValidator, NFTFactory, StorageContract } from "../typechain-types";
import { expect } from "chai";
import { InstanceInfoStruct, NFT, NftParametersStruct } from "../typechain-types/contracts/nft-with-royalties/NFT";
import EthCrypto from "eth-crypto";
import { NftFactoryInfoStruct } from '../typechain-types/contracts/nft-with-royalties/factories/NFTFactory';

describe('NFT', () => {
	const PLATFORM_COMISSION = "100";
	const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
	const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
	const chainId = 31337;

	const nftName = "InstanceName";
	const nftSymbol = "INNME";
	const contractURI = "ipfs://tbd";
	const eth_price = ethers.utils.parseEther("0.03");
	const token_price = 100;

	let instanceInfoETH: InstanceInfoStruct, instanceInfoToken: InstanceInfoStruct, nftInfo: NftFactoryInfoStruct;

	async function fixture() {
		const [owner, alice, bob, charlie] = await ethers.getSigners();
		const signer = EthCrypto.createIdentity();

		const Validator: ContractFactory = await ethers.getContractFactory("MockTransferValidator");
		const validator: MockTransferValidator = await Validator.deploy(true) as MockTransferValidator;
		await validator.deployed();

		const Erc20Example: ContractFactory = await ethers.getContractFactory("Erc20Example");
		const erc20Example: Erc20Example = await Erc20Example.deploy() as Erc20Example;
		await erc20Example.deployed();

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

		const message = EthCrypto.hash.keccak256([
			{ type: "string", value: nftName },
			{ type: "string", value: nftSymbol },
			{ type: "string", value: contractURI },
			{ type: "uint96", value: 600 },
			{ type: "address", value: owner.address },
			{ type: "uint256", value: chainId },
		]);

		const signature = EthCrypto.sign(signer.privateKey, message);

		instanceInfoETH = {
			name: nftName,
			symbol: nftSymbol,
			contractURI,
			payingToken: ETH_ADDRESS,
			mintPrice: eth_price,
			whitelistMintPrice: eth_price,
			transferable: true,
			maxTotalSupply: 10,
			feeNumerator: BigNumber.from("600"),
			feeReceiver: owner.address,
			collectionExpire: BigNumber.from("86400"),
			signature,
		};

		instanceInfoToken = {
			name: nftName,
			symbol: nftSymbol,
			contractURI,
			payingToken: erc20Example.address,
			mintPrice: token_price,
			whitelistMintPrice: token_price,
			transferable: true,
			maxTotalSupply: 10,
			feeNumerator: BigNumber.from("600"),
			feeReceiver: owner.address,
			collectionExpire: BigNumber.from("86400"),
			signature,
		};

		const Nft = await ethers.getContractFactory("NFT");
		const nft_eth: NFT = await Nft.deploy(
			{ factory: factory.address, info: instanceInfoETH, creator: alice.address, platform: alice.address } as NftParametersStruct,
			validator.address
		);
		await nft_eth.deployed();


		const nft_erc20: NFT = await Nft.deploy(
			{ factory: factory.address, info: instanceInfoToken, creator: alice.address, platform: alice.address } as NftParametersStruct,
			validator.address
		);
		await nft_erc20.deployed();

		return { factory, nft_eth, nft_erc20, Nft, validator, erc20Example, owner, alice, bob, charlie, signer };
	}

	describe('Deployment', () => {
		it("Should be deployed correctly", async () => {
			const { factory, nft_eth, nft_erc20, alice } = await loadFixture(fixture);

			let [, info] = await nft_eth.parameters();
			expect(info.name).to.be.equal(instanceInfoETH.name);
			expect(info.symbol).to.be.equal(instanceInfoETH.symbol);
			expect(info.contractURI).to.be.equal(instanceInfoETH.contractURI);
			expect(info.payingToken).to.be.equal(instanceInfoETH.payingToken);
			expect(info.mintPrice).to.be.equal(instanceInfoETH.mintPrice);
			expect(info.whitelistMintPrice).to.be.equal(instanceInfoETH.whitelistMintPrice);
			expect(info.transferable).to.be.equal(instanceInfoETH.transferable);

			expect(await nft_eth.factory()).to.be.equal(factory.address);
			expect(await nft_eth.name()).to.be.equal(instanceInfoETH.name);
			expect(await nft_eth.symbol()).to.be.equal(instanceInfoETH.symbol);
			expect(await nft_eth.payingToken()).to.be.equal(instanceInfoETH.payingToken);
			expect(await nft_eth.mintPrice()).to.be.equal(instanceInfoETH.mintPrice);
			expect(await nft_eth.whitelistMintPrice()).to.be.equal(instanceInfoETH.whitelistMintPrice);
			expect(await nft_eth.transferable()).to.be.equal(instanceInfoETH.transferable);
			expect(await nft_eth.maxTotalSupply()).to.be.equal(instanceInfoETH.maxTotalSupply);
			expect(await nft_eth.totalRoyalty()).to.be.equal(instanceInfoETH.feeNumerator);
			expect(await nft_eth.creator()).to.be.equal(alice.address);
			expect(await nft_eth.collectionExpire()).to.be.equal(instanceInfoETH.collectionExpire);
			expect(await nft_eth.contractURI()).to.be.equal(instanceInfoETH.contractURI);

			[, info] = await nft_erc20.parameters();
			expect(info.maxTotalSupply).to.be.equal(instanceInfoToken.maxTotalSupply);
			expect(info.feeNumerator).to.be.equal(instanceInfoToken.feeNumerator);
			expect(info.feeReceiver).to.be.equal(instanceInfoToken.feeReceiver);
			expect(info.collectionExpire).to.be.equal(instanceInfoToken.collectionExpire);
			expect(info.signature).to.be.equal(instanceInfoToken.signature);
			expect(info.payingToken).to.be.equal(instanceInfoToken.payingToken);

			const interfaceIdIERC2981 = "0x2a55205a"; // IERC2981 interface ID
			const interfaceIdIERC4906 = "0x49064906"; // ERC4906 interface ID
			const interfaceIdICreatorToken = "0xad0d7f6c"; // ICreatorToken interface ID
			const interfaceIdILegacyCreatorToken = "0xa07d229a"; // ILegacyCreatorToken interface ID

			expect(await nft_eth.supportsInterface(interfaceIdIERC2981)).to.be.true;
			expect(await nft_eth.supportsInterface(interfaceIdIERC4906)).to.be.true;
			expect(await nft_eth.supportsInterface(interfaceIdICreatorToken)).to.be.true;
			expect(await nft_eth.supportsInterface(interfaceIdILegacyCreatorToken)).to.be.true;

			const [functionSignature, isViewFunction] = await nft_eth.getTransferValidationFunction();

			expect(isViewFunction).to.be.true;
			expect(functionSignature).to.eq('0xcaee23ea');
		});
	});

	describe('Functions from BaseERC721', () => {
		it("Should set transfer validator correctly", async () => {
			const { nft_eth, owner, alice, validator, } = await loadFixture(fixture);

			const nft_eth_alice = nft_eth.connect(alice);

			await expect(nft_eth_alice.setTransferValidator(validator.address)).to.be.revertedWithCustomError(nft_eth_alice, 'SetTransferValidatorError');

			const tx = await nft_eth_alice.setTransferValidator(owner.address);
			await expect(tx).to.emit(nft_eth_alice, 'TransferValidatorUpdated').withArgs(validator.address, owner.address);
			expect(await nft_eth_alice.getTransferValidator()).to.eq(owner.address);

			const tx2 = await nft_eth_alice.setAutomaticApprovalOfTransfersFromValidator(true);
			await expect(tx2).to.emit(nft_eth_alice, 'AutomaticApprovalOfTransferValidatorSet').withArgs(true);
			expect(await nft_eth_alice.autoApproveTransfersFromValidator()).to.be.true;
		});

		it("Should work with transfer validator zero address", async () => {
			const { nft_eth, alice, validator, } = await loadFixture(fixture);

			const nft_eth_alice = nft_eth.connect(alice);

			const tx = await nft_eth_alice.setTransferValidator(ZERO_ADDRESS);
			await expect(tx).to.emit(nft_eth_alice, 'TransferValidatorUpdated').withArgs(validator.address, ZERO_ADDRESS);
			expect(await nft_eth_alice.getTransferValidator()).to.eq(ZERO_ADDRESS);

		});

		it("Should set correctly isApprovedForAll with validator", async () => {
			const { nft_eth, alice, owner } = await loadFixture(fixture);

			const nft_eth_alice = nft_eth.connect(alice);

			await nft_eth_alice.setAutomaticApprovalOfTransfersFromValidator(true);
			await nft_eth_alice.setTransferValidator(owner.address);

			await nft_eth_alice.setApprovalForAll(owner.address, false);

			expect(await nft_eth_alice.isApprovedForAll(alice.address, owner.address)).to.be.true;
			expect(await nft_eth_alice.isApprovedForAll(owner.address, alice.address)).to.be.false;

			await nft_eth_alice.setAutomaticApprovalOfTransfersFromValidator(false);
			expect(await nft_eth_alice.isApprovedForAll(alice.address, owner.address)).to.be.false;

			await nft_eth_alice.setApprovalForAll(owner.address, true);

			expect(await nft_eth_alice.isApprovedForAll(alice.address, owner.address)).to.be.true;
		});
	});

	describe('Errors', () => {
		it("only owner", async () => {
			const { nft_eth, owner, alice, } = await loadFixture(fixture);

			await expect(nft_eth.connect(owner).setTransferValidator(alice.address)).to.be.revertedWithCustomError(nft_eth, 'Unauthorized');
			await expect(nft_eth.connect(owner).setAutomaticApprovalOfTransfersFromValidator(false)).to.be.revertedWithCustomError(nft_eth, 'Unauthorized');
		});
	});

	describe('Mint', () => {
		it("Should mint correctly static prices", async () => {
			const { nft_eth, owner, alice, signer } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			let message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			await expect(
				nft_eth
					.connect(alice)['mint(address,uint256,string,bool,bytes,uint256,address)']
					(
						alice.address,
						0,
						NFT_721_BASE_URI,
						false,
						signature,
						ethers.utils.parseEther("0.02"),
						ETH_ADDRESS,
						{
							value: ethers.utils.parseEther("0.02"),
						}
					)
			).to.be.revertedWithCustomError(nft_eth, `PriceChanged`).withArgs(ethers.utils.parseEther("0.02"), eth_price);

			await expect(
				nft_eth
					.connect(alice)
				['mint(address,uint256,string,bool,bytes,uint256,address)'](
					alice.address,
					0,
					NFT_721_BASE_URI,
					false,
					signature,
					ethers.utils.parseEther("0.03"),
					alice.address,
					{
						value: ethers.utils.parseEther("0.03"),
					}
				)
			).to.be.revertedWithCustomError(nft_eth, `TokenChanged`).withArgs(alice.address, ETH_ADDRESS);

			await expect(
				nft_eth
					.connect(alice)
				['mint(address,uint256,string,bool,bytes,uint256,address)'](
					alice.address,
					0,
					NFT_721_BASE_URI,
					false,
					signature,
					ethers.utils.parseEther("0.03"),
					ETH_ADDRESS,
					{
						value: ethers.utils.parseEther("0.02"),
					}
				)
			).to.be.revertedWithCustomError(nft_eth, `NotEnoughETHSent`).withArgs(ethers.utils.parseEther("0.02"));


			await nft_eth
				.connect(alice)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				alice.address,
				0,
				NFT_721_BASE_URI,
				false,
				signature,
				ethers.utils.parseEther("0.03"),
				ETH_ADDRESS,
				{
					value: ethers.utils.parseEther("0.03"),
				}
			);

			const salePrice = 1000;
			const feeNumerator = 600;
			const feeDenominator = 10000;
			const expectedResult = (salePrice * feeNumerator) / feeDenominator;

			const [receiver, realResult] = await nft_eth.royaltyInfo(0, salePrice);
			expect(expectedResult).to.be.equal(realResult);
			expect(receiver).to.be.equal(owner.address);
			expect(await nft_eth.getReceipt(0)).eq(ethers.utils.parseEther("0.03"));

			for (let i = 1; i <= 10; i++) {
				const message = EthCrypto.hash.keccak256([
					{ type: "address", value: alice.address },
					{ type: "uint256", value: i },
					{ type: "string", value: NFT_721_BASE_URI },
					{ type: "bool", value: false },
					{ type: "uint256", value: chainId },
				]);

				const signature = EthCrypto.sign(signer.privateKey, message);
				await nft_eth
					.connect(alice)
				['mint(address,uint256,string,bool,bytes,uint256,address)'](
					alice.address,
					i,
					NFT_721_BASE_URI,
					false,
					signature,
					ethers.utils.parseEther("0.03"),
					ETH_ADDRESS,
					{
						value: ethers.utils.parseEther("0.03"),
					}
				);
			}

			message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 11 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);


			await expect(
				nft_eth
					.connect(alice)
				['mint(address,uint256,string,bool,bytes,uint256,address)'](
					alice.address,
					11,
					NFT_721_BASE_URI,
					false,
					signature,
					ethers.utils.parseEther("0.03"),
					ETH_ADDRESS,
					{
						value: ethers.utils.parseEther("0.03"),
					}
				)
			).to.be.revertedWithCustomError(nft_eth, "TotalSupplyLimitReached");
		});

		it("Should mint correctly dynamic prices", async () => {
			const { nft_eth, owner, alice, signer } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			let message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "uint256", value: ethers.utils.parseEther("0.02") },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			await expect(nft_eth
				.connect(alice)['mint(address,uint256,string,bytes,uint256,address)']
				(
					alice.address,
					0,
					NFT_721_BASE_URI,
					signature,
					ethers.utils.parseEther("0.01"),
					ETH_ADDRESS,
					{
						value: ethers.utils.parseEther("0.01"),
					}
				)).to.be.revertedWithCustomError(nft_eth, 'InvalidSignature');

			await
				nft_eth
					.connect(alice)['mint(address,uint256,string,bytes,uint256,address)']
					(
						alice.address,
						0,
						NFT_721_BASE_URI,
						signature,
						ethers.utils.parseEther("0.02"),
						ETH_ADDRESS,
						{
							value: ethers.utils.parseEther("0.02"),
						}
					);
		});

		it("Should correct set new values", async () => {
			const { nft_eth, owner, alice, bob } = await loadFixture(fixture);

			const newPrice = ethers.utils.parseEther("1");
			const newWLPrice = ethers.utils.parseEther("0.1");
			const newPayingToken = bob.address;

			await expect(
				nft_eth.connect(owner).setPayingToken(newPayingToken, newPrice, newWLPrice)
			).to.be.revertedWithCustomError(nft_eth, "Unauthorized");

			await expect(
				nft_eth.connect(alice).setPayingToken(ZERO_ADDRESS, newPrice, newWLPrice)
			).to.be.revertedWithCustomError(nft_eth, "ZeroAddressPasted");

			await nft_eth
				.connect(alice)
				.setPayingToken(newPayingToken, newPrice, newWLPrice);

			const [, info] = await nft_eth.parameters();

			expect(info.payingToken).to.be.equal(newPayingToken);
			expect(info.mintPrice).to.be.equal(newPrice);
			expect(info.whitelistMintPrice).to.be.equal(newWLPrice);
		});

		it("Should mint correctly with erc20 token", async () => {
			const { nft_erc20, alice, erc20Example, signer } = await loadFixture(fixture);
			const NFT_721_BASE_URI = "test.com/";


			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, 10000);
			// allow spender(our nft contract) to get our tokens
			await erc20Example
				.connect(alice)
				.approve(nft_erc20.address, ethers.constants.MaxUint256);

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await nft_erc20
				.connect(alice)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				alice.address,
				0,
				NFT_721_BASE_URI,
				false,
				signature,
				100,
				erc20Example.address
			);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);
		});

		it("Should mint correctly with erc20 token without fee", async () => {
			const { factory, nft_erc20, alice, erc20Example, signer, owner } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformCommission(0);

			const NFT_721_BASE_URI = "test.com/";

			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, 10000);
			// allow spender(our nft contract) to get our tokens
			await erc20Example.connect(alice).approve(nft_erc20.address, 99999999999999);

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await nft_erc20
				.connect(alice)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				alice.address,
				0,
				NFT_721_BASE_URI,
				false,
				signature,
				100,
				erc20Example.address
			);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);
			expect(await erc20Example.balanceOf(alice.address)).to.be.deep.equal(
				10000
			);
		});

		it("Should transfer if transferrable", async () => {
			const { factory, nft_erc20, alice, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformCommission(0);

			const NFT_721_BASE_URI = "test.com/";

			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, 10000);
			// allow spender(our nft contract) to get our tokens
			await erc20Example.connect(alice).approve(nft_erc20.address, 99999999999999);

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await nft_erc20
				.connect(alice)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				alice.address,
				0,
				NFT_721_BASE_URI,
				false,
				signature,
				100,
				erc20Example.address
			);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);

			await nft_erc20.connect(alice).transferFrom(alice.address, bob.address, 0);
			expect(await nft_erc20.balanceOf(bob.address)).to.be.deep.equal(1);
		});

		it("Should transfer if transferrable", async () => {
			const { factory, nft_erc20, alice, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformCommission(0);

			const NFT_721_BASE_URI = "test.com/";

			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, 10000);
			// allow spender(our nft contract) to get our tokens
			await erc20Example.connect(alice).approve(nft_erc20.address, 99999999999999);

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await nft_erc20
				.connect(alice)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				alice.address,
				0,
				NFT_721_BASE_URI,
				false,
				signature,
				100,
				erc20Example.address
			);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);

			await nft_erc20.connect(alice).setTransferValidator(ZERO_ADDRESS);
			await nft_erc20.connect(alice).transferFrom(alice.address, bob.address, 0);
			expect(await nft_erc20.balanceOf(bob.address)).to.be.deep.equal(1);

			const message2 = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 1 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature2 = EthCrypto.sign(signer.privateKey, message2);

			await nft_erc20
				.connect(alice)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				alice.address,
				1,
				NFT_721_BASE_URI,
				false,
				signature2,
				100,
				erc20Example.address
			);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);

			await nft_erc20.connect(alice).setTransferValidator(alice.address);
			await nft_erc20.connect(alice).transferFrom(alice.address, bob.address, 1);
		});

		it("Shouldn't transfer if not transferrable", async () => {
			const { factory, validator, Nft, alice, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformCommission(0);

			const NFT_721_BASE_URI = "test.com/";

			const nft = await Nft.deploy(
				{
					factory: factory.address,
					info: {
						name: "InstanceName",
						symbol: "INNME",
						contractURI: "ipfs://tbd",
						payingToken: erc20Example.address,
						mintPrice: 100,
						whitelistMintPrice: 100,
						transferable: false,
						maxTotalSupply: BigNumber.from("1000"),
						feeNumerator: BigNumber.from("600"),
						feeReceiver: owner.address,
						collectionExpire: BigNumber.from("86400"),
						signature: "0x00",
					} as InstanceInfoStruct,
					creator: alice.address,
					platform: alice.address
				} as NftParametersStruct,
				validator.address
			);
			await nft.deployed();

			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, 10000);
			// allow spender(our nft contract) to get our tokens
			await erc20Example.connect(alice).approve(nft.address, 99999999999999);

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await nft
				.connect(alice)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				alice.address,
				0,
				NFT_721_BASE_URI,
				false,
				signature,
				100,
				erc20Example.address
			);
			expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);

			await expect(
				nft.connect(alice).transferFrom(alice.address, bob.address, 0)
			).to.be.revertedWithCustomError(nft, "NotTransferable");
		});

		it("Should mint correctly with erc20 token if user in the WL", async () => {
			const { validator, alice, erc20Example, factory, signer, owner, bob } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";
			const Nft = await ethers.getContractFactory("NFT");
			const nft = await Nft.deploy(
				{
					factory: factory.address,
					info: {
						name: "InstanceName",
						symbol: "INNME",
						contractURI: "ipfs://tbd",
						payingToken: erc20Example.address,
						mintPrice: ethers.utils.parseEther("100"),
						whitelistMintPrice: ethers.utils.parseEther("50"),
						transferable: true,
						maxTotalSupply: BigNumber.from("1000"),
						feeNumerator: BigNumber.from("600"),
						feeReceiver: owner.address,
						collectionExpire: BigNumber.from("86400"),
						signature: "0x00",
					} as InstanceInfoStruct,
					creator: bob.address,
					platform: bob.address
				} as NftParametersStruct,
				validator.address
			);
			await nft.deployed();

			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, ethers.utils.parseEther("100"));
			// allow spender(our nft contract) to get our tokens
			await erc20Example
				.connect(alice)
				.approve(nft.address, ethers.utils.parseEther("999999"));

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: true },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);
			const aliceBalanceBefore = await erc20Example.balanceOf(alice.address);
			const bobBalanceBefore = await erc20Example.balanceOf(bob.address);
			await nft
				.connect(alice)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				alice.address,
				0,
				NFT_721_BASE_URI,
				true,
				signature,
				ethers.utils.parseEther("50"),
				erc20Example.address
			);
			const aliceBalanceAfter = await erc20Example.balanceOf(alice.address);
			const bobBalanceAfter = await erc20Example.balanceOf(bob.address);

			expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);

			expect(aliceBalanceBefore.sub(aliceBalanceAfter)).to.be.equal(
				ethers.utils.parseEther("50")
			);
			expect(bobBalanceAfter.sub(bobBalanceBefore)).to.be.equal(
				ethers.utils
					.parseEther("50")
					.mul(BigNumber.from("9900"))
					.div(BigNumber.from("10000"))
			);
		});

		it("Should fail with wrong signer", async () => {
			const { alice, nft_eth } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			const bad_message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 1 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);
			const bad_signature = alice.signMessage(bad_message);

			await expect(
				nft_eth.connect(alice)['mint(address,uint256,string,bool,bytes,uint256,address)'](
					alice.address,
					1,
					NFT_721_BASE_URI,
					false,
					bad_signature,
					ethers.utils.parseEther("0.03"),
					ETH_ADDRESS,
					{ value: ethers.utils.parseEther("0.03"), }
				)
			).to.be.revertedWithCustomError(nft_eth, "InvalidSignature");
		});

		it("Should fail with wrong mint price", async () => {
			const { alice, nft_eth, signer } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await expect(
				nft_eth.connect(alice)['mint(address,uint256,string,bool,bytes,uint256,address)'](
					alice.address,
					0,
					NFT_721_BASE_URI,
					false,
					signature,
					ethers.utils.parseEther("0.02"),
					ETH_ADDRESS,
					{ value: ethers.utils.parseEther("0.02"), }
				)
			).to.be.revertedWithCustomError(nft_eth, "PriceChanged").withArgs(ethers.utils.parseEther("0.02"), eth_price);

			await expect(
				nft_eth.connect(alice)['mint(address,uint256,string,bool,bytes,uint256,address)'](
					alice.address,
					0,
					NFT_721_BASE_URI,
					false,
					signature,
					ethers.utils.parseEther("0.02"),
					ETH_ADDRESS,
				)
			).to.be.revertedWithCustomError(nft_eth, "PriceChanged").withArgs(ethers.utils.parseEther("0.02"), eth_price);
		});

		it("Should fail with 0 acc balance erc20", async () => {
			const { alice, signer, nft_erc20, erc20Example } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			await erc20Example.connect(alice).approve(nft_erc20.address, 99999999999999);

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 1 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await expect(
				nft_erc20.connect(alice)['mint(address,uint256,string,bool,bytes,uint256,address)'](
					alice.address,
					1,
					NFT_721_BASE_URI,
					false,
					signature,
					token_price,
					erc20Example.address,
				)
			).to.be.reverted;
		});
	});

	describe("TokenURI test", async () => {
		it("Should return correct metadataUri after mint", async () => {
			const { alice, signer, nft_eth } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/1";

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await nft_eth
				.connect(alice)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				alice.address,
				0,
				NFT_721_BASE_URI,
				false,
				signature,
				ethers.utils.parseEther("0.03"),
				ETH_ADDRESS,
				{
					value: ethers.utils.parseEther("0.03"),
				}
			);
			expect(await nft_eth.tokenURI(0)).to.be.deep.equal(NFT_721_BASE_URI);
		});
	});

	describe("Withdraw test", async () => {
		it("Should withdraw all funds when contract has 0 comission", async () => {
			const { alice, nft_eth, signer, factory, owner } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformCommission(0);

			const NFT_721_BASE_URI = "test.com/";

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			let startBalance = await owner.getBalance();

			await nft_eth
				.connect(alice)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				alice.address,
				0,
				NFT_721_BASE_URI,
				false,
				signature,
				ethers.utils.parseEther("0.03"),
				ETH_ADDRESS,
				{
					value: ethers.utils.parseEther("0.03"),
				}
			);

			let endBalance = await owner.getBalance();
			expect(endBalance.sub(startBalance)).to.eq(0)
		});
		it("Should withdraw all funds without 10% (comission)", async () => {
			const { alice, nft_eth, signer, factory, owner, bob } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: bob.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			let startBalanceOwner = await owner.getBalance();
			let startBalanceAlice = await alice.getBalance();

			await nft_eth
				.connect(bob)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				bob.address,
				0,
				NFT_721_BASE_URI,
				false,
				signature,
				ethers.utils.parseEther("0.03"),
				ETH_ADDRESS,
				{
					value: ethers.utils.parseEther("0.03"),
				}
			);
			expect(await factory.platformAddress()).to.be.equal(owner.address);
			let endBalanceOwner = await owner.getBalance();
			let endBalanceAlice = await alice.getBalance();

			expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(
				ethers.utils.parseEther("0.03").div(BigNumber.from("100"))
			);
			expect(endBalanceAlice.sub(startBalanceAlice)).to.be.equal(
				ethers.utils
					.parseEther("0.03")
					.mul(BigNumber.from("99"))
					.div(BigNumber.from("100"))
			);
		});

		it("Should correct distribute royalties", async () => {
			const { alice, signer, nft_eth, erc20Example, factory, owner, bob } = await loadFixture(fixture);


			const RoyaltiesReceiver =
				await ethers.getContractFactory("RoyaltiesReceiver");
			const receiver = await RoyaltiesReceiver.deploy(
				[await factory.platformAddress(), alice.address],
				[1, 5]
			);
			await receiver.deployed();

			expect(await nft_eth.owner()).to.be.equal(alice.address);

			const NFT_721_BASE_URI = "test.com/";

			let message = EthCrypto.hash.keccak256([
				{ type: "address", value: bob.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			let startBalanceOwner = await owner.getBalance();
			let startBalanceAlice = await alice.getBalance();

			await nft_eth
				.connect(bob)
			['mint(address,uint256,string,bool,bytes,uint256,address)'](
				bob.address,
				0,
				NFT_721_BASE_URI,
				false,
				signature,
				ethers.utils.parseEther("0.03"),
				ETH_ADDRESS,
				{
					value: ethers.utils.parseEther("0.03"),
				}
			);

			let endBalanceOwner = await owner.getBalance();
			let endBalanceAlice = await alice.getBalance();

			expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(
				ethers.utils.parseEther("0.03").div(BigNumber.from("100"))
			);
			expect(endBalanceAlice.sub(startBalanceAlice)).to.be.equal(
				ethers.utils
					.parseEther("0.03")
					.mul(BigNumber.from("99"))
					.div(BigNumber.from("100"))
			);

			// NFT was sold for ETH

			let tx = {
				from: owner.address,
				to: receiver.address,
				value: ethers.utils.parseEther("1"),
				gasLimit: 1000000,
			};

			const platformAddress = await factory.platformAddress();

			await owner.sendTransaction(tx);

			let creatorBalanceBefore = await alice.getBalance();
			let platformBalanceBefore = await owner.getBalance();

			await receiver.connect(bob)["releaseAll()"]();

			expect(await receiver['totalReleased()']()).to.eq(BigNumber.from("999999999999999999"))
			expect(await receiver['released(address)'](owner.address)).to.eq(BigNumber.from("166666666666666666"))

			let creatorBalanceAfter = await alice.getBalance();
			let platformBalanceAfter = await owner.getBalance();

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
				ethers.utils
					.parseEther("1")
					.mul(BigNumber.from("5"))
					.div(BigNumber.from("6"))
			);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("1").div(BigNumber.from("6"))
			);

			// NFT was sold for ERC20

			creatorBalanceBefore = await erc20Example.balanceOf(alice.address);
			platformBalanceBefore = await erc20Example.balanceOf(platformAddress);

			await erc20Example
				.connect(owner).mint(receiver.address, ethers.utils.parseEther("1"));

			await receiver.connect(bob)["releaseAll(address)"](erc20Example.address);

			expect(await receiver['totalReleased(address)'](erc20Example.address)).to.eq(BigNumber.from("999999999999999999"))
			expect(await receiver['released(address,address)'](erc20Example.address, owner.address)).to.eq(BigNumber.from("166666666666666666"))

			creatorBalanceAfter = await erc20Example.balanceOf(alice.address);
			platformBalanceAfter = await erc20Example.balanceOf(platformAddress);

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
				ethers.utils
					.parseEther("1")
					.mul(BigNumber.from("5"))
					.div(BigNumber.from("6"))
			);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("1").div(BigNumber.from("6"))
			);
		});
	});
});
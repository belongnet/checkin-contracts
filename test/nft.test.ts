import { ethers, upgrades } from 'hardhat';
import { loadFixture, } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, ContractFactory } from "ethers";
import { WETHMock, MockTransferValidator, NFTFactory as NFTFactory, RoyaltiesReceiver } from "../typechain-types";
import { expect } from "chai";
import { InstanceInfoStruct, NFT, NftParametersStruct, DynamicPriceParametersV2Struct as DynamicPriceParametersStruct, StaticPriceParametersV2Struct as StaticPriceParametersStruct } from "../typechain-types/contracts/NFT";
import EthCrypto from "eth-crypto";
import { NftFactoryParametersStruct } from '../typechain-types/contracts/factories/NFTFactory';

describe('NFT', () => {
	const PLATFORM_COMISSION = "100";
	const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
	const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
	const chainId = 31337;

	const nftName = "InstanceName";
	const nftSymbol = "INNME";
	const contractURI = "ipfs://tbd";
	const eth_price = ethers.utils.parseEther("0.03");
	const token_price = 10000;

	let instanceInfoETH: InstanceInfoStruct, instanceInfoToken: InstanceInfoStruct, nftInfo: NftFactoryParametersStruct, referralPercentages: number[];

	async function fixture() {
		const [owner, alice, bob, charlie, pete] = await ethers.getSigners();
		const signer = EthCrypto.createIdentity();

		const Validator: ContractFactory = await ethers.getContractFactory("MockTransferValidator");
		const validator: MockTransferValidator = await Validator.deploy(true) as MockTransferValidator;
		await validator.deployed();

		const Erc20Example: ContractFactory = await ethers.getContractFactory("WETHMock");
		const erc20Example: WETHMock = await Erc20Example.deploy() as WETHMock;
		await erc20Example.deployed();

		nftInfo = {
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
			nftInfo,
			referralPercentages,
		]) as NFTFactory;
		await factory.deployed();

		const hashedCode = EthCrypto.hash.keccak256([
			{ type: "address", value: bob.address },
			{ type: "address", value: factory.address },
			{ type: "uint256", value: chainId },
		]);

		await factory.connect(bob).createReferralCode();

		const message = EthCrypto.hash.keccak256([
			{ type: "string", value: nftName },
			{ type: "string", value: nftSymbol },
			{ type: "string", value: contractURI },
			{ type: "uint96", value: 600 },
			{ type: "uint256", value: chainId },
		]);

		const signature = EthCrypto.sign(signer.privateKey, message);

		const message2 = EthCrypto.hash.keccak256([
			{ type: "string", value: nftName + "2" },
			{ type: "string", value: nftSymbol + "2" },
			{ type: "string", value: contractURI },
			{ type: "uint96", value: 600 },
			{ type: "uint256", value: chainId },
		]);

		const signature2 = EthCrypto.sign(signer.privateKey, message2);

		instanceInfoETH = {
			metadata: {
				name: nftName,
				symbol: nftSymbol,
			},
			contractURI,
			payingToken: ETH_ADDRESS,
			mintPrice: eth_price,
			whitelistMintPrice: eth_price,
			transferable: true,
			maxTotalSupply: 10,
			feeNumerator: BigNumber.from("600"),
			collectionExpire: BigNumber.from("86400"),
			signature,
		};

		instanceInfoToken = {
			metadata: {
				name: nftName + '2',
				symbol: nftSymbol + '2',
			},
			contractURI,
			payingToken: erc20Example.address,
			mintPrice: token_price,
			whitelistMintPrice: token_price,
			transferable: true,
			maxTotalSupply: 10,
			feeNumerator: BigNumber.from("600"),
			collectionExpire: BigNumber.from("86400"),
			signature: signature2,
		};

		await factory.connect(alice).produce(instanceInfoETH, hashedCode);
		await factory.connect(alice).produce(instanceInfoToken, hashedCode);

		const Nft = await ethers.getContractFactory("NFT");
		const RoyaltiesReceiver = await ethers.getContractFactory("RoyaltiesReceiver");

		const nft_eth: NFT = await ethers.getContractAt("NFT", (await factory.getNftInstanceInfo(
			ethers.utils.solidityKeccak256(
				['string', 'string'],
				[nftName, nftSymbol]
			))).nftAddress);

		const receiver_eth: RoyaltiesReceiver = await ethers.getContractAt("RoyaltiesReceiver", (await factory.getNftInstanceInfo(
			ethers.utils.solidityKeccak256(
				['string', 'string'],
				[nftName, nftSymbol]
			))).royaltiesReceiver);

		const nft_erc20: NFT = await ethers.getContractAt("NFT", (await factory.getNftInstanceInfo(
			ethers.utils.solidityKeccak256(
				['string', 'string'],
				[nftName + '2', nftSymbol + '2']
			))).nftAddress);

		const receiver_erc20: RoyaltiesReceiver = await ethers.getContractAt("RoyaltiesReceiver", (await factory.getNftInstanceInfo(
			ethers.utils.solidityKeccak256(
				['string', 'string'],
				[nftName + '2', nftSymbol + '2']
			))).royaltiesReceiver);

		return { factory, nft_eth, receiver_eth, nft_erc20, receiver_erc20, validator, erc20Example, owner, alice, bob, charlie, pete, signer, hashedCode, NFTFactory, Nft, RoyaltiesReceiver, };
	}

	describe('Deployment', () => {
		it("Should be deployed correctly", async () => {
			const { factory, validator, nft_eth, receiver_eth, nft_erc20, receiver_erc20, alice } = await loadFixture(fixture);

			let [, , , feeReceiver, , infoReturned] = await nft_eth.parameters();
			expect(infoReturned.metadata.name).to.be.equal(instanceInfoETH.metadata.name);
			expect(infoReturned.metadata.symbol).to.be.equal(instanceInfoETH.metadata.symbol);
			expect(infoReturned.contractURI).to.be.equal(instanceInfoETH.contractURI);
			expect(infoReturned.payingToken).to.be.equal(instanceInfoETH.payingToken);
			expect(infoReturned.mintPrice).to.be.equal(instanceInfoETH.mintPrice);
			expect(infoReturned.whitelistMintPrice).to.be.equal(instanceInfoETH.whitelistMintPrice);
			expect(infoReturned.transferable).to.be.equal(instanceInfoETH.transferable);
			expect(feeReceiver).to.be.equal(receiver_eth.address);

			expect((await nft_eth.parameters()).factory).to.be.equal(factory.address);
			expect(await nft_eth.name()).to.be.equal(instanceInfoETH.metadata.name);
			expect(await nft_eth.symbol()).to.be.equal(instanceInfoETH.metadata.symbol);
			expect((await nft_eth.parameters()).info.payingToken).to.be.equal(instanceInfoETH.payingToken);
			expect((await nft_eth.parameters()).info.mintPrice).to.be.equal(instanceInfoETH.mintPrice);
			expect((await nft_eth.parameters()).info.whitelistMintPrice).to.be.equal(instanceInfoETH.whitelistMintPrice);
			expect((await nft_eth.parameters()).info.transferable).to.be.equal(instanceInfoETH.transferable);
			expect((await nft_eth.parameters()).info.maxTotalSupply).to.be.equal(instanceInfoETH.maxTotalSupply);
			expect((await nft_eth.parameters()).info.feeNumerator).to.be.equal(instanceInfoETH.feeNumerator);
			expect((await nft_eth.parameters()).creator).to.be.equal(alice.address);
			expect((await nft_eth.parameters()).info.collectionExpire).to.be.equal(instanceInfoETH.collectionExpire);
			expect(await nft_eth.contractURI()).to.be.equal(instanceInfoETH.contractURI);
			expect(await nft_eth.getTransferValidator()).to.be.equal(validator.address);

			[, , , feeReceiver, , infoReturned] = await nft_erc20.parameters();
			expect(infoReturned.maxTotalSupply).to.be.equal(instanceInfoToken.maxTotalSupply);
			expect(infoReturned.feeNumerator).to.be.equal(instanceInfoToken.feeNumerator);
			expect(feeReceiver).to.be.equal(receiver_erc20.address);
			expect(infoReturned.collectionExpire).to.be.equal(instanceInfoToken.collectionExpire);
			expect(infoReturned.signature).to.be.equal(instanceInfoToken.signature);
			expect(infoReturned.payingToken).to.be.equal(instanceInfoToken.payingToken);

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

	describe('Functions from AutoValidatorTransferApprove and CreatorToken', () => {
		it("Functions from AutoValidatorTransferApprove", async () => {
			const { nft_eth, alice, validator } = await loadFixture(fixture);

			const nft_eth_alice = nft_eth.connect(alice);

			await nft_eth_alice.setNftParameters((await nft_eth.parameters()).info.payingToken, (await nft_eth.parameters()).info.mintPrice, (await nft_eth.parameters()).info.whitelistMintPrice, true);

			await nft_eth_alice.setApprovalForAll(validator.address, false);

			expect(await nft_eth_alice.isApprovedForAll(alice.address, validator.address)).to.be.true;
			expect(await nft_eth_alice.isApprovedForAll(validator.address, alice.address)).to.be.false;

			await nft_eth_alice.setNftParameters((await nft_eth.parameters()).info.payingToken, (await nft_eth.parameters()).info.mintPrice, (await nft_eth.parameters()).info.whitelistMintPrice, false);
			expect(await nft_eth_alice.isApprovedForAll(alice.address, validator.address)).to.be.false;

			await nft_eth_alice.setApprovalForAll(validator.address, true);

			expect(await nft_eth_alice.isApprovedForAll(alice.address, validator.address)).to.be.true;
		});

		it("Validator is caller", async () => {
			const { NFTFactory, alice, bob, signer } = await loadFixture(fixture);

			const factory: NFTFactory = await upgrades.deployProxy(NFTFactory, [
				nftInfo,
				referralPercentages,
			]) as NFTFactory;
			await factory.deployed();

			nftInfo.transferValidator = bob.address;
			await factory.setFactoryParameters(
				nftInfo,
				referralPercentages
			)

			const hashedCode = EthCrypto.hash.keccak256([
				{ type: "address", value: bob.address },
				{ type: "address", value: factory.address },
				{ type: "uint256", value: chainId },
			]);

			await factory.connect(bob).createReferralCode();

			await factory.connect(alice).produce(instanceInfoETH, hashedCode);

			const nft_eth: NFT = await ethers.getContractAt("NFT", (await factory.getNftInstanceInfo(
				ethers.utils.solidityKeccak256(
					['string', 'string'],
					[nftName, nftSymbol]
				))).nftAddress);

			const NFT_721_BASE_URI = "test.com/";

			let message = EthCrypto.hash.keccak256([
				{ type: "address", value: bob.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			await nft_eth
				.connect(alice)
				.mintStaticPrice(
					bob.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
					{
						value: ethers.utils.parseEther("0.03"),
					}
				);

			await nft_eth.connect(bob).transferFrom(bob.address, alice.address, 0);
		});

		it("Validator is address zero", async () => {
			const { NFTFactory, alice, bob, signer } = await loadFixture(fixture);

			const factory: NFTFactory = await upgrades.deployProxy(NFTFactory, [
				nftInfo,
				referralPercentages,
			]) as NFTFactory;
			await factory.deployed();

			nftInfo.transferValidator = ZERO_ADDRESS;
			await factory.setFactoryParameters(
				nftInfo,
				referralPercentages
			)

			const hashedCode = EthCrypto.hash.keccak256([
				{ type: "address", value: bob.address },
				{ type: "address", value: factory.address },
				{ type: "uint256", value: chainId },
			]);

			await factory.connect(bob).createReferralCode();

			await factory.connect(alice).produce(instanceInfoETH, hashedCode);

			const nft_eth: NFT = await ethers.getContractAt("NFT", (await factory.getNftInstanceInfo(
				ethers.utils.solidityKeccak256(
					['string', 'string'],
					[nftName, nftSymbol]
				))).nftAddress);

			const NFT_721_BASE_URI = "test.com/";

			let message = EthCrypto.hash.keccak256([
				{ type: "address", value: bob.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			await nft_eth
				.connect(alice)
				.mintStaticPrice(
					bob.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
					{
						value: ethers.utils.parseEther("0.03"),
					}
				);

			await nft_eth.connect(bob).transferFrom(bob.address, alice.address, 0);
		});
	});

	describe('Errors', () => {
		it("only owner", async () => {
			const { nft_eth, owner, } = await loadFixture(fixture);

			await expect(nft_eth.connect(owner).setNftParameters((await nft_eth.parameters()).info.payingToken, (await nft_eth.parameters()).info.mintPrice, (await nft_eth.parameters()).info.whitelistMintPrice, false)).to.be.revertedWithCustomError(nft_eth, 'Unauthorized');
		});
	});

	describe('Mint', () => {
		it("Should mint correctly static prices", async () => {
			const { nft_eth, receiver_eth, owner, alice, signer } = await loadFixture(fixture);

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
					.connect(alice).mintStaticPrice(
						alice.address,
						[
							{
								tokenId: 0,
								tokenUri: NFT_721_BASE_URI,
								whitelisted: false,
								signature,
							} as StaticPriceParametersStruct,
						],
						ETH_ADDRESS,
						ethers.utils.parseEther("0.02"),
						{
							value: ethers.utils.parseEther("0.02"),
						}
					)
			).to.be.revertedWithCustomError(nft_eth, `IncorrectETHAmountSent`).withArgs(ethers.utils.parseEther("0.02"));

			await expect(
				nft_eth
					.connect(alice)
					.mintStaticPrice(
						alice.address,
						[
							{
								tokenId: 0,
								tokenUri: NFT_721_BASE_URI,
								whitelisted: false,
								signature,
							} as StaticPriceParametersStruct,
						],
						alice.address,
						ethers.utils.parseEther("0.03"),
						{
							value: ethers.utils.parseEther("0.03"),
						}
					)
			).to.be.revertedWithCustomError(nft_eth, `TokenChanged`).withArgs(ETH_ADDRESS);

			await expect(
				nft_eth
					.connect(alice)
					.mintStaticPrice(
						alice.address,
						[
							{
								tokenId: 0,
								tokenUri: NFT_721_BASE_URI,
								whitelisted: false,
								signature,
							} as StaticPriceParametersStruct,
						],
						ETH_ADDRESS,
						ethers.utils.parseEther("0.03"),
						{
							value: ethers.utils.parseEther("0.02"),
						}
					)
			).to.be.revertedWithCustomError(nft_eth, `IncorrectETHAmountSent`).withArgs(ethers.utils.parseEther("0.02"));

			await nft_eth
				.connect(alice)
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
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
			expect(receiver).to.be.equal(receiver_eth.address);

			for (let i = 1; i < 10; ++i) {
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
					.mintStaticPrice(
						alice.address,
						[
							{
								tokenId: i,
								tokenUri: NFT_721_BASE_URI,
								whitelisted: false,
								signature,
							} as StaticPriceParametersStruct,
						],
						ETH_ADDRESS,
						ethers.utils.parseEther("0.03"),
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
					.mintStaticPrice(
						alice.address,
						[
							{
								tokenId: 11,
								tokenUri: NFT_721_BASE_URI,
								whitelisted: false,
								signature,
							} as StaticPriceParametersStruct,
						],
						ETH_ADDRESS,
						ethers.utils.parseEther("0.03"),
						{
							value: ethers.utils.parseEther("0.03"),
						}
					)
			).to.be.revertedWithCustomError(nft_eth, "TotalSupplyLimitReached");
		});

		it("Should batch mint correctly static prices", async () => {
			const { nft_eth, receiver_eth, validator, factory, owner, alice, signer } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			let message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: true },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			let message2 = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 1 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			let signature2 = EthCrypto.sign(signer.privateKey, message2);

			await factory.setFactoryParameters(
				{
					transferValidator: validator.address,
					platformAddress: owner.address,
					signerAddress: signer.address,
					platformCommission: PLATFORM_COMISSION,
					defaultPaymentCurrency: ETH_ADDRESS,
					maxArraySize: 1
				} as NftFactoryParametersStruct,
				referralPercentages
			)
			await expect(nft_eth
				.connect(alice)
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
					{
						value: ethers.utils.parseEther("0.03"),
					}
				)).to.be.revertedWithCustomError(nft_eth, 'WrongArraySize');
			nftInfo.maxArraySize = 20;
			await factory.setFactoryParameters(
				nftInfo,
				referralPercentages
			)

			await expect(nft_eth
				.connect(alice)
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 1,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature: signature2,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.04"),
					{
						value: ethers.utils.parseEther("0.03"),
					}
				)).to.be.revertedWithCustomError(nft_eth, 'PriceChanged').withArgs(ethers.utils.parseEther("0.04"));

			await nft_eth
				.connect(alice)
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: true,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
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
			expect(receiver).to.be.equal(receiver_eth.address);

			let staticParams = [];
			for (let i = 1; i < 10; i++) {
				const message = EthCrypto.hash.keccak256([
					{ type: "address", value: alice.address },
					{ type: "uint256", value: i },
					{ type: "string", value: NFT_721_BASE_URI },
					{ type: "bool", value: false },
					{ type: "uint256", value: chainId },
				]);

				const signature = EthCrypto.sign(signer.privateKey, message);

				staticParams.push({
					tokenId: i,
					tokenUri: NFT_721_BASE_URI,
					whitelisted: false,
					signature,
				} as StaticPriceParametersStruct);
			}

			await nft_eth
				.connect(alice)
				.mintStaticPrice(
					alice.address,
					staticParams,
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03").mul(9),
					{
						value: ethers.utils.parseEther("0.03").mul(9),
					}
				);
		});

		it("Should mint correctly dynamic prices", async () => {
			const { nft_eth, alice, signer } = await loadFixture(fixture);

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
				.connect(alice).mintDynamicPrice
				(
					alice.address,
					[
						{
							tokenId: 0,
							price: ethers.utils.parseEther("0.01"),
							tokenUri: NFT_721_BASE_URI,
							signature,
						} as DynamicPriceParametersStruct,
					],
					ETH_ADDRESS,
					{
						value: ethers.utils.parseEther("0.01"),
					}
				)).to.be.revertedWithCustomError(nft_eth, 'InvalidSignature');

			await
				nft_eth
					.connect(alice).mintDynamicPrice
					(
						alice.address,
						[
							{
								tokenId: 0,
								price: ethers.utils.parseEther("0.02"),
								tokenUri: NFT_721_BASE_URI,
								signature,
							} as DynamicPriceParametersStruct,
						],
						ETH_ADDRESS,
						{
							value: ethers.utils.parseEther("0.02"),
						}
					);
		});

		it("Should batch mint correctly dynamic prices", async () => {
			const { nft_eth, receiver_eth, factory, validator, owner, alice, signer } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "uint256", value: ethers.utils.parseEther("0.02") },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			await factory.setFactoryParameters(
				{
					transferValidator: validator.address,
					platformAddress: owner.address,
					signerAddress: signer.address,
					platformCommission: PLATFORM_COMISSION,
					defaultPaymentCurrency: ETH_ADDRESS,
					maxArraySize: 1
				} as NftFactoryParametersStruct,
				referralPercentages
			)
			await expect(nft_eth
				.connect(alice)
				.mintDynamicPrice(
					alice.address,
					[
						{
							tokenId: 0,
							price: ethers.utils.parseEther("0.02"),
							tokenUri: NFT_721_BASE_URI,
							signature,
						} as DynamicPriceParametersStruct,
						{
							receiver: alice.address,
							tokenId: 0,
							price: ethers.utils.parseEther("0.02"),
							tokenUri: NFT_721_BASE_URI,
							signature,
						} as DynamicPriceParametersStruct
					],
					ETH_ADDRESS,
					{
						value: ethers.utils.parseEther("0.02"),
					}
				)).to.be.revertedWithCustomError(nft_eth, "WrongArraySize");
			await factory.setFactoryParameters(
				{
					transferValidator: validator.address,
					platformAddress: owner.address,
					signerAddress: signer.address,
					platformCommission: PLATFORM_COMISSION,
					defaultPaymentCurrency: ETH_ADDRESS,
					maxArraySize: 20
				} as NftFactoryParametersStruct,
				referralPercentages
			)

			await nft_eth
				.connect(alice)
				.mintDynamicPrice(
					alice.address,
					[
						{
							tokenId: 0,
							price: ethers.utils.parseEther("0.02"),
							tokenUri: NFT_721_BASE_URI,
							signature,
						} as DynamicPriceParametersStruct
					],
					ETH_ADDRESS,
					{
						value: ethers.utils.parseEther("0.02"),
					}
				);

			const salePrice = 1000;
			const feeNumerator = 600;
			const feeDenominator = 10000;
			const expectedResult = (salePrice * feeNumerator) / feeDenominator;

			const [receiver, realResult] = await nft_eth.royaltyInfo(0, salePrice);
			expect(expectedResult).to.be.equal(realResult);
			expect(receiver).to.be.equal(receiver_eth.address);

			let dynamicParams = [];
			for (let i = 1; i < 10; i++) {
				const message = EthCrypto.hash.keccak256([
					{ type: "address", value: alice.address },
					{ type: "uint256", value: i },
					{ type: "string", value: NFT_721_BASE_URI },
					{ type: "uint256", value: ethers.utils.parseEther("0.02") },
					{ type: "uint256", value: chainId },
				]);

				const signature = EthCrypto.sign(signer.privateKey, message);

				dynamicParams.push({
					tokenId: i,
					price: ethers.utils.parseEther("0.02"),
					tokenUri: NFT_721_BASE_URI,
					signature,
				} as DynamicPriceParametersStruct);
			}

			await nft_eth
				.connect(alice)
				.mintDynamicPrice(
					alice.address,
					dynamicParams,
					ETH_ADDRESS,
					{
						value: ethers.utils.parseEther("0.02").mul(9),
					}
				);
		});

		it("Should correct set new values", async () => {
			const { nft_eth, owner, alice, bob } = await loadFixture(fixture);

			const newPrice = ethers.utils.parseEther("1");
			const newWLPrice = ethers.utils.parseEther("0.1");
			const newPayingToken = bob.address;

			await expect(
				nft_eth.connect(owner).setNftParameters(newPayingToken, newPrice, newWLPrice, true)
			).to.be.revertedWithCustomError(nft_eth, "Unauthorized");

			await nft_eth
				.connect(alice)
				.setNftParameters(newPayingToken, newPrice, newWLPrice, true);

			const [, , , , , infoReturned] = await nft_eth.parameters();

			expect(infoReturned.payingToken).to.be.equal(newPayingToken);
			expect(infoReturned.mintPrice).to.be.equal(newPrice);
			expect(infoReturned.whitelistMintPrice).to.be.equal(newWLPrice);
		});

		it("Should mint correctly with erc20 token", async () => {
			const { nft_erc20, alice, erc20Example, signer } = await loadFixture(fixture);
			const NFT_721_BASE_URI = "test.com/";

			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, token_price);
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
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					erc20Example.address,
					token_price
				);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);
		});

		it("Should mint correctly with erc20 token without fee", async () => {
			const { factory, nft_erc20, alice, erc20Example, signer, owner } = await loadFixture(fixture);

			nftInfo.platformCommission = 0;
			await factory.setFactoryParameters(
				nftInfo,
				referralPercentages
			);

			const NFT_721_BASE_URI = "test.com/";

			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, token_price);
			// allow spender(our nft contract) to get our tokens
			await erc20Example.connect(alice).approve(nft_erc20.address, token_price);

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
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					erc20Example.address,
					token_price
				);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);
			expect(await erc20Example.balanceOf(alice.address)).to.be.deep.equal(
				token_price
			);
		});

		it("Should transfer if transferrable", async () => {
			const { factory, nft_erc20, alice, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			nftInfo.platformCommission = 0;
			await factory.setFactoryParameters(
				nftInfo,
				referralPercentages
			);

			const NFT_721_BASE_URI = "test.com/";

			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, token_price);
			// allow spender(our nft contract) to get our tokens
			await erc20Example.connect(alice).approve(nft_erc20.address, ethers.constants.MaxUint256);

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
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					erc20Example.address,
					token_price
				);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);

			await nft_erc20.connect(alice).transferFrom(alice.address, bob.address, 0);
			expect(await nft_erc20.balanceOf(bob.address)).to.be.deep.equal(1);
		});

		it("Should transfer if transferrable", async () => {
			const { factory, nft_erc20, alice, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			nftInfo.platformCommission = 0;
			await factory.setFactoryParameters(
				nftInfo,
				referralPercentages
			);

			const NFT_721_BASE_URI = "test.com/";

			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, token_price);
			// allow spender(our nft contract) to get our tokens
			await erc20Example.connect(alice).approve(nft_erc20.address, ethers.constants.MaxUint256);

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
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					erc20Example.address,
					token_price
				);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);

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
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 1,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature: signature2,
						} as StaticPriceParametersStruct,
					],
					erc20Example.address,
					token_price
				);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);

			await nft_erc20.connect(alice).transferFrom(alice.address, bob.address, 1);
		});

		it("Shouldn't transfer if not transferrable", async () => {
			const { factory, receiver_erc20, validator, Nft, alice, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			nftInfo.platformCommission = 0;
			await factory.setFactoryParameters(
				nftInfo,
				referralPercentages
			);

			const NFT_721_BASE_URI = "test.com/";

			const nft = await Nft.deploy(
				{
					transferValidator: validator.address,
					factory: factory.address,
					info: {
						metadata: {
							name: "InstanceName",
							symbol: "INNME",
						},
						contractURI: "ipfs://tbd",
						payingToken: erc20Example.address,
						mintPrice: 100,
						whitelistMintPrice: 100,
						transferable: false,
						maxTotalSupply: BigNumber.from("1000"),
						feeNumerator: BigNumber.from("600"),
						collectionExpire: BigNumber.from("86400"),
						signature: "0x00",
					} as InstanceInfoStruct,
					creator: alice.address,
					referralCode: ethers.constants.HashZero,
					feeReceiver: receiver_erc20.address
				} as NftParametersStruct,
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
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					erc20Example.address,
					100
				);
			expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);

			await expect(
				nft.connect(alice).transferFrom(alice.address, bob.address, 0)
			).to.be.revertedWithCustomError(nft, "NotTransferable");
		});

		it("Should mint correctly with erc20 token if user in the WL", async () => {
			const { Nft, validator, receiver_erc20, alice, erc20Example, factory, signer, owner, bob } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";
			const nft = await Nft.deploy(
				{
					transferValidator: validator.address,
					factory: factory.address,
					info: {
						metadata: {
							name: "InstanceName",
							symbol: "INNME",
						},
						contractURI: "ipfs://tbd",
						payingToken: erc20Example.address,
						mintPrice: ethers.utils.parseEther("100"),
						whitelistMintPrice: ethers.utils.parseEther("50"),
						transferable: true,
						maxTotalSupply: BigNumber.from("1000"),
						feeNumerator: BigNumber.from("600"),
						collectionExpire: BigNumber.from("86400"),
						signature: "0x00",
					} as InstanceInfoStruct,
					creator: bob.address,
					referralCode: ethers.constants.HashZero,
					feeReceiver: receiver_erc20.address
				} as NftParametersStruct,
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
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: true,
							signature,
						} as StaticPriceParametersStruct,
					],
					erc20Example.address,
					ethers.utils.parseEther("50"),
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
				nft_eth.connect(alice).mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 1,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature: bad_signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
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
				nft_eth.connect(alice).mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.02"),
					{ value: ethers.utils.parseEther("0.02"), }
				)
			).to.be.revertedWithCustomError(nft_eth, "IncorrectETHAmountSent").withArgs(ethers.utils.parseEther("0.02"));

			await expect(
				nft_eth.connect(alice).mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.02"),
				)
			).to.be.revertedWithCustomError(nft_eth, "IncorrectETHAmountSent").withArgs(0);
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
				nft_erc20.connect(alice).mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 1,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					erc20Example.address,
					token_price
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
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
					{
						value: ethers.utils.parseEther("0.03"),
					}
				);

			await expect(nft_eth.tokenURI(100)).to.be.revertedWithCustomError(nft_eth, 'TokenIdDoesNotExist');
			expect(await nft_eth.tokenURI(0)).to.be.deep.equal(NFT_721_BASE_URI);

		});
	});

	describe("Withdraw test", async () => {
		it("Should withdraw all funds when contract has 0 comission", async () => {
			const { alice, nft_erc20, erc20Example, signer, factory, owner } = await loadFixture(fixture);

			await erc20Example.mint(alice.address, token_price);
			await erc20Example
				.connect(alice)
				.approve(nft_erc20.address, ethers.constants.MaxUint256);

			nftInfo.platformCommission = 0;
			await factory.setFactoryParameters(
				nftInfo,
				referralPercentages
			);

			const NFT_721_BASE_URI = "test.com/";

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			let startBalance = await erc20Example.balanceOf(owner.address);

			await nft_erc20
				.connect(alice)
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					erc20Example.address,
					token_price
				);

			let endBalance = await erc20Example.balanceOf(owner.address);
			expect(endBalance.sub(startBalance)).to.eq(0)
		});

		it("Should withdraw all funds without 10% (comission)", async () => {
			const { alice, nft_erc20, erc20Example, signer, factory, owner, bob, charlie, hashedCode } = await loadFixture(fixture);

			await erc20Example.mint(charlie.address, token_price);
			await erc20Example
				.connect(charlie)
				.approve(nft_erc20.address, ethers.constants.MaxUint256);

			const NFT_721_BASE_URI = "test.com/";

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: charlie.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			let startBalanceOwner = await erc20Example.balanceOf(owner.address);
			let startBalanceBob = await erc20Example.balanceOf(bob.address);

			await nft_erc20
				.connect(charlie)
				.mintStaticPrice(
					charlie.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					erc20Example.address,
					token_price
				);
			expect((await factory.nftFactoryParameters()).platformAddress).to.be.equal(owner.address);
			let endBalanceOwner = await erc20Example.balanceOf(owner.address);
			let endBalanceBob = await erc20Example.balanceOf(bob.address);

			const fullFees = BigNumber.from(token_price).mul((await factory.nftFactoryParameters()).platformCommission).div(10000);
			const feesToRefferalCreator = await factory.getReferralRate(alice.address, hashedCode, fullFees);
			const feesToPlatform = fullFees.sub(feesToRefferalCreator);

			expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(
				feesToPlatform
			);
			expect(endBalanceBob.sub(startBalanceBob)).to.be.equal(
				feesToRefferalCreator
			);
		});

		it("Should withdraw all funds when contract has 0 comission", async () => {
			const { alice, nft_eth, signer, factory, owner } = await loadFixture(fixture);

			nftInfo.platformCommission = 0;
			await factory.setFactoryParameters(
				nftInfo,
				referralPercentages
			);

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
				.mintStaticPrice(
					alice.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
					{
						value: ethers.utils.parseEther("0.03"),
					}
				);

			let endBalance = await owner.getBalance();
			expect(endBalance.sub(startBalance)).to.eq(0)
		});

		it("Should withdraw all funds without 10% (comission)", async () => {
			const { alice, nft_eth, signer, factory, owner, bob, charlie, hashedCode } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: charlie.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			let startBalanceOwner = await owner.getBalance();
			let startBalanceBob = await bob.getBalance();

			await nft_eth
				.connect(charlie)
				.mintStaticPrice(
					charlie.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
					{
						value: ethers.utils.parseEther("0.03"),
					}
				);
			expect((await factory.nftFactoryParameters()).platformAddress).to.be.equal(owner.address);
			let endBalanceOwner = await owner.getBalance();
			let endBalanceBob = await bob.getBalance();

			const fullFees = ethers.utils.parseEther("0.03").div(BigNumber.from("100"));
			const feesToRefferalCreator = await factory.getReferralRate(alice.address, hashedCode, fullFees);
			const feesToPlatform = fullFees.sub(feesToRefferalCreator);

			expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(
				feesToPlatform
			);
			expect(endBalanceBob.sub(startBalanceBob)).to.be.equal(
				feesToRefferalCreator
			);
		});

		it("Should correct distribute royalties 2 payees", async () => {
			const { Nft, RoyaltiesReceiver, alice, signer, erc20Example, validator, factory, owner, bob, charlie, hashedCode } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			const receiver = await RoyaltiesReceiver.deploy(
				ethers.constants.HashZero,
				[alice.address, (await factory.nftFactoryParameters()).platformAddress, ZERO_ADDRESS]
			);
			await receiver.deployed()

			const nft = await Nft.deploy(
				{
					transferValidator: validator.address,
					factory: factory.address,
					info: {
						metadata: {
							name: nftName,
							symbol: nftSymbol,
						},
						contractURI,
						payingToken: ETH_ADDRESS,
						mintPrice: eth_price,
						whitelistMintPrice: eth_price,
						transferable: true,
						maxTotalSupply: 10,
						feeNumerator: BigNumber.from("600"),
						collectionExpire: BigNumber.from("86400"),
						signature: "0x00",
					} as InstanceInfoStruct,
					creator: alice.address,
					referralCode: ethers.constants.HashZero,
					feeReceiver: receiver.address
				} as NftParametersStruct,
			);
			await nft.deployed();

			expect(await nft.owner()).to.be.equal(alice.address);

			let message = EthCrypto.hash.keccak256([
				{ type: "address", value: charlie.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			let startBalanceOwner = await owner.getBalance();
			let startBalanceAlice = await alice.getBalance();

			await nft
				.connect(charlie)
				.mintStaticPrice(
					charlie.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
					{
						value: ethers.utils.parseEther("0.03"),
					}
				);

			let endBalanceOwner = await owner.getBalance();
			let endBalanceAlice = await alice.getBalance();

			const fullFees = ethers.utils.parseEther("0.03").div(BigNumber.from("100"));

			expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(
				fullFees
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

			const platformAddress = (await factory.nftFactoryParameters()).platformAddress;

			await owner.sendTransaction(tx);

			let creatorBalanceBefore = await alice.getBalance();
			let platformBalanceBefore = await owner.getBalance();

			await receiver.connect(bob)["releaseAll()"]();

			expect(await receiver['totalReleased()']()).to.eq(ethers.utils.parseEther("1"));
			expect(await receiver['released(address)'](alice.address)).to.eq(ethers.utils.parseEther("0.8"));
			expect(await receiver['released(address)'](owner.address)).to.eq(ethers.utils.parseEther("0.2"));

			let creatorBalanceAfter = await alice.getBalance();
			let platformBalanceAfter = await owner.getBalance();

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.8")
			);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.2")
			);

			// NFT was sold for ERC20

			creatorBalanceBefore = await erc20Example.balanceOf(alice.address);
			platformBalanceBefore = await erc20Example.balanceOf(platformAddress);

			await erc20Example
				.connect(owner).mint(receiver.address, ethers.utils.parseEther("1"));

			await receiver.connect(bob)["releaseAll(address)"](erc20Example.address);

			expect(await receiver['totalReleased(address)'](erc20Example.address)).to.eq(ethers.utils.parseEther("1"));
			expect(await receiver['released(address,address)'](erc20Example.address, alice.address)).to.eq(ethers.utils.parseEther("0.8"));
			expect(await receiver['released(address,address)'](erc20Example.address, owner.address)).to.eq(ethers.utils.parseEther("0.2"));

			creatorBalanceAfter = await erc20Example.balanceOf(alice.address);
			platformBalanceAfter = await erc20Example.balanceOf(platformAddress);

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.8")
			);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.2")
			);

			// NFT was sold for ETH 2

			tx = {
				from: owner.address,
				to: receiver.address,
				value: ethers.utils.parseEther("1"),
				gasLimit: 1000000,
			};

			await owner.sendTransaction(tx);

			creatorBalanceBefore = await alice.getBalance();
			platformBalanceBefore = await owner.getBalance();

			await receiver.connect(bob)["release(address)"](alice.address);

			expect(await receiver['totalReleased()']()).to.eq(ethers.utils.parseEther("1.8"));
			expect(await receiver['released(address)'](alice.address)).to.eq(ethers.utils.parseEther("1.6"));
			expect(await receiver['released(address)'](owner.address)).to.eq(ethers.utils.parseEther("0.2"));

			creatorBalanceAfter = await alice.getBalance();
			platformBalanceAfter = await owner.getBalance();

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.8")
			);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(0);

			// NFT was sold for ERC20 2

			creatorBalanceBefore = await erc20Example.balanceOf(alice.address);
			platformBalanceBefore = await erc20Example.balanceOf(platformAddress);

			await erc20Example
				.connect(owner).mint(receiver.address, ethers.utils.parseEther("1"));

			await receiver.connect(bob)['release(address,address)'](erc20Example.address, owner.address);

			expect(await receiver['totalReleased(address)'](erc20Example.address)).to.eq(ethers.utils.parseEther("1.2"));
			expect(await receiver['released(address,address)'](erc20Example.address, alice.address)).to.eq(ethers.utils.parseEther("0.8"));
			expect(await receiver['released(address,address)'](erc20Example.address, owner.address)).to.eq(ethers.utils.parseEther("0.4"));

			creatorBalanceAfter = await erc20Example.balanceOf(alice.address);
			platformBalanceAfter = await erc20Example.balanceOf(platformAddress);

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(0);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.2")
			);

			// NFT was sold for ERC20 3

			creatorBalanceBefore = await erc20Example.balanceOf(alice.address);
			platformBalanceBefore = await erc20Example.balanceOf(platformAddress);

			await expect(receiver.connect(bob)['release(address,address)'](erc20Example.address, charlie.address)).to.be.revertedWithCustomError(
				receiver, "OnlyToPayee"
			);
			await receiver.connect(bob)['release(address,address)'](erc20Example.address, owner.address);

			expect(await receiver['totalReleased(address)'](erc20Example.address)).to.eq(ethers.utils.parseEther("1.2"));
			expect(await receiver['released(address,address)'](erc20Example.address, alice.address)).to.eq(ethers.utils.parseEther("0.8"));
			expect(await receiver['released(address,address)'](erc20Example.address, owner.address)).to.eq(ethers.utils.parseEther("0.4"));

			creatorBalanceAfter = await erc20Example.balanceOf(alice.address);
			platformBalanceAfter = await erc20Example.balanceOf(platformAddress);

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(0);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(0);
		});

		it("Should correct distribute royalties 3 payees", async () => {
			const { alice, signer, receiver_eth, nft_eth, erc20Example, factory, owner, bob, charlie, pete, hashedCode } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			let message = EthCrypto.hash.keccak256([
				{ type: "address", value: charlie.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			let startBalanceOwner = await owner.getBalance();
			let startBalanceAlice = await alice.getBalance();
			let startBalanceBob = await bob.getBalance();

			await nft_eth
				.connect(charlie)
				.mintStaticPrice(
					charlie.address,
					[
						{
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
					],
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03"),
					{
						value: ethers.utils.parseEther("0.03"),
					}
				);

			let endBalanceOwner = await owner.getBalance();
			let endBalanceAlice = await alice.getBalance();
			let endBalanceBob = await bob.getBalance();

			const fullFees = ethers.utils.parseEther("0.03").div(BigNumber.from("100"));
			const feesToRefferalCreator = await factory.getReferralRate(alice.address, hashedCode, fullFees);
			const feesToPlatform = fullFees.sub(feesToRefferalCreator);

			expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(
				feesToPlatform
			);
			expect(endBalanceBob.sub(startBalanceBob)).to.be.equal(
				feesToRefferalCreator
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
				to: receiver_eth.address,
				value: ethers.utils.parseEther("1"),
				gasLimit: 1000000,
			};

			const platformAddress = (await factory.nftFactoryParameters()).platformAddress;

			await owner.sendTransaction(tx);

			let creatorBalanceBefore = await alice.getBalance();
			let platformBalanceBefore = await owner.getBalance();
			let bobBalanceBefore = await bob.getBalance();

			await receiver_eth.connect(pete)["releaseAll()"]();

			expect(await receiver_eth['totalReleased()']()).to.eq(ethers.utils.parseEther("1"))
			expect(await receiver_eth['released(address)'](alice.address)).to.eq(ethers.utils.parseEther("0.8"));
			expect(await receiver_eth['released(address)'](owner.address)).to.eq(ethers.utils.parseEther("0.1"));
			expect(await receiver_eth['released(address)'](bob.address)).to.eq(ethers.utils.parseEther("0.1"));

			let creatorBalanceAfter = await alice.getBalance();
			let platformBalanceAfter = await owner.getBalance();
			let bobBalanceAfter = await bob.getBalance();

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.8")
			);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.1")
			);
			expect(bobBalanceAfter.sub(bobBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.1")
			);

			// NFT was sold for ERC20

			creatorBalanceBefore = await erc20Example.balanceOf(alice.address);
			platformBalanceBefore = await erc20Example.balanceOf(platformAddress);
			bobBalanceBefore = await erc20Example.balanceOf(bob.address);

			await erc20Example
				.connect(owner).mint(receiver_eth.address, ethers.utils.parseEther("1"));

			await receiver_eth.connect(pete)["releaseAll(address)"](erc20Example.address);

			expect(await receiver_eth['totalReleased(address)'](erc20Example.address)).to.eq(ethers.utils.parseEther("1"))
			expect(await receiver_eth['released(address,address)'](erc20Example.address, alice.address)).to.eq(ethers.utils.parseEther("0.8"))
			expect(await receiver_eth['released(address,address)'](erc20Example.address, owner.address)).to.eq(ethers.utils.parseEther("0.1"))
			expect(await receiver_eth['released(address,address)'](erc20Example.address, bob.address)).to.eq(ethers.utils.parseEther("0.1"))

			creatorBalanceAfter = await erc20Example.balanceOf(alice.address);
			platformBalanceAfter = await erc20Example.balanceOf(platformAddress);
			bobBalanceAfter = await erc20Example.balanceOf(bob.address);

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.8")
			);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.1")
			);
			expect(bobBalanceAfter.sub(bobBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("0.1")
			);
		});
	});
});
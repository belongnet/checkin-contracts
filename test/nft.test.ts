import { ethers, upgrades } from 'hardhat';
import { loadFixture, } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, ContractFactory } from "ethers";
import { Erc20Example, MockTransferValidator, NFTFactory } from "../typechain-types";
import { expect } from "chai";
import { InstanceInfoStruct, NFT, NftParametersStruct } from "../typechain-types/contracts/NFT";
import EthCrypto from "eth-crypto";
import { NftFactoryParametersStruct, ReferralPercentagesStruct } from '../typechain-types/contracts/factories/NFTFactory';
import { DynamicPriceParametersStruct, StaticPriceParametersStruct } from '../typechain-types/contracts/NFT';

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

	let instanceInfoETH: InstanceInfoStruct, instanceInfoToken: InstanceInfoStruct, nftInfo: NftFactoryParametersStruct, referralPercentages: ReferralPercentagesStruct;

	async function fixture() {
		const [owner, alice, bob, charlie, pete] = await ethers.getSigners();
		const signer = EthCrypto.createIdentity();

		const Validator: ContractFactory = await ethers.getContractFactory("MockTransferValidator");
		const validator: MockTransferValidator = await Validator.deploy(true) as MockTransferValidator;
		await validator.deployed();

		const Erc20Example: ContractFactory = await ethers.getContractFactory("Erc20Example");
		const erc20Example: Erc20Example = await Erc20Example.deploy() as Erc20Example;
		await erc20Example.deployed();

		nftInfo = {
			transferValidator: validator.address,
			platformAddress: owner.address,
			signerAddress: signer.address,
			platformCommission: PLATFORM_COMISSION,
			defaultPaymentCurrency: ETH_ADDRESS,
			maxArraySize: 10
		} as NftFactoryParametersStruct;

		referralPercentages = {
			initialPercentage: 5000,
			secondTimePercentage: 3000,
			thirdTimePercentage: 1500,
			percentageByDefault: 500
		};

		const NFTFactory: ContractFactory = await ethers.getContractFactory("NFTFactory", owner);
		const factory: NFTFactory = await upgrades.deployProxy(NFTFactory, [
			referralPercentages,
			nftInfo,
		]) as NFTFactory;
		await factory.deployed();

		const hashedCode = EthCrypto.hash.keccak256([
			{ type: "address", value: bob.address },
			{ type: "uint256", value: chainId },
		]);

		await factory.connect(bob).createReferralCode();

		const message = EthCrypto.hash.keccak256([
			{ type: "string", value: nftName },
			{ type: "string", value: nftSymbol },
			{ type: "string", value: contractURI },
			{ type: "uint96", value: 600 },
			{ type: "address", value: owner.address },
			{ type: "uint256", value: chainId },
		]);

		const signature = EthCrypto.sign(signer.privateKey, message);

		const message2 = EthCrypto.hash.keccak256([
			{ type: "string", value: nftName + "2" },
			{ type: "string", value: nftSymbol + "2" },
			{ type: "string", value: contractURI },
			{ type: "uint96", value: 600 },
			{ type: "address", value: owner.address },
			{ type: "uint256", value: chainId },
		]);

		const signature2 = EthCrypto.sign(signer.privateKey, message2);

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
			name: nftName + '2',
			symbol: nftSymbol + '2',
			contractURI,
			payingToken: erc20Example.address,
			mintPrice: token_price,
			whitelistMintPrice: token_price,
			transferable: true,
			maxTotalSupply: 10,
			feeNumerator: BigNumber.from("600"),
			feeReceiver: owner.address,
			collectionExpire: BigNumber.from("86400"),
			signature: signature2,
		};

		await factory.connect(alice).produce(instanceInfoETH, hashedCode);
		await factory.connect(alice).produce(instanceInfoToken, hashedCode);

		const Nft = await ethers.getContractFactory("NFT");
		const nft_eth: NFT = await ethers.getContractAt("NFT", (await factory.getNftInstanceInfo(
			ethers.utils.solidityKeccak256(
				['string', 'string'],
				[nftName, nftSymbol]
			))).nftAddress);

		const nft_erc20: NFT = await ethers.getContractAt("NFT", (await factory.getNftInstanceInfo(
			ethers.utils.solidityKeccak256(
				['string', 'string'],
				[nftName + '2', nftSymbol + '2']
			))).nftAddress);

		return { factory, nft_eth, nft_erc20, Nft, validator, erc20Example, owner, alice, bob, charlie, pete, signer, hashedCode };
	}

	describe('Deployment', () => {
		it("Should be deployed correctly", async () => {
			const { factory, nft_eth, nft_erc20, alice } = await loadFixture(fixture);

			let [, , infoReturned,] = await nft_eth.parameters();
			expect(infoReturned.name).to.be.equal(instanceInfoETH.name);
			expect(infoReturned.symbol).to.be.equal(instanceInfoETH.symbol);
			expect(infoReturned.contractURI).to.be.equal(instanceInfoETH.contractURI);
			expect(infoReturned.payingToken).to.be.equal(instanceInfoETH.payingToken);
			expect(infoReturned.mintPrice).to.be.equal(instanceInfoETH.mintPrice);
			expect(infoReturned.whitelistMintPrice).to.be.equal(instanceInfoETH.whitelistMintPrice);
			expect(infoReturned.transferable).to.be.equal(instanceInfoETH.transferable);

			expect((await nft_eth.parameters()).factory).to.be.equal(factory.address);
			expect(await nft_eth.name()).to.be.equal(instanceInfoETH.name);
			expect(await nft_eth.symbol()).to.be.equal(instanceInfoETH.symbol);
			expect((await nft_eth.parameters()).info.payingToken).to.be.equal(instanceInfoETH.payingToken);
			expect((await nft_eth.parameters()).info.mintPrice).to.be.equal(instanceInfoETH.mintPrice);
			expect((await nft_eth.parameters()).info.whitelistMintPrice).to.be.equal(instanceInfoETH.whitelistMintPrice);
			expect((await nft_eth.parameters()).info.transferable).to.be.equal(instanceInfoETH.transferable);
			expect((await nft_eth.parameters()).info.maxTotalSupply).to.be.equal(instanceInfoETH.maxTotalSupply);
			expect((await nft_eth.parameters()).info.feeNumerator).to.be.equal(instanceInfoETH.feeNumerator);
			expect((await nft_eth.parameters()).creator).to.be.equal(alice.address);
			expect((await nft_eth.parameters()).info.collectionExpire).to.be.equal(instanceInfoETH.collectionExpire);
			expect(await nft_eth.contractURI()).to.be.equal(instanceInfoETH.contractURI);

			[, , infoReturned,] = await nft_erc20.parameters();
			expect(infoReturned.maxTotalSupply).to.be.equal(instanceInfoToken.maxTotalSupply);
			expect(infoReturned.feeNumerator).to.be.equal(instanceInfoToken.feeNumerator);
			expect(infoReturned.feeReceiver).to.be.equal(instanceInfoToken.feeReceiver);
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
					.connect(alice).mintStaticPrice(
						{
							receiver: alice.address,
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
						ETH_ADDRESS,
						ethers.utils.parseEther("0.02"),
						{
							value: ethers.utils.parseEther("0.02"),
						}
					)
			).to.be.revertedWithCustomError(nft_eth, `PriceChanged`).withArgs(ethers.utils.parseEther("0.02"), eth_price);

			await expect(
				nft_eth
					.connect(alice)
					.mintStaticPrice(
						{
							receiver: alice.address,
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
						alice.address,
						ethers.utils.parseEther("0.03"),
						{
							value: ethers.utils.parseEther("0.03"),
						}
					)
			).to.be.revertedWithCustomError(nft_eth, `TokenChanged`).withArgs(alice.address, ETH_ADDRESS);

			await expect(
				nft_eth
					.connect(alice)
					.mintStaticPrice(
						{
							receiver: alice.address,
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
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
			expect(receiver).to.be.equal(owner.address);
			expect(await nft_eth.getReceipt(0)).eq(ethers.utils.parseEther("0.03"));

			for (let i = 1; i < 10; i++) {
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
						{
							receiver: alice.address,
							tokenId: i,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
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
						{
							receiver: alice.address,
							tokenId: 11,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
						ETH_ADDRESS,
						ethers.utils.parseEther("0.03"),
						{
							value: ethers.utils.parseEther("0.03"),
						}
					)
			).to.be.revertedWithCustomError(nft_eth, "TotalSupplyLimitReached");
		});

		it("Should batch mint correctly static prices", async () => {
			const { nft_eth, validator, factory, owner, alice, signer } = await loadFixture(fixture);

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

			await factory.setFactoryParameters(signer.address, ETH_ADDRESS, validator.address, 1, referralPercentages);
			await expect(nft_eth
				.connect(alice)
				.mintStaticPriceBatch(
					[
						{
							receiver: alice.address,
							tokenId: 0,
							tokenUri: NFT_721_BASE_URI,
							whitelisted: false,
							signature,
						} as StaticPriceParametersStruct,
						{
							receiver: alice.address,
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
			await factory.setFactoryParameters(signer.address, ETH_ADDRESS, validator.address, 20, referralPercentages);

			await expect(nft_eth
				.connect(alice)
				.mintStaticPriceBatch(
					[
						{
							receiver: alice.address,
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
				)).to.be.revertedWithCustomError(nft_eth, 'PriceChanged').withArgs(ethers.utils.parseEther("0.04"), ethers.utils.parseEther("0.03"));

			await nft_eth
				.connect(alice)
				.mintStaticPriceBatch(
					[
						{
							receiver: alice.address,
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
			expect(receiver).to.be.equal(owner.address);
			expect(await nft_eth.getReceipt(0)).eq(ethers.utils.parseEther("0.03"));

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
					receiver: alice.address,
					tokenId: i,
					tokenUri: NFT_721_BASE_URI,
					whitelisted: false,
					signature,
				} as StaticPriceParametersStruct);
			}

			await nft_eth
				.connect(alice)
				.mintStaticPriceBatch(
					staticParams,
					ETH_ADDRESS,
					ethers.utils.parseEther("0.03").mul(9),
					{
						value: ethers.utils.parseEther("0.03").mul(9),
					}
				);

			for (let i = 1; i < 10; i++) {
				expect(await nft_eth.getReceipt(i)).eq(ethers.utils.parseEther("0.03"));
			}
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
					{
						receiver: alice.address,
						tokenId: 0,
						price: ethers.utils.parseEther("0.01"),
						tokenUri: NFT_721_BASE_URI,
						signature,
					} as DynamicPriceParametersStruct,
					ETH_ADDRESS,
					{
						value: ethers.utils.parseEther("0.01"),
					}
				)).to.be.revertedWithCustomError(nft_eth, 'InvalidSignature');

			await
				nft_eth
					.connect(alice).mintDynamicPrice
					(
						{
							receiver: alice.address,
							tokenId: 0,
							price: ethers.utils.parseEther("0.02"),
							tokenUri: NFT_721_BASE_URI,
							signature,
						} as DynamicPriceParametersStruct,
						ETH_ADDRESS,
						{
							value: ethers.utils.parseEther("0.02"),
						}
					);

			expect(await nft_eth.getReceipt(0)).eq(ethers.utils.parseEther("0.02"));
		});

		it("Should batch mint correctly dynamic prices", async () => {
			const { nft_eth, factory, validator, owner, alice, signer } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 0 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "uint256", value: ethers.utils.parseEther("0.02") },
				{ type: "uint256", value: chainId },
			]);

			let signature = EthCrypto.sign(signer.privateKey, message);

			await factory.setFactoryParameters(signer.address, ETH_ADDRESS, validator.address, 1, referralPercentages);
			await expect(nft_eth
				.connect(alice)
				.mintDynamicPriceBatch(
					[
						{
							receiver: alice.address,
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
			await factory.setFactoryParameters(signer.address, ETH_ADDRESS, validator.address, 20, referralPercentages);

			await nft_eth
				.connect(alice)
				.mintDynamicPriceBatch(
					[{
						receiver: alice.address,
						tokenId: 0,
						price: ethers.utils.parseEther("0.02"),
						tokenUri: NFT_721_BASE_URI,
						signature,
					} as DynamicPriceParametersStruct],
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
			expect(receiver).to.be.equal(owner.address);
			expect(await nft_eth.getReceipt(0)).eq(ethers.utils.parseEther("0.02"));

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
					receiver: alice.address,
					tokenId: i,
					price: ethers.utils.parseEther("0.02"),
					tokenUri: NFT_721_BASE_URI,
					signature,
				} as DynamicPriceParametersStruct);
			}

			await nft_eth
				.connect(alice)
				.mintDynamicPriceBatch(
					dynamicParams,
					ETH_ADDRESS,
					{
						value: ethers.utils.parseEther("0.02").mul(9),
					}
				);

			for (let i = 1; i < 10; i++) {
				expect(await nft_eth.getReceipt(i)).eq(ethers.utils.parseEther("0.02"));
			}
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
			).to.be.revertedWithCustomError(nft_eth, "ZeroAddressPassed");

			await expect(
				nft_eth.connect(alice).setPayingToken(newPayingToken, 0, newWLPrice)
			).to.be.revertedWithCustomError(nft_eth, "InvalidMintPrice");

			await nft_eth
				.connect(alice)
				.setPayingToken(newPayingToken, newPrice, newWLPrice);

			const [, , infoReturned,] = await nft_eth.parameters();

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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
					erc20Example.address,
					token_price
				);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);
		});

		it("Should mint correctly with erc20 token without fee", async () => {
			const { factory, nft_erc20, alice, erc20Example, signer, owner } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformParameters(owner.address, 0);

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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
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

			await factory.connect(owner).setPlatformParameters(owner.address, 0);

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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
					erc20Example.address,
					token_price
				);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);

			await nft_erc20.connect(alice).transferFrom(alice.address, bob.address, 0);
			expect(await nft_erc20.balanceOf(bob.address)).to.be.deep.equal(1);
		});

		it("Should transfer if transferrable", async () => {
			const { factory, nft_erc20, alice, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformParameters(owner.address, 0);

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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
					erc20Example.address,
					token_price
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
				.mintStaticPrice(
					{
						receiver: alice.address,
						tokenId: 1,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature: signature2,
					} as StaticPriceParametersStruct,
					erc20Example.address,
					token_price
				);
			expect(await nft_erc20.balanceOf(alice.address)).to.be.deep.equal(1);

			await nft_erc20.connect(alice).setTransferValidator(alice.address);
			await nft_erc20.connect(alice).transferFrom(alice.address, bob.address, 1);
		});

		it("Shouldn't transfer if not transferrable", async () => {
			const { factory, validator, Nft, alice, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformParameters(owner.address, 0);

			const NFT_721_BASE_URI = "test.com/";

			const nft = await Nft.deploy(
				{
					transferValidator: validator.address,
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
					referralCode: ethers.constants.HashZero,
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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
					erc20Example.address,
					100
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
					transferValidator: validator.address,
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
					referralCode: ethers.constants.HashZero,
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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: true,
						signature,
					} as StaticPriceParametersStruct,
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
					{
						receiver: alice.address,
						tokenId: 1,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature: bad_signature,
					} as StaticPriceParametersStruct,
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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
					ETH_ADDRESS,
					ethers.utils.parseEther("0.02"),
					{ value: ethers.utils.parseEther("0.02"), }
				)
			).to.be.revertedWithCustomError(nft_eth, "PriceChanged").withArgs(ethers.utils.parseEther("0.02"), eth_price);

			await expect(
				nft_eth.connect(alice).mintStaticPrice(
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
					ETH_ADDRESS,
					ethers.utils.parseEther("0.02"),
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
				nft_erc20.connect(alice).mintStaticPrice(
					{
						receiver: alice.address,
						tokenId: 1,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
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

			await factory.connect(owner).setPlatformParameters(owner.address, 0);

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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
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
					{
						receiver: charlie.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
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

			await factory.connect(owner).setPlatformParameters(owner.address, 0);

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
					{
						receiver: alice.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
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
					{
						receiver: charlie.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
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
			const { alice, signer, nft_eth, erc20Example, factory, owner, bob, charlie, hashedCode } = await loadFixture(fixture);

			const RoyaltiesReceiver =
				await ethers.getContractFactory("RoyaltiesReceiver");
			const receiver = await RoyaltiesReceiver.deploy(
				[(await factory.nftFactoryParameters()).platformAddress, alice.address],
				[1, 5]
			);
			await receiver.deployed();

			expect(await nft_eth.owner()).to.be.equal(alice.address);

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
					{
						receiver: charlie.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
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
				to: receiver.address,
				value: ethers.utils.parseEther("1"),
				gasLimit: 1000000,
			};

			const platformAddress = (await factory.nftFactoryParameters()).platformAddress;

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

		it("Should correct distribute royalties 3 payees", async () => {
			const { alice, signer, nft_eth, erc20Example, factory, owner, bob, charlie, pete, hashedCode } = await loadFixture(fixture);

			const RoyaltiesReceiver =
				await ethers.getContractFactory("RoyaltiesReceiver");
			const receiver = await RoyaltiesReceiver.deploy(
				[(await factory.nftFactoryParameters()).platformAddress, alice.address],
				[1, 5]
			);
			await receiver.deployed();

			await expect(receiver.connect(pete).addThirdPayee(pete.address, 1)).to.be.revertedWithCustomError(receiver, 'ThirdPayeeCanBeAddedOnlyByPayees');

			await receiver.addThirdPayee(pete.address, 1);

			await expect(receiver.addThirdPayee(pete.address, 1)).to.be.revertedWithCustomError(receiver, 'ThirdPayeeExists');

			expect(await nft_eth.owner()).to.be.equal(alice.address);

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
					{
						receiver: charlie.address,
						tokenId: 0,
						tokenUri: NFT_721_BASE_URI,
						whitelisted: false,
						signature,
					} as StaticPriceParametersStruct,
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
				to: receiver.address,
				value: ethers.utils.parseEther("1"),
				gasLimit: 1000000,
			};

			const platformAddress = (await factory.nftFactoryParameters()).platformAddress;

			await owner.sendTransaction(tx);

			let creatorBalanceBefore = await alice.getBalance();
			let platformBalanceBefore = await owner.getBalance();
			let peteBalanceBefore = await pete.getBalance();

			await receiver.connect(bob)["releaseAll()"]();

			expect(await receiver['totalReleased()']()).to.eq(BigNumber.from("999999999999999999"))
			expect(await receiver['released(address)'](alice.address)).to.eq(ethers.utils
				.parseEther("1")
				.mul(BigNumber.from("5"))
				.div(BigNumber.from("7")));
			expect(await receiver['released(address)'](owner.address)).to.eq(ethers.utils.parseEther("1").div(BigNumber.from("7")));
			expect(await receiver['released(address)'](pete.address)).to.eq(ethers.utils.parseEther("1").div(BigNumber.from("7")));


			let creatorBalanceAfter = await alice.getBalance();
			let platformBalanceAfter = await owner.getBalance();
			let peteBalanceAfter = await pete.getBalance();

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
				ethers.utils
					.parseEther("1")
					.mul(BigNumber.from("5"))
					.div(BigNumber.from("7"))
			);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("1").div(BigNumber.from("7"))
			);
			expect(peteBalanceAfter.sub(peteBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("1").div(BigNumber.from("7"))
			);

			// NFT was sold for ERC20

			creatorBalanceBefore = await erc20Example.balanceOf(alice.address);
			platformBalanceBefore = await erc20Example.balanceOf(platformAddress);
			peteBalanceBefore = await erc20Example.balanceOf(pete.address);

			await erc20Example
				.connect(owner).mint(receiver.address, ethers.utils.parseEther("1"));

			await receiver.connect(bob)["releaseAll(address)"](erc20Example.address);

			expect(await receiver['totalReleased(address)'](erc20Example.address)).to.eq(BigNumber.from("999999999999999999"))
			expect(await receiver['released(address,address)'](erc20Example.address, alice.address)).to.eq(ethers.utils
				.parseEther("1")
				.mul(BigNumber.from("5"))
				.div(BigNumber.from("7")))
			expect(await receiver['released(address,address)'](erc20Example.address, owner.address)).to.eq(ethers.utils.parseEther("1").div(BigNumber.from("7")))
			expect(await receiver['released(address,address)'](erc20Example.address, pete.address)).to.eq(ethers.utils.parseEther("1").div(BigNumber.from("7")))

			creatorBalanceAfter = await erc20Example.balanceOf(alice.address);
			platformBalanceAfter = await erc20Example.balanceOf(platformAddress);
			peteBalanceAfter = await erc20Example.balanceOf(pete.address);

			expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
				ethers.utils
					.parseEther("1")
					.mul(BigNumber.from("5"))
					.div(BigNumber.from("7"))
			);
			expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("1").div(BigNumber.from("7"))
			);
			expect(peteBalanceAfter.sub(peteBalanceBefore)).to.be.equal(
				ethers.utils.parseEther("1").div(BigNumber.from("7"))
			);
		});
	});
});
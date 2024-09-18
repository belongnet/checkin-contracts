
import { ethers, upgrades } from "hardhat";
import { loadFixture, } from '@nomicfoundation/hardhat-network-helpers';
import { BigNumber, ContractFactory } from "ethers";
import { Erc20Example, MockTransferValidator, NFTFactory, StorageContract } from "../typechain-types";
import { expect } from "chai";
import { InstanceInfoStruct, NFT, NftParametersStruct } from "../typechain-types/contracts/nft-with-royalties/NFT";
import EthCrypto from "eth-crypto";

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

	let instanceInfoETH: InstanceInfoStruct, instanceInfoToken: InstanceInfoStruct;

	async function fixture() {
		const [owner, alice, bob, charlie] = await ethers.getSigners();
		const signer = EthCrypto.createIdentity();

		const Storage: ContractFactory = await ethers.getContractFactory("StorageContract", owner);
		const storage: StorageContract = await Storage.deploy() as StorageContract;
		await storage.deployed();

		const Validator: ContractFactory = await ethers.getContractFactory("MockTransferValidator");
		const validator: MockTransferValidator = await Validator.deploy(true) as MockTransferValidator;
		await validator.deployed();

		const Erc20Example: ContractFactory = await ethers.getContractFactory("Erc20Example");
		const erc20Example: Erc20Example = await Erc20Example.deploy() as Erc20Example;
		await erc20Example.deployed();

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

		await factory.connect(alice).produce(instanceInfoETH);

		const hash = EthCrypto.hash.keccak256([
			{ type: "string", value: nftName },
			{ type: "string", value: nftSymbol },
		]);
		const instanceAddress = await storage.getInstance(hash);
		const nft: NFT = await ethers.getContractAt("NFT", instanceAddress) as NFT;

		return { storage, factory, nft, validator, erc20Example, owner, alice, bob, charlie, signer };
	}

	describe('Deployment', () => {
		it("Should deploy correctly", async () => {
			const { nft } = await loadFixture(fixture);

			const [, info] = await nft.parameters();
			expect(info.payingToken).to.be.equal(ETH_ADDRESS);
		});

		it.skip("Shouldn't deploy with incorrect params", async () => {
			const { owner, validator } = await loadFixture(fixture);
			const nftName = "Name 1";
			const nftSymbol = "S1";
			const contractURI = "contractURI/123";

			const NFT: ContractFactory = await ethers.getContractFactory("NFT");

			await expect(
				NFT.deploy(
					{
						storageContract: owner.address,
						info: {
							name: nftName,
							symbol: nftSymbol,
							contractURI,
							payingToken: ETH_ADDRESS,
							mintPrice: ethers.utils.parseEther("1"),
							whitelistMintPrice: ethers.utils.parseEther("0.5"),
							transferable: true,
							maxTotalSupply: 10,
							feeNumerator: 1000,
							feeReceiver: owner.address,
							collectionExpire: 1000000,
							signature: '0x0da0wdaw0'
						} as InstanceInfoStruct,
						creator: ZERO_ADDRESS,
					} as NftParametersStruct,
					validator.address
				)
			).to.be.revertedWith('sada');

			await expect(
				NFT.deploy(
					{
						storageContract: ZERO_ADDRESS,
						info: {
							name: nftName,
							symbol: nftSymbol,
							contractURI,
							payingToken: ETH_ADDRESS,
							mintPrice: ethers.utils.parseEther("1"),
							whitelistMintPrice: ethers.utils.parseEther("0.5"),
							transferable: true,
							maxTotalSupply: 10,
							feeNumerator: 1000,
							feeReceiver: owner.address,
							collectionExpire: 1000000,
							signature: '0x0da0wdaw0'
						} as InstanceInfoStruct,
						creator: ZERO_ADDRESS,
					} as NftParametersStruct,
					validator.address
				)
			).to.be.revertedWith('sada');
		});
	});

	describe('Mint', () => {
		it("Should mint correctly", async () => {
			const { nft, owner, alice, signer } = await loadFixture(fixture);

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
				nft
					.connect(alice)
					.mint(
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
			).to.be.revertedWithCustomError(nft, `PriceChanged`).withArgs(ethers.utils.parseEther("0.02"), eth_price);

			await nft
				.connect(alice)
				.mint(
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

			const [receiver, realResult] = await nft.royaltyInfo(0, salePrice);
			expect(expectedResult).to.be.equal(realResult);
			expect(receiver).to.be.equal(owner.address);

			for (let i = 1; i < 10; i++) {
				const message = EthCrypto.hash.keccak256([
					{ type: "address", value: alice.address },
					{ type: "uint256", value: i },
					{ type: "string", value: NFT_721_BASE_URI },
					{ type: "bool", value: false },
					{ type: "uint256", value: chainId },
				]);

				const signature = EthCrypto.sign(signer.privateKey, message);
				await nft
					.connect(alice)
					.mint(
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
				{ type: "uint256", value: 10 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			signature = EthCrypto.sign(signer.privateKey, message);


			await expect(
				nft
					.connect(alice)
					.mint(
						alice.address,
						10,
						NFT_721_BASE_URI,
						false,
						signature,
						ethers.utils.parseEther("0.03"),
						ETH_ADDRESS,
						{
							value: ethers.utils.parseEther("0.03"),
						}
					)
			).to.be.revertedWithCustomError(nft, "TotalSupplyLimitReached");
		});

		it("Should correct set new values", async () => {
			const { nft, owner, alice, bob } = await loadFixture(fixture);

			const newPrice = ethers.utils.parseEther("1");
			const newWLPrice = ethers.utils.parseEther("0.1");
			const newPayingToken = bob.address;

			await expect(
				nft.connect(owner).setPayingToken(newPayingToken, newPrice, newWLPrice)
			).to.be.revertedWithCustomError(nft, "Unauthorized");

			await expect(
				nft.connect(alice).setPayingToken(ZERO_ADDRESS, newPrice, newWLPrice)
			).to.be.revertedWithCustomError(nft, "ZeroAddressPasted");

			await nft
				.connect(alice)
				.setPayingToken(newPayingToken, newPrice, newWLPrice);

			const [, info] = await nft.parameters();

			expect(info.payingToken).to.be.equal(newPayingToken);
			expect(info.mintPrice).to.be.equal(newPrice);
			expect(info.whitelistMintPrice).to.be.equal(newWLPrice);
		});

		it("Should mint correctly with erc20 token", async () => {
			const { validator, alice, storage, erc20Example, signer } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";
			const Nft = await ethers.getContractFactory("NFT");
			const nft = await Nft.deploy(
				[storage.address, instanceInfoToken, alice.address],
				validator.address
			);
			await nft.deployed();

			// mint test tokens
			await erc20Example.connect(alice).mint(alice.address, 10000);
			// allow spender(our nft contract) to get our tokens
			await erc20Example
				.connect(alice)
				.approve(nft.address, ethers.constants.MaxUint256);

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
				.mint(
					alice.address,
					0,
					NFT_721_BASE_URI,
					false,
					signature,
					100,
					erc20Example.address
				);
			expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);
		});

		it("Should mint correctly with erc20 token without fee", async () => {
			const { factory, validator, alice, storage, erc20Example, signer, owner } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformCommission(0);

			const NFT_721_BASE_URI = "test.com/";
			const Nft = await ethers.getContractFactory("NFT");
			const nft = await Nft.deploy(
				[storage.address, instanceInfoToken, alice.address],
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
				.mint(
					alice.address,
					0,
					NFT_721_BASE_URI,
					false,
					signature,
					100,
					erc20Example.address
				);
			expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);
			expect(await erc20Example.balanceOf(alice.address)).to.be.deep.equal(
				10000
			);
		});

		it("Should transfer if transferrable", async () => {
			const { factory, validator, alice, storage, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformCommission(0);

			const NFT_721_BASE_URI = "test.com/";
			const Nft = await ethers.getContractFactory("NFT");
			const nft = await Nft.deploy(
				[storage.address, instanceInfoToken, alice.address],
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
				.mint(
					alice.address,
					0,
					NFT_721_BASE_URI,
					false,
					signature,
					100,
					erc20Example.address
				);
			expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);

			await nft.connect(alice).transferFrom(alice.address, bob.address, 0);

			expect(await nft.balanceOf(bob.address)).to.be.deep.equal(1);
		});

		it("Shouldn't transfer if not transferrable", async () => {
			const { factory, validator, alice, storage, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			await factory.connect(owner).setPlatformCommission(0);

			const NFT_721_BASE_URI = "test.com/";
			const Nft = await ethers.getContractFactory("NFT");
			const nft = await Nft.deploy(
				[
					storage.address,
					[
						"InstanceName",
						"INNME",
						"ipfs://tbd",
						erc20Example.address,
						100,
						100,
						false,
						BigNumber.from("1000"),
						BigNumber.from("600"),
						owner.address,
						BigNumber.from("86400"),
						"0x00",
					],
					alice.address,
				],
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
				.mint(
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
			const { validator, alice, storage, erc20Example, signer, owner, bob } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";
			const Nft = await ethers.getContractFactory("NFT");
			const nft = await Nft.deploy(
				[
					storage.address,
					[
						"InstanceName",
						"INNME",
						"ipfs://tbd",
						erc20Example.address,
						ethers.utils.parseEther("100"),
						ethers.utils.parseEther("50"),
						true,
						BigNumber.from("1000"),
						BigNumber.from("600"),
						owner.address,
						BigNumber.from("86400"),
						"0x00",
					],
					bob.address,
				],
				validator.address
			);
			await nft.deployed();

			// mint test tokens
			await erc20Example
				.connect(alice)
				.mint(alice.address, ethers.utils.parseEther("100"));
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
				.mint(
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
			const { alice, nft } = await loadFixture(fixture);

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
				nft.connect(alice).mint(
					alice.address,
					1,
					NFT_721_BASE_URI,
					false,
					bad_signature,
					ethers.utils.parseEther("0.03"),
					ETH_ADDRESS,
					{ value: ethers.utils.parseEther("0.03"), }
				)
			).to.be.revertedWithCustomError(nft, "InvalidSignature");
		});

		it("Should fail with wrong mint price", async () => {
			const { alice, nft, signer } = await loadFixture(fixture);

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
				nft.connect(alice).mint(
					alice.address,
					0,
					NFT_721_BASE_URI,
					false,
					signature,
					ethers.utils.parseEther("0.02"),
					ETH_ADDRESS,
					{ value: ethers.utils.parseEther("0.02"), }
				)
			).to.be.revertedWithCustomError(nft, "PriceChanged").withArgs(ethers.utils.parseEther("0.02"), eth_price);

			await expect(
				nft.connect(alice).mint(
					alice.address,
					0,
					NFT_721_BASE_URI,
					false,
					signature,
					ethers.utils.parseEther("0.02"),
					ETH_ADDRESS,
				)
			).to.be.revertedWithCustomError(nft, "PriceChanged").withArgs(ethers.utils.parseEther("0.02"), eth_price);
		});

		it("Should fail with 0 acc balance erc20", async () => {
			const { alice, signer, storage, validator, erc20Example } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/";
			const Nft = await ethers.getContractFactory("NFT");
			const nft = await Nft.deploy(
				[storage.address, instanceInfoToken, alice.address],
				validator.address
			);
			await nft.deployed();

			await erc20Example.connect(alice).approve(nft.address, 99999999999999);

			const message = EthCrypto.hash.keccak256([
				{ type: "address", value: alice.address },
				{ type: "uint256", value: 1 },
				{ type: "string", value: NFT_721_BASE_URI },
				{ type: "bool", value: false },
				{ type: "uint256", value: chainId },
			]);

			const signature = EthCrypto.sign(signer.privateKey, message);

			await expect(
				nft.connect(alice).mint(
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
			const { alice, signer, nft } = await loadFixture(fixture);

			const NFT_721_BASE_URI = "test.com/1";

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
				.mint(
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
			expect(await nft.tokenURI(0)).to.be.deep.equal(NFT_721_BASE_URI);
		});
	});

	describe("Withdraw test", async () => {
		it("Should withdraw all funds when contract has 0 comission", async () => {
			const { alice, signer, storage, validator, factory, owner } = await loadFixture(fixture);

			const Nft = await ethers.getContractFactory("NFT");
			const nft = await Nft.deploy(
				[storage.address, instanceInfoETH, alice.address],
				validator.address
			);
			await nft.deployed();
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

			await nft
				.connect(alice)
				.mint(
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
			const { alice, signer, storage, validator, factory, owner, bob } = await loadFixture(fixture);

			const Nft = await ethers.getContractFactory("NFT");
			const nft = await Nft.deploy(
				[storage.address, instanceInfoETH, alice.address],
				validator.address
			);
			await nft.deployed();

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

			await nft
				.connect(bob)
				.mint(
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
			const { alice, signer, storage, validator, erc20Example, factory, owner, bob } = await loadFixture(fixture);

			const Nft = await ethers.getContractFactory("NFT");
			const nft = await Nft.deploy(
				[storage.address, instanceInfoETH, alice.address],
				validator.address
			);
			await nft.deployed();

			const RoyaltiesReceiver =
				await ethers.getContractFactory("RoyaltiesReceiver");
			const receiver = await RoyaltiesReceiver.deploy(
				[await factory.platformAddress(), alice.address],
				[1, 5]
			);
			await receiver.deployed();

			expect(await nft.owner()).to.be.equal(alice.address);

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

			await nft
				.connect(bob)
				.mint(
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
				.connect(owner)
				.mint(receiver.address, ethers.utils.parseEther("1"));

			await receiver.connect(bob)["releaseAll(address)"](erc20Example.address);

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
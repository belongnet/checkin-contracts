import { ethers } from 'hardhat';
import { loadFixture, } from "@nomicfoundation/hardhat-network-helpers";
import { ContractFactory } from "ethers";
import { expect } from "chai";
import { WETHMock, RoyaltiesReceiver } from "../typechain-types";

describe("RoyaltiesReceiver", () => {
	const PLATFORM_COMISSION = "100";
	const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
	const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
	const chainId = 31337;

	async function fixture() {
		const [owner, alice, bob, charlie] = await ethers.getSigners();

		const RoyaltiesReceiver: ContractFactory =
			await ethers.getContractFactory("RoyaltiesReceiver");
		const receiver: RoyaltiesReceiver = await RoyaltiesReceiver.deploy(
			[owner.address, alice.address],
			[3000, 7000]
		) as RoyaltiesReceiver;
		await receiver.deployed();

		const Erc20Example: ContractFactory = await ethers.getContractFactory("WETHMock");
		const erc20Example: WETHMock = await Erc20Example.deploy() as WETHMock;
		await erc20Example.deployed()

		return { receiver, erc20Example, owner, alice, bob, charlie, RoyaltiesReceiver };
	}

	it("should correct initialize", async () => {
		const { RoyaltiesReceiver, alice, owner } = await loadFixture(fixture);

		await expect(
			RoyaltiesReceiver.deploy(
				[ZERO_ADDRESS, alice.address],
				[3000, 7000]
			)
		).to.be.revertedWithCustomError(RoyaltiesReceiver, 'ZeroAddressPassed');

		await expect(
			RoyaltiesReceiver.deploy([owner.address, alice.address], [0, 7000])
		).to.be.revertedWithCustomError(RoyaltiesReceiver, 'ZeroSharesPassed');

		await expect(
			RoyaltiesReceiver.deploy(
				[alice.address, alice.address],
				[3000, 7000]
			)
		).to.be.reverted;
	});

	describe("Receiver tests", () => {
		it("shouldn't release if no funds", async () => {
			const { erc20Example, receiver, owner } = await loadFixture(fixture);

			await expect(receiver.connect(owner)["releaseAll()"]()).to.be.revertedWithCustomError(receiver, 'AccountNotDuePayment');
			await expect(
				receiver.connect(owner)["releaseAll(address)"](erc20Example.address)
			).to.be.revertedWithCustomError(receiver, 'AccountNotDuePayment');
		});

		it("should correct deploy Receiver instance", async () => {
			const { receiver, alice, owner } = await loadFixture(fixture);

			expect(await receiver.payees(0)).to.be.equal(owner.address);
			expect(await receiver.payees(1)).to.be.equal(alice.address);
			expect(await receiver.shares(owner.address)).to.be.equal(3000);
			expect(await receiver.shares(alice.address)).to.be.equal(7000);
			expect(await receiver.totalShares()).to.be.equal(10000);
		});
	});
});

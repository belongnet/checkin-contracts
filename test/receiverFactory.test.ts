import { ethers } from 'hardhat';
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { ContractFactory } from "ethers";
import { expect } from "chai";
import { ReceiverFactory, } from "../typechain-types";

describe("ReceiverFactory", () => {

  async function fixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();

    const ReceiverFactory: ContractFactory =
      await ethers.getContractFactory("ReceiverFactory");
    const receiverFactory: ReceiverFactory = await ReceiverFactory.deploy() as ReceiverFactory;
    await receiverFactory.deployed();

    return { receiverFactory, owner, alice, bob, charlie };
  }

  it("should correct deploy Receiver instance", async () => {
    const { receiverFactory, alice, owner } = await loadFixture(fixture);

    let tx = await receiverFactory.deployReceiver(
      [owner.address, alice.address],
      [3000, 7000]
    );

    let receipt = (await tx.wait()).events!;

    const receiverAddress = receipt[2].args!.royaltiesReceiver;

    const receiver = await ethers.getContractAt(
      "RoyaltiesReceiver",
      receiverAddress
    );

    expect(await receiver.payee(0)).to.be.equal(owner.address);
    expect(await receiver.payee(1)).to.be.equal(alice.address);
    expect(await receiver.shares(owner.address)).to.be.equal(3000);
    expect(await receiver.shares(alice.address)).to.be.equal(7000);
    expect(await receiver.totalShares()).to.be.equal(10000);
  });
});


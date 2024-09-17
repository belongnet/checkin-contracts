const { solidity } = require("ethereum-waffle");
const chai = require("chai");
chai.use(solidity);
chai.use(require("chai-bignumber")());
const { expect } = chai;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("Receiver tests", () => {
  let RoyaltiesReceiverFactory;
  let receiver;

  let owner, alice, bob, charlie;

  beforeEach(async () => {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    RoyaltiesReceiverFactory =
      await ethers.getContractFactory("RoyaltiesReceiver");

    receiver = await RoyaltiesReceiverFactory.deploy(
      [owner.address, alice.address],
      [3000, 7000]
    );
    await receiver.deployed();
  });

  it("should correct initialize", async () => {
    await expect(
      RoyaltiesReceiverFactory.deploy(
        [ZERO_ADDRESS, alice.address],
        [3000, 7000]
      )
    ).to.be.reverted;
    await expect(
      RoyaltiesReceiverFactory.deploy([owner.address, alice.address], [0, 7000])
    ).to.be.reverted;
    await expect(
      RoyaltiesReceiverFactory.deploy(
        [alice.address, alice.address],
        [3000, 7000]
      )
    ).to.be.reverted;
  });

  describe("Receiver tests", () => {
    it("shouldn't release if no funds", async () => {
      const Erc20Example = await ethers.getContractFactory("erc20Example");
      const erc20Example = await Erc20Example.deploy();

      await expect(receiver.connect(owner)["releaseAll()"]()).to.be.reverted;
      await expect(
        receiver.connect(owner)["releaseAll(address)"](erc20Example.address)
      ).to.be.reverted;
    });
  });
});

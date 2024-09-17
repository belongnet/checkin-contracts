const { solidity } = require("ethereum-waffle");
const chai = require("chai");
chai.use(solidity);
chai.use(require("chai-bignumber")());
const { expect } = chai;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe("Storage tests", () => {
  let storage;

  let owner, alice, bob, charlie;

  beforeEach(async () => {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    const StorageContract = await ethers.getContractFactory("StorageContract");

    storage = await StorageContract.deploy();
  });

  it("check if the contract is empty", async () => {
    await expect(storage.connect(owner).getInstanceInfo(0)).to.be.reverted;

    await expect(storage.instances()).to.be.reverted;
  });

  it("shouldn't add instance if not factory", async () => {
    await expect(
      storage
        .connect(owner)
        .addInstance(ZERO_ADDRESS, owner.address, "name", "symbol")
    ).to.be.reverted;
  });

  it("shouldn't set factory if zero", async () => {
    await expect(storage.connect(owner).setFactory(ZERO_ADDRESS)).to.be
      .reverted;
  });
});

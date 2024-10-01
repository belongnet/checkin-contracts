import { ethers } from 'hardhat';
import { loadFixture, } from "@nomicfoundation/hardhat-network-helpers";
import { ContractFactory } from "ethers";
import { expect } from "chai";
import { StorageContract } from "../typechain-types";

describe.skip("Storage", () => {
  const PLATFORM_COMISSION = "100";
  const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const chainId = 31337;

  async function fixture() {
    const [owner, alice, bob, charlie] = await ethers.getSigners();

    const StorageContract: ContractFactory = await ethers.getContractFactory("StorageContract");
    const storage: StorageContract = await StorageContract.deploy() as StorageContract;
    await storage.deployed();

    return { storage, owner, alice, bob, charlie };
  }

  it("check if the contract is empty", async () => {
    const { storage, owner } = await loadFixture(fixture);
    await expect(storage.connect(owner).getInstanceInfo(0)).to.be.reverted;

    await expect(storage.instances(0)).to.be.reverted;
  });

  it("shouldn't add instance if not factory", async () => {
    const { storage, owner } = await loadFixture(fixture);

    await expect(
      storage
        .connect(owner)
        .addInstance(ZERO_ADDRESS, owner.address, "name", "symbol")
    ).to.be.revertedWithCustomError(storage, 'OnlyFactory');
  });

  it("shouldn't change factory by non owner", async () => {
    const { storage, alice } = await loadFixture(fixture);

    await expect(
      storage.connect(alice)
        .setFactory(alice.address)
    ).to.be.revertedWithCustomError(storage, 'Unauthorized');
  });

  it("shouldn't set factory if zero", async () => {
    const { storage, owner } = await loadFixture(fixture);

    await expect(storage.connect(owner).setFactory(ZERO_ADDRESS)).to.be
      .revertedWithCustomError(storage, 'ZeroAddressPasted');
  });
});


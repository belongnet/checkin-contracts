import { ethers, upgrades } from "hardhat";
import { ContractFactory } from "ethers";
import { PricePointFactory } from "../../typechain-types";

const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const signer = "0x5f2BFF1c2D15BA78A9B8F4817Ea3Eb48b2033aDc"; //"0x29DD1A766E3CD887DCDBD77506e970cC981Ee91b";
const platformAddress = "0x8eE651E9791e4Fe615796303F48856C1Cf73C885"; //0x29DD1A766E3CD887DCDBD77506e970cC981Ee91b

async function deploy() {
  console.log("Deploying:");

  console.log("PricePointFactory:");
  const PricePointFactory: ContractFactory = await ethers.getContractFactory("PricePointFactory");

  const factory: PricePointFactory = await upgrades.deployProxy(PricePointFactory, [
    ETH_ADDRESS,
    signer,
    platformAddress
  ]) as PricePointFactory;
  await factory.deployed();

  console.log("Deployed to:", factory.address);

  console.log("Done.");
}

deploy();

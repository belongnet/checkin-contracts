import { ethers, upgrades } from "hardhat";
import { ContractFactory } from "ethers";
import { MockTransferValidator, NFTFactory, ReceiverFactory, StorageContract } from "../typechain-types";

async function deploy() {
  console.log("Deploying:");

  console.log("StorageContract:");
  const Storage: ContractFactory = await ethers.getContractFactory("StorageContract");
  const storage: StorageContract = await Storage.deploy() as StorageContract;
  await storage.deployed();
  console.log("Deployed to: ", storage.address);

  console.log("TransferValidator:");
  const Validator: ContractFactory = await ethers.getContractFactory("MockTransferValidator");
  const validator: MockTransferValidator = await Validator.deploy(true) as MockTransferValidator;
  await validator.deployed();
  console.log("Deployed to: ", validator.address);

  console.log("NFTFactory:");
  const NFTFactory: ContractFactory = await ethers.getContractFactory("NFTFactory");

  const signer = "0x5f2BFF1c2D15BA78A9B8F4817Ea3Eb48b2033aDc"; //"0x29DD1A766E3CD887DCDBD77506e970cC981Ee91b";
  const platformAddress = "0x8eE651E9791e4Fe615796303F48856C1Cf73C885"; //0x29DD1A766E3CD887DCDBD77506e970cC981Ee91b
  const platformCommission = "200";

  const nftFactory: NFTFactory = await upgrades.deployProxy(NFTFactory, [
    signer,
    platformAddress,
    platformCommission,
    storage.address,
    validator.address,
  ]) as NFTFactory;
  await nftFactory.deployed();

  await storage.setFactory(nftFactory.address);
  console.log("Deployed to:", nftFactory.address);

  console.log("ReceiverFactory:");
  const ReceiverFactory: ContractFactory = await ethers.getContractFactory("ReceiverFactory");
  const receiverFactory: ReceiverFactory = await ReceiverFactory.deploy() as ReceiverFactory;
  await receiverFactory.deployed();
  console.log("Deployed to: ", receiverFactory.address);

  console.log("Done.");
}

deploy();

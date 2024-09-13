const { ethers, upgrades } = require("hardhat");

async function deploy() {
  console.log("Deploying:");

  console.log("StorageContract:");
  const Storage = await ethers.getContractFactory("StorageContract");
  const storage = await Storage.deploy();
  await storage.deployed();
  console.log("Deployed to: ", storage.address);

  console.log("TransferValidator:");
  const Validator = await ethers.getContractFactory("MockTransferValidator");
  const validator = await Validator.deploy(true);
  await validator.deployed();
  console.log("Deployed to: ", validator.address);

  console.log("NFTFactory:");
  const NFTFactory = await ethers.getContractFactory("NFTFactory");

  const signer = "0x5f2BFF1c2D15BA78A9B8F4817Ea3Eb48b2033aDc"; //"0x29DD1A766E3CD887DCDBD77506e970cC981Ee91b";
  const platformAddress = "0x8eE651E9791e4Fe615796303F48856C1Cf73C885"; //0x29DD1A766E3CD887DCDBD77506e970cC981Ee91b
  const platformCommission = "200";

  const nftFactory = await upgrades.deployProxy(NFTFactory, [
    signer,
    platformAddress,
    platformCommission,
    storage.address,
    validator.address,
  ]);
  await nftFactory.deployed();

  await storage.setFactory(nftFactory.address);
  console.log("Deployed to:", nftFactory.address);

  console.log("ReceiverFactory:");
  const ReceiverFactory = await ethers.getContractFactory("ReceiverFactory");
  const receiverFactory = await ReceiverFactory.deploy();
  await receiverFactory.deployed();
  console.log("Deployed to: ", receiverFactory.address);

  console.log("Done.");
}

deploy();

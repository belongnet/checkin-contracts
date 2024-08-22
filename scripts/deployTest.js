const { ethers, upgrades } = require("hardhat");

async function deploy_nft() {
  const NFTFactory = await ethers.getContractFactory("NFTFactory");
  const ReceiverFactory = await ethers.getContractFactory("ReceiverFactory");
  const Storage = await ethers.getContractFactory("StorageContract");
  const NFT = await ethers.getContractFactory("NFT");

  console.log("Deploying Storage Contract...");
  const storage = await Storage.deploy();
  console.log("Done");

  const signer = "0xc204d8492670fC59b946048df140838fdF14D323";
  const platformAddress = "0xc204d8492670fC59b946048df140838fdF14D323";
  const platformCommission = "1";

  console.log("Deploying NFTFactory...");
  const factory = await NFTFactory.deploy();
  await factory.deployed();
  console.log("Done");
  console.log("Deploying Receiver NFTFactory...");

  const receiverFactory = await ReceiverFactory.deploy();
  await receiverFactory.deployed();

  console.log("Done");
  console.log("Initializing NFTFactory...");

  await factory.initialize(
    signer,
    platformAddress,
    platformCommission,
    storage.address
  );

  console.log("Done");
  console.log("Initializing NFTFactory...");

  await storage.deployed();
  await storage.setFactory(factory.address);
  console.log("Done");

  // await nft.deployed();

  // await nft.initialize(
  //   storage.address,
  //   "0x528e7c77B8F3001B512e8BF305b03CeA420951cd",
  //   "0",
  //   "https://someUri",
  //   "some name",
  //   "SN"
  // );

  console.log("NFTFactory deployed to:", factory.address);
  console.log("Receiver NFTFactory deployed to:", receiverFactory.address);
  console.log("Storage deployed to:", storage.address);
  // console.log('NFT deployed to:', nft.address);
}

deploy_nft();

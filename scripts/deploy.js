const { ethers } = require("hardhat");

async function deploy() {
  console.log("1. Deploying:");

  console.log("StorageContract:");
  const Storage = await ethers.getContractFactory("StorageContract");
  const storage = await Storage.deploy();
  await storage.deployed();
  console.log("Deployed to: ", storage.address);

  console.log("NFTFactory:");
  const signer = "0x284EB52525B5A43b4f590Fc321A6117332EAB414";
  const platformAddress = "0x8eE651E9791e4Fe615796303F48856C1Cf73C885";
  const platformCommission = "100";

  const NFTFactory = await ethers.getContractFactory("NFTFactory");
  const nftFactory = await NFTFactory.deploy();
  await nftFactory.deployed();
  console.log("Deployed to:", nftFactory.address);

  console.log("ReceiverFactory:");
  const ReceiverFactory = await ethers.getContractFactory("ReceiverFactory");
  const receiverFactory = await ReceiverFactory.deploy();
  await receiverFactory.deployed();
  console.log("Deployed to: ", receiverFactory.address);

  console.log("2. Initializing:");

  console.log("NFTFactory:");
  await nftFactory.initialize(
    signer,
    platformAddress,
    platformCommission,
    storage.address
  );
  console.log("Done.");

  console.log("StorageContract:");
  await storage.setFactory(factory.address);
  console.log("Done.");
}

deploy();


const { ethers, upgrades } = require('hardhat');

async function deploy_nft() {
  const Factory = await ethers.getContractFactory('Factory');
  const ReceiverFactory = await ethers.getContractFactory('ReceiverFactory');
  const Storage = await ethers.getContractFactory('StorageContract');

  console.log('Deploying Storage Contract...');
  const storage = await Storage.deploy();
  console.log('Done');
  
  const signer = "0x284EB52525B5A43b4f590Fc321A6117332EAB414";
  const platformAddress = "0x8eE651E9791e4Fe615796303F48856C1Cf73C885";
  const platformCommission = "100"; 

  console.log('Deploying Factory...');
  const factory = await Factory.deploy();
  await factory.deployed();
  console.log('Done');
  console.log('Deploying Receiver Factory...');

  const receiverFactory = await ReceiverFactory.deploy();
  await receiverFactory.deployed();

  console.log('Done');
  console.log('Initializing Factory...');

  await factory.initialize(
    signer,
    platformAddress,
    platformCommission,
    storage.address
  );

  console.log('Done');
  console.log('Initializing Factory...');
  
  await storage.deployed();
  await storage.setFactory(factory.address);
  console.log('Done');


  console.log('Factory deployed to:', factory.address);
  console.log('Receiver Factory deployed to:', receiverFactory.address);
  console.log('Storage deployed to:', storage.address);

  
}

deploy_nft();

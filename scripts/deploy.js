
const { ethers, upgrades } = require('hardhat');

async function deploy_nft() {
  const Factory = await ethers.getContractFactory('Factory');
  const ReceiverFactory = await ethers.getContractFactory('ReceiverFactory');
  const Storage = await ethers.getContractFactory('StorageContract');

  console.log('Deploying Storage Contract...');
  const storage = await Storage.deploy();
  console.log('Done');
  
  const signer = "0x16A518954cFC3Cb1D4eEf128bAb53C3706A0c454";
  const platformAddress = "0x16A518954cFC3Cb1D4eEf128bAb53C3706A0c454";
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

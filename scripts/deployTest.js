
const { ethers, upgrades } = require('hardhat');

async function deploy_nft() {
  const Factory = await ethers.getContractFactory('Factory');
  const Storage = await ethers.getContractFactory('StorageContract');
  const NFT = await ethers.getContractFactory('NFT');
  const storage = await Storage.deploy();
  const nft = await NFT.deploy();
  
  const signer = "0xc204d8492670fC59b946048df140838fdF14D323";
  const platformAddress = "0xc204d8492670fC59b946048df140838fdF14D323";
  const platformCommission = "15";

  const factory = await Factory.deploy();
  await factory.deployed();
  await factory.initialize(
    signer,
    platformAddress,
    platformCommission,
    storage.address
  );
  
  await storage.deployed();
  await storage.setFactory(factory.address);

  await nft.deployed();

  await nft.initialize(
    storage.address,
    "0x528e7c77B8F3001B512e8BF305b03CeA420951cd",
    "0",
    "https://someUri",
    "some name",
    "SN"
  );

  console.log('Factory deployed to:', factory.address);
  console.log('Storage deployed to:', storage.address);
  console.log('NFT deployed to:', nft.address);

  
}

deploy_nft();


const { ethers, upgrades } = require('hardhat');

async function deploy_nft() {
  const Factory = await ethers.getContractFactory('Factory');
  const Storage = await ethers.getContractFactory('StorageContract');
  const storage = await Storage.deploy();
  
  const signer = "0x528e7c77B8F3001B512e8BF305b03CeA420951cd";
  const platformAddress = "0x528e7c77B8F3001B512e8BF305b03CeA420951cd";
  const platformCommission = "10";

  const factory = await upgrades.deployProxy(Factory,
    [ signer,
      platformAddress,
      platformCommission,
      storage.address
    ], {
      initializer: 'initialize'
    });
  
  await factory.deployed();
  await storage.deployed();

  console.log('Factory deployed to:', factory.address);
  console.log('Storage deployed to:', storage.address);
}

deploy_nft();

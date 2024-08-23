const { ethers } = require("hardhat");

async function deploy_nft() {
  const NFT = await ethers.getContractFactory("ERC721Mock");
  const nft = await NFT.deploy();
  await nft.deployed();

  await nft.initialize("MyToken721", "MT721", "ipfs://tbd/");

  console.log(nft.address);
}

deploy_nft();

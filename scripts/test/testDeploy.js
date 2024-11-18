const { ethers } = require("hardhat");

async function deploy_nft() {
  try {
    const NFT = await ethers.getContractFactory("ERC721Mock");
    const nft = await NFT.deploy();
    await nft.deployed();

    const ipfsUrl = "ipfs://tbd/"; // TODO: Parameterize or document this URL
    await nft.initialize("MyToken721", "MT721", ipfsUrl);

    console.log(nft.address);
    console.log("Deployment successful.");
  } catch (error) {
    console.error("Deployment failed:", error);
  }
}

deploy_nft();

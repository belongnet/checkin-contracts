import { ethers } from "hardhat";
import { ContractFactory } from "ethers";
import { NFTV2 as NFT } from "../../typechain-types";
import dotenv from "dotenv";
dotenv.config();

async function deploy() {
  console.log("Deploying:");

  console.log("NFT:");
  const NFT: ContractFactory = await ethers.getContractFactory("NFTV2");
  const nft: NFT = await NFT.deploy(
    {
      transferValidator: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      factory: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      creator: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      feeReceiver: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      referralCode: '0x0000000000000000000000000000000000000000000000000000000000000000',
      info: {
        metadata: {
          name: 'NFT',
          symbol: 'NFT',
        },
        payingToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        feeNumerator: Number(0),
        transferable: false,
        maxTotalSupply: Number(0),
        mintPrice: Number(0),
        whitelistMintPrice: Number(0),
        collectionExpire: Number(0),
        contractURI: '0000',
        signature: '0x7698e843a10f030c70588cf485a6aed9f2fb1dcfbf78eeab0c92ea114ff1ac511b003b0724da54f0aa172b88bc19826d88333770559a86ab9b2a1199e44a152d1b'
      }
    },
  ) as NFT;
  await nft.deployed();

  console.log("Deployed to:", nft.address);
  console.log("Done.");
}

deploy();
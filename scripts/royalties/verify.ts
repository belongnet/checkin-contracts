import { verifyContract } from "../helpers/verify";
import { InstanceInfoStruct, NftParametersStruct } from "../../typechain-types/contracts/nft-with-royalties/NFT";
import { ethers } from "hardhat";

// AMOY
const NFTFactory_Address = "0x100FEb2D822CBb32C4e8f047D43615AC8851Ed79"; //"0x4F6dD6D2218F1b1675F6314e3e3fDF6BB8d24D26";
const ReceiverFactory_Address = "0x9e3743dEC51b82BD83d7fF7557650BF1C75ee096"; //"0xfb2668b47f93b168ef99EA95d28bd31dB723ad79";
const TransferValidator_Address = "0x935AaAE808d09C2BDf6840bB85dB9eC7c82fBA7c"; //"0xDD001eb79ce6aa03d79C3C510CFb8CB16C89d8A7";

const receiver_address = "0x01ea4029de725502907de311d84324572641a794";
const nft_address = '0x5f8e6669a0cd06b9797b4ea285f9fc6b5cb58115';

async function verify() {
  console.log("Verification: ");

  try {
    verifyContract(NFTFactory_Address);
    console.log("NFTFactory verification successful.");
  } catch (error) {
    console.error("NFTFactory verification failed:", error);
  }

  try {
    verifyContract(ReceiverFactory_Address);
    console.log("ReceiverFactory verification successful.");
  } catch (error) {
    console.error("ReceiverFactory verification failed:", error);
  }

  try {
    verifyContract(TransferValidator_Address, [true]);
    console.log("ReceiverFactory verification successful.");
  } catch (error) {
    console.error("ReceiverFactory verification failed:", error);
  }

  // const info: InstanceInfoStruct = {
  //   name: "Blast New Smart",
  //   symbol: "blast-new-smart",
  //   contractURI: "https://foster-images.s3.us-east-1.amazonaws.com/up/assets/nft/blast-new-smart/blast-new-smart.json",
  //   payingToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
  //   mintPrice: 10000000000000000n,
  //   whitelistMintPrice: 10000000000000000n,
  //   transferable: true,
  //   maxTotalSupply: 9999,
  //   feeNumerator: 1000,
  //   feeReceiver: receiver_address,
  //   collectionExpire: 1730330820,
  //   signature: '0x8a77ebcde14ae25b6eeb640139ef1865e7d8b8be95d2b1b7d7e9d1f427da22a21fd852ff63ff6c20260ba5393c92c7e2905696fab0ffe972a64b74b8541d7a861b'
  // }

  // const params: NftParametersStruct = {
  //   transferValidator: TransferValidator_Address,
  //   factory: NFTFactory_Address,
  //   info,
  //   creator: '0x192De36d0A4a23FE101a38a3722557113a8e7F77',
  //   referralCode: ethers.constants.HashZero,
  // }

  // try {
  //   verifyContract(nft_address, [params]);
  //   console.log("NFT verification successful.");
  // } catch (error) {
  //   console.error("NFT verification failed:", error);
  // }

  // const payees = ['0x8eE651E9791e4Fe615796303F48856C1Cf73C885', '0x192De36d0A4a23FE101a38a3722557113a8e7F77'];
  // const shares = [2000, 8000];

  // try {
  //   verifyContract(receiver_address, [payees, shares]);
  //   console.log("Receiver verification successful.");
  // } catch (error) {
  //   console.error("Receiververification failed:", error);
  // }

  console.log("Done.");
}

verify();

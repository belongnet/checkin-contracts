import { verifyContract } from "../helpers/verify";
import { InstanceInfoStruct, NftParametersStruct } from "../../typechain-types/contracts/nft-with-royalties/NFT";
import { ethers } from "hardhat";

// AMOY
const NFTFactory_Address = "0x100FEb2D822CBb32C4e8f047D43615AC8851Ed79"; //"0x4F6dD6D2218F1b1675F6314e3e3fDF6BB8d24D26";
const ReceiverFactory_Address = "0x9e3743dEC51b82BD83d7fF7557650BF1C75ee096"; //"0xfb2668b47f93b168ef99EA95d28bd31dB723ad79";
const TransferValidator_Address = "0x935AaAE808d09C2BDf6840bB85dB9eC7c82fBA7c"; //"0xDD001eb79ce6aa03d79C3C510CFb8CB16C89d8A7";

const receiver_address = "0xeee1ee6a66c4b27f4dd841d79356eb124e243ff4";
const nft_address = '0xc1725524e6a47473259ac0b0efe8fad7e74264ee';

async function verify() {
  console.log("Verification: ");

  // try {
  //   await verifyContract(NFTFactory_Address);
  //   console.log("NFTFactory verification successful.");
  // } catch (error) {
  //   console.error("NFTFactory verification failed:", error);
  // }

  // try {
  //   await verifyContract(ReceiverFactory_Address);
  //   console.log("ReceiverFactory verification successful.");
  // } catch (error) {
  //   console.error("ReceiverFactory verification failed:", error);
  // }

  // try {
  //   await verifyContract(TransferValidator_Address, [true]);
  //   console.log("ReceiverFactory verification successful.");
  // } catch (error) {
  //   console.error("ReceiverFactory verification failed:", error);
  // }

  const info: InstanceInfoStruct = {
    name: "Event Amoy USDC Nomad Token",
    symbol: "	event-amoy-usdc-nomad-token",
    contractURI: "https://foster-images.s3.us-east-1.amazonaws.com/up/assets/nft/event-amoy-usdc-nomad-token/event-amoy-usdc-nomad-token.json",
    payingToken: '0x14196F08a4Fa0B66B7331bC40dd6bCd8A1dEeA9F',
    mintPrice: 100000n,
    whitelistMintPrice: 1000n,
    transferable: true,
    maxTotalSupply: 300,
    feeNumerator: 1000,
    feeReceiver: receiver_address,
    collectionExpire: 1732215780,
    signature: '0xfdcf6642bcc6ed43e68f76ea9d78f1000a94ef4f05770fa3807aed04962468da7e0e77b3432c0e1cc605b9c36e4bb244209b9ad1f7d3099a769bfc4cac42f1641b'
  }

  const params: NftParametersStruct = {
    transferValidator: TransferValidator_Address,
    factory: NFTFactory_Address,
    info,
    creator: '0x192De36d0A4a23FE101a38a3722557113a8e7F77',
    referralCode: ethers.constants.HashZero,
  }

  try {
    await verifyContract(nft_address, [params]);
    console.log("NFT verification successful.");
  } catch (error) {
    console.error("NFT verification failed:", error);
  }

  // const payees = ['0x8eE651E9791e4Fe615796303F48856C1Cf73C885', '0x192De36d0A4a23FE101a38a3722557113a8e7F77'];
  // const shares = [2000, 8000];

  // try {
  //   await verifyContract(receiver_address, [payees, shares]);
  //   console.log("Receiver verification successful.");
  // } catch (error) {
  //   console.error("Receiververification failed:", error);
  // }

  console.log("Done.");
}

verify();

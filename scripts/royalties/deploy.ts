import { ethers, upgrades } from "hardhat";
import { ContractFactory } from "ethers";
import { MockTransferValidator, NFTFactory, ReceiverFactory } from "../../typechain-types";
import { NftFactoryParametersStruct, ReferralPercentagesStruct } from "../../typechain-types/contracts/factories/NFTFactory";

const signer = "0x5f2BFF1c2D15BA78A9B8F4817Ea3Eb48b2033aDc"; //"0x29DD1A766E3CD887DCDBD77506e970cC981Ee91b";
const platformAddress = "0x8eE651E9791e4Fe615796303F48856C1Cf73C885"; //0x29DD1A766E3CD887DCDBD77506e970cC981Ee91b
const platformCommission = "200";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";


async function deploy() {
  console.log("Deploying:");

  // console.log("TransferValidator:");
  // const Validator: ContractFactory = await ethers.getContractFactory("MockTransferValidator");
  // const validator: MockTransferValidator = await Validator.deploy(true) as MockTransferValidator;
  // await validator.deployed();
  // console.log("Deployed to: ", validator.address);

  const validator = '0x935AaAE808d09C2BDf6840bB85dB9eC7c82fBA7c';
  const nftInfo = {
    transferValidator: validator,
    platformAddress: platformAddress,
    signerAddress: signer,
    platformCommission,
    defaultPaymentCurrency: ETH_ADDRESS,
    maxArraySize: 20
  } as NftFactoryParametersStruct;

  const referralPercentages = {
    initialPercentage: 5000,
    secondTimePercentage: 3000,
    thirdTimePercentage: 1500,
    percentageByDefault: 500
  } as ReferralPercentagesStruct;

  console.log("NFTFactory:");
  const NFTFactory: ContractFactory = await ethers.getContractFactory("NFTFactory");
  const factory: NFTFactory = await upgrades.deployProxy(NFTFactory, [
    referralPercentages,
    nftInfo,
  ]) as NFTFactory;
  await factory.deployed();

  console.log("Deployed to:", factory.address);

  console.log("ReceiverFactory:");
  const ReceiverFactory: ContractFactory = await ethers.getContractFactory("ReceiverFactory");
  const receiverFactory: ReceiverFactory = await ReceiverFactory.deploy() as ReceiverFactory;
  await receiverFactory.deployed();
  console.log("Deployed to: ", receiverFactory.address);

  console.log("Done.");
}

deploy();

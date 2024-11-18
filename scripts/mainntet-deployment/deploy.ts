import { ethers, upgrades } from "hardhat";
import { ContractFactory } from "ethers";
import { NFTFactory } from "../../typechain-types";
import { NftFactoryParametersStruct } from "../../typechain-types/contracts/factories/NFTFactory";
import dotenv from "dotenv";
import { checkAddress, checkNumber, defaultParamsCheck } from "../helpers/checkers";
dotenv.config();

const signerAddress = process.env.SIGNER_ADDRESS;
const platformAddress = process.env.PLATFORM_ADDRESS;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

const platformCommission = defaultParamsCheck(process.env.PLATFORM_COMMISSION, 200) as number;
const transferValidator = defaultParamsCheck(process.env.TRANSFER_VALIDATOR, ZERO_ADDRESS) as string;
const defaultPaymentCurrency = defaultParamsCheck(process.env.PAYMENT_CURRENCY, ETH_ADDRESS) as string;
const maxArraySize = defaultParamsCheck(process.env.MAX_ARRAY_SIZE, 20) as number;

const referralPercentages: number[] = [
  0,
  defaultParamsCheck(process.env.REFERRAL_PERCENT_FIRST_TIME_USAGE, 5000) as number,
  defaultParamsCheck(process.env.REFERRAL_PERCENT_SECOND_TIME_USAGE, 3000) as number,
  defaultParamsCheck(process.env.REFERRAL_PERCENT_THIRD_TIME_USAGE, 1500) as number,
  defaultParamsCheck(process.env.REFERRAL_PERCENT_THIRD_TIME_USAGE, 500) as number
];

async function deploy() {
  console.log("Deploying:");

  checkAddress(signerAddress);
  checkAddress(platformAddress);
  checkNumber(platformCommission);

  checkAddress(transferValidator);
  checkAddress(defaultPaymentCurrency);
  checkNumber(maxArraySize);

  const factoryParams = {
    transferValidator,
    platformAddress,
    signerAddress,
    platformCommission,
    defaultPaymentCurrency,
    maxArraySize
  } as NftFactoryParametersStruct;

  console.log(factoryParams);

  referralPercentages.forEach((number) => {
    checkNumber(number);
    console.log(`Referral percentages: ${number}`);
  });

  console.log("NFTFactory:");
  const NFTFactory: ContractFactory = await ethers.getContractFactory("NFTFactory");
  const factory: NFTFactory = await upgrades.deployProxy(NFTFactory, [
    factoryParams,
    referralPercentages,
  ]) as NFTFactory;
  await factory.deployed();

  console.log("Deployed to:", factory.address);
  console.log("Done.");
}

deploy();
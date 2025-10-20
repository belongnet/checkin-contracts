import { ethers, upgrades } from 'hardhat';
import { ContractFactory } from 'ethers';
import { NFTFactory } from '../../../typechain-types';
import { NftFactoryParametersStruct } from '../../typechain-types/contracts/factories/NFTFactory';
import dotenv from 'dotenv';
import { checkAddress, checkNumber, defaultParamsCheck } from '../../../helpers/checkers';
dotenv.config();

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const platformCommission = 200;
const maxArraySize = 20;

const referralPercentages: number[] = [0, 5000, 3000, 1500, 500];

async function deploy() {
  const [dep] = await ethers.getSigners();
  console.log('Deploying:');

  console.log('TransferValidator:');
  const Validator: ContractFactory = await ethers.getContractFactory('MockTransferValidator');
  const validator: MockTransferValidator = (await Validator.deploy(true)) as MockTransferValidator;
  await validator.deployed();
  console.log('Deployed to: ', validator.address);

  const factoryParams = {
    transferValidator: validator.address,
    platformAddress: dep.address,
    signerAddress: dep.address,
    platformCommission,
    defaultPaymentCurrency: ETH_ADDRESS,
    maxArraySize,
  } as NftFactoryParametersStruct;

  console.log(factoryParams);

  referralPercentages.forEach(number => {
    checkNumber(number);
    console.log(`Referral percentages: ${number}`);
  });

  console.log('NFTFactory:');
  const NFTFactory: ContractFactory = await ethers.getContractFactory('NFTFactory');
  const factory: NFTFactory = (await upgrades.deployProxy(NFTFactory, [factoryParams, referralPercentages], {
    unsafeAllow: ['constructor'],
  })) as NFTFactory;
  await factory.deployed();

  console.log('Deployed to:', factory.address);
  console.log('Done.');
}

deploy();

import { ethers } from 'hardhat';
import { ContractFactory } from 'ethers';
import { LONGPriceFeedMockV3 } from '../../../typechain-types';
import dotenv from 'dotenv';
dotenv.config();

async function deploy() {
  console.log('Deploying:');

  console.log('Pf mock: ');
  const LONGPriceFeedMockV3: ContractFactory = await ethers.getContractFactory('LONGPriceFeedMockV3');
  const pf: LONGPriceFeedMockV3 = (await LONGPriceFeedMockV3.deploy()) as LONGPriceFeedMockV3;
  await pf.deployed();

  console.log('Deployed to:', pf.address);
  console.log('Done.');
}

deploy();

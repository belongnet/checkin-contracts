import dotenv from 'dotenv';
import { ContractFactory } from 'ethers';
import { ethers } from 'hardhat';

import { LONGPriceFeedMockV3 } from '../../../typechain-types';
import { verifyContract } from '../../../helpers/verify';
import fs from 'fs';

dotenv.config();

async function deploy() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }
  deployments.mocks = deployments.mocks || {};

  console.log('Deploying:');

  console.log('Pf mock: ');
  const LONGPriceFeedMockV3: ContractFactory = await ethers.getContractFactory('LONGPriceFeedMockV3');
  const pf: LONGPriceFeedMockV3 = (await LONGPriceFeedMockV3.deploy()) as LONGPriceFeedMockV3;
  await pf.deployed();

  console.log('Deployed to:', pf.address);

  console.log('Verifying mock price feed...');
  try {
    await verifyContract(pf.address);
    console.log('Verification successful.');
  } catch (e) {
    console.error('Verification failed:', e);
  }

  deployments.mocks.longPriceFeed = pf.address;
  fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
  console.log(`Saved mock price feed to ${deploymentFile}`);

  console.log('Done.');
}

deploy();

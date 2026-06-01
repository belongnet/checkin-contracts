import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { deployDualDexSwapV4Lib } from '../../../helpers/deployFixtures';
import { DualDexSwapV4Lib } from '../../../typechain-types';
import { verifyContract } from '../../helpers/verify-contract';

import fs from 'fs';

dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true;
const VERIFY = ENV_VERIFY ?? true;

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

  if (!deployments.libraries) {
    deployments.libraries = {};
  }

  if (DEPLOY) {
    console.log('Deploy DualDexSwapV4Lib: ');

    const previousDualDexSwapV4Lib = deployments.libraries.dualDexSwapV4Lib;

    console.log('Deploying DualDexSwapV4Lib contract...');
    const dualDexSwapV4Lib: DualDexSwapV4Lib = await deployDualDexSwapV4Lib();

    if (previousDualDexSwapV4Lib && previousDualDexSwapV4Lib !== dualDexSwapV4Lib.address) {
      deployments.libraries.dualDexSwapV4LibPrevious = previousDualDexSwapV4Lib;
    }
    deployments.libraries.dualDexSwapV4Lib = dualDexSwapV4Lib.address;

    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed DualDexSwapV4Lib to: ', dualDexSwapV4Lib.address);
    if (previousDualDexSwapV4Lib) {
      console.log('Previous DualDexSwapV4Lib was: ', previousDualDexSwapV4Lib);
    }
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.libraries.dualDexSwapV4Lib) {
        throw new Error('No DualDexSwapV4Lib deployment data found for verification.');
      }
      await verifyContract(deployments.libraries.dualDexSwapV4Lib);
      console.log('DualDexSwapV4Lib verification successful.');
    } catch (error) {
      console.error('DualDexSwapV4Lib verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});

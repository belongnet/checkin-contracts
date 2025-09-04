import { BelongCheckIn } from '../../../typechain-types';
import dotenv from 'dotenv';
import fs from 'fs';
import { verifyContract } from '../../../helpers/verify';
import { ethers } from 'hardhat';
import { deployBelongCheckIn } from '../../../helpers/deployFixtures';

dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true; // <-- ENV_UPGRADE is `false` (not nullish), so UPGRADE=false
const VERIFY = ENV_VERIFY ?? true; // same

async function deploy() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

  // Ensure deployments directory exists
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Initialize deployments object
  let deployments = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  if (DEPLOY) {
    console.log('Deploying BelongCheckIn: ');

    // Read addresses from environment variables

    const owner = process.env.ADMIN_ADDRESS;
    const swapPoolFees = process.env.UNISWAPV3_POOL_FEES;
    const swapV3Router = process.env.UNISWAPV3_ROUTER_ADDRESS;
    const swapV3Quoter = process.env.UNISWAPV3_QUOTER_ADDRESS;
    const weth = process.env.WETH_ADDRESS;
    const usdc = process.env.USDC_ADDRESS;
    const signatureVerifier = deployments.SignatureVerifier.address;
    const helper = deployments.Helper.address;
    const long = deployments.LONG.address;

    // Validate environment variables
    if (
      !signatureVerifier ||
      !helper ||
      !owner ||
      !swapPoolFees ||
      !swapV3Router ||
      !swapV3Quoter ||
      !weth ||
      !usdc ||
      !long
    ) {
      throw new Error(
        'Missing required environment variables: SIGNATURE_VERIFIER_ADDRESS, HELPER_ADDRESS, OWNER_ADDRESS, UNISWAPV3_POOL_FEES, UNISWAPV3_ROUTER_ADDRESS, UNISWAPV3_QUOTER_ADDRESS, WETH_ADDRESS, USDC_ADDRESS, LONG_ADDRESS',
      );
    }

    // Validate addresses (exclude swapPoolFees as it's not an address)
    for (const addr of [signatureVerifier, helper, owner, swapV3Router, swapV3Quoter, weth, usdc, long]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    // Construct paymentsInfo struct
    const paymentsInfo = {
      swapPoolFees,
      swapV3Router,
      swapV3Quoter,
      weth,
      usdc,
      long,
    } as BelongCheckIn.PaymentsInfoStruct;

    console.log('Deploying BelongCheckIn contract...');
    const belongCheckIn: BelongCheckIn = await deployBelongCheckIn(signatureVerifier, helper, owner, paymentsInfo);

    // Update deployments object
    deployments = {
      ...deployments,
      BelongCheckIn: {
        proxy: belongCheckIn.address,
        parameters: [owner, paymentsInfo],
      },
    };

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed BelongCheckIn to: ', belongCheckIn.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.BelongCheckIn?.address) {
        throw new Error('No BelongCheckIn deployment data found for verification.');
      }
      await verifyContract(deployments.BelongCheckIn.address);
      console.log('BelongCheckIn verification successful.');
    } catch (error) {
      console.error('BelongCheckIn verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});

import { BelongCheckIn } from '../../../typechain-types';
import dotenv from 'dotenv';
import fs from 'fs';
import { deployBelongCheckIn } from '../../../test/v2/helpers/deployFixtures';
import { verifyContract } from '../../../helpers/verify';
import { ethers } from 'hardhat';

dotenv.config();

const DEPLOY = true;
const VERIFY = true;

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
    const signatureVerifier = process.env.SIGNATURE_VERIFIER_ADDRESS;
    const helper = process.env.HELPER_ADDRESS;
    const owner = process.env.OWNER_ADDRESS;
    const uniswapPoolFees = process.env.UNISWAPV3_POOL_FEES;
    const uniswapV3Router = process.env.UNISWAPV3_ROUTER_ADDRESS;
    const uniswapV3Quoter = process.env.UNISWAPV3_QUOTER_ADDRESS;
    const weth = process.env.WETH_ADDRESS;
    const usdc = process.env.USDC_ADDRESS;
    const long = process.env.LONG_ADDRESS;

    // Validate environment variables
    if (
      !signatureVerifier ||
      !helper ||
      !owner ||
      !uniswapPoolFees ||
      !uniswapV3Router ||
      !uniswapV3Quoter ||
      !weth ||
      !usdc ||
      !long
    ) {
      throw new Error(
        'Missing required environment variables: SIGNATURE_VERIFIER_ADDRESS, HELPER_ADDRESS, OWNER_ADDRESS, UNISWAPV3_POOL_FEES, UNISWAPV3_ROUTER_ADDRESS, UNISWAPV3_QUOTER_ADDRESS, WETH_ADDRESS, USDC_ADDRESS, LONG_ADDRESS',
      );
    }

    // Validate addresses (exclude uniswapPoolFees as it's not an address)
    for (const addr of [signatureVerifier, helper, owner, uniswapV3Router, uniswapV3Quoter, weth, usdc, long]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    // Validate uniswapPoolFees (assuming it's a number, e.g., 500, 3000, 10000)
    const poolFees = parseInt(uniswapPoolFees, 10);
    if (isNaN(poolFees) || poolFees <= 0) {
      throw new Error(`Invalid Uniswap pool fees: ${uniswapPoolFees}`);
    }

    // Construct paymentsInfo struct
    const paymentsInfo = {
      uniswapPoolFees: poolFees,
      uniswapV3Router,
      uniswapV3Quoter,
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
        address: belongCheckIn.address,
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

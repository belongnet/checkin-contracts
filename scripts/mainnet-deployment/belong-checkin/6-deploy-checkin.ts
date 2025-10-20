import { BelongCheckIn } from '../../../typechain-types';
import dotenv from 'dotenv';
import fs from 'fs';
import { verifyContract } from '../../../helpers/verify';
import { ethers } from 'hardhat';
import { deployBelongCheckIn } from '../../../helpers/deployFixtures';
import { BigNumber } from 'ethers';

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
  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  if (!deployments.checkIn) {
    deployments.checkIn = {};
  }

  if (DEPLOY) {
    console.log('Deploy BelongCheckIn: ');

    // Read addresses from environment variables

    const owner = process.env.ADMIN_ADDRESS;
    const swapPoolFees = process.env.UNISWAPV3_POOL_FEES;
    const swapV3Factory = process.env.UNISWAPV3_FACTORY_ADDRESS;
    const swapV3Router = process.env.UNISWAPV3_ROUTER_ADDRESS;
    const swapV3Quoter = process.env.UNISWAPV3_QUOTER_ADDRESS;
    const wNativeCurrency = process.env.WNATIVE_ADDRESS;
    const usdc = process.env.USDC_ADDRESS;

    // Validate environment variables
    if (
      !deployments.libraries.sigantureVerifier ||
      !deployments.libraries.helper ||
      !owner ||
      !swapPoolFees ||
      !swapV3Factory ||
      !swapV3Router ||
      !swapV3Quoter ||
      !wNativeCurrency ||
      !usdc ||
      !deployments.tokens.long
    ) {
      throw new Error(
        `Missing required environment variables:\nSignatureVerifier: ${deployments.libraries.sigantureVerifier}\nHELPER_ADDRESS: ${deployments.libraries.helper}\nOWNER_ADDRESS: ${owner}\nUNISWAPV3_POOL_FEES: ${swapPoolFees}\nUNISWAPV3_FACTORY_ADDRESS: ${swapV3Factory}\nUNISWAPV3_ROUTER_ADDRESS: ${swapV3Router}\nUNISWAPV3_QUOTER_ADDRESS: ${swapV3Quoter}\nWNATIVE_ADDRESS: ${wNativeCurrency}\nUSDC_ADDRESS: ${usdc}\nLong: ${deployments.tokens.long}`,
      );
    }

    // Validate addresses (exclude swapPoolFees as it's not an address)
    for (const addr of [
      deployments.libraries.sigantureVerifier,
      deployments.libraries.helper,
      owner,
      swapV3Router,
      swapV3Quoter,
      wNativeCurrency,
      usdc,
      deployments.tokens.long,
    ]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    // Construct paymentsInfo struct
    const paymentsInfo = {
      slippageBps: BigNumber.from(10).pow(27).sub(1),
      swapPoolFees,
      swapV3Factory,
      swapV3Router,
      swapV3Quoter,
      wNativeCurrency,
      usdc,
      long: deployments.tokens.long,
      maxPriceFeedDelay: 86_400,
    } as BelongCheckIn.PaymentsInfoStruct;

    console.log('Deploying BelongCheckIn contract...');
    const belongCheckIn: BelongCheckIn = await deployBelongCheckIn(
      deployments.libraries.sigantureVerifier,
      deployments.libraries.helper,
      owner,
      paymentsInfo,
    );

    // Update deployments object
    deployments.checkIn.address = belongCheckIn.address;
    deployments.checkIn.paymentsInfo = paymentsInfo;

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed BelongCheckIn to: ', belongCheckIn.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.checkIn.address) {
        throw new Error('No BelongCheckIn deployment data found for verification.');
      }
      await verifyContract(deployments.checkIn.address);
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

import dotenv from 'dotenv';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

import { deployBelongCheckIn } from '../../../helpers/deployFixtures';
import { encodePcsPoolKey } from '../../../helpers/math';
import { verifyContract } from '../../../helpers/verify';
import { BelongCheckIn } from '../../../typechain-types';
import { DualDexSwapV4Lib } from '../../../typechain-types/contracts/v2/platform/extensions/DualDexSwapV4';

import fs from 'fs';

dotenv.config();

enum DexType {
  UniV4,
  PcsV4,
  PcsV2,
  UniV2,
}

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
    const router = process.env.ROUTER_ADDRESS;
    const poolManager = process.env.POOL_MANAGER_ADDRESS;
    const usdc = process.env.USDC_ADDRESS;
    const hookDataEnv = process.env.HOOK_DATA ?? '0x';
    const dexTypeEnv = process.env.DEX_TYPE ?? `${DexType.PcsV4}`;

    // Validate environment variables
    if (
      !deployments.libraries.sigantureVerifier ||
      !deployments.libraries.helper ||
      !deployments.libraries.dualDexSwapV4 ||
      !owner ||
      !router ||
      !poolManager ||
      !usdc ||
      !deployments.tokens.long
    ) {
      throw new Error(
        `Missing required environment variables:\nSignatureVerifier: ${deployments.libraries.sigantureVerifier}\nHelper: ${deployments.libraries.helper}\nDualDexSwapV4Lib: ${deployments.libraries.dualDexSwapV4}\nOWNER_ADDRESS: ${owner}\nROUTER_ADDRESS: ${router}\nPOOL_MANAGER_ADDRESS: ${poolManager}\nUSDC_ADDRESS: ${usdc}\nLONG_ADDRESS: ${deployments.tokens.long}`,
      );
    }

    // Validate addresses (exclude swapPoolFees as it's not an address)
    for (const addr of [
      deployments.libraries.sigantureVerifier,
      deployments.libraries.helper,
      deployments.libraries.dualDexSwapV4,
      owner,
      router,
      poolManager,
      usdc,
      deployments.tokens.long,
    ]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    // Construct paymentsInfo struct
    const paymentsInfo: DualDexSwapV4Lib.PaymentsInfoStruct = {
      dexType: DexType.PcsV4,
      slippageBps: BigNumber.from(10).pow(27).sub(1),
      router,
      usdToken: usdc,
      long: deployments.tokens.long,
      maxPriceFeedDelay: 86_400,
      poolKey: encodePcsPoolKey(usdc, deployments.tokens.long, poolManager),
      hookData: hookDataEnv,
    } as DualDexSwapV4Lib.PaymentsInfoStruct;

    console.log('Deploying BelongCheckIn contract...');
    const belongCheckIn: BelongCheckIn = await deployBelongCheckIn(
      deployments.libraries.sigantureVerifier,
      deployments.libraries.helper,
      deployments.libraries.dualDexSwapV4Lib,
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

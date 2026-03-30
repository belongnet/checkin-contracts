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
  PcsV3,
  UniV3,
}

const BPS_27 = ethers.utils.parseUnits('1', 27);
const DEFAULT_CHECKIN_SLIPPAGE_BPS = 100;
const DEFAULT_MAX_PRICE_FEED_DELAY = 3600;

function parseCheckInSlippageBps(rawValue: string | undefined): BigNumber {
  const slippageBps = Number(rawValue ?? DEFAULT_CHECKIN_SLIPPAGE_BPS);
  if (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10_000) {
    throw new Error(`Invalid CHECKIN_SLIPPAGE_BPS: ${String(rawValue ?? DEFAULT_CHECKIN_SLIPPAGE_BPS)}`);
  }

  return BPS_27.mul(slippageBps).div(10_000);
}

function parseMaxPriceFeedDelay(rawValue: string | undefined): number {
  const maxPriceFeedDelay = Number(rawValue ?? DEFAULT_MAX_PRICE_FEED_DELAY);
  if (!Number.isInteger(maxPriceFeedDelay) || maxPriceFeedDelay <= 0) {
    throw new Error(
      `Invalid CHECKIN_MAX_PRICE_FEED_DELAY: ${String(rawValue ?? DEFAULT_MAX_PRICE_FEED_DELAY)}`,
    );
  }

  return maxPriceFeedDelay;
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

    const owner = process.env.ADMIN_ADDRESS;
    const router = process.env.PCS_ROUTER_ADDRESS ?? process.env.ROUTER_ADDRESS;
    const poolManager = process.env.PCS_POOL_MANAGER_ADDRESS ?? process.env.POOL_MANAGER_ADDRESS;
    const usdc = process.env.USDC_ADDRESS;
    const poolFee = process.env.PCS_POOL_FEE ?? process.env.UNISWAPV3_POOL_FEES;
    const tickSpacingEnv = process.env.PCS_TICK_SPACING;
    const hooks = process.env.PCS_HOOKS_ADDRESS ?? ethers.constants.AddressZero;
    const hookDataEnv = process.env.HOOK_DATA ?? '0x';

    // Validate environment variables
    if (
      !deployments.libraries.signatureVerifier ||
      !deployments.libraries.helper ||
      !deployments.libraries.dualDexSwapV4Lib ||
      !owner ||
      !router ||
      !poolManager ||
      !poolFee ||
      !tickSpacingEnv ||
      !usdc ||
      !deployments.tokens.long
    ) {
      throw new Error(
        `Missing required environment variables:\nSignatureVerifier: ${deployments.libraries.signatureVerifier}\nHelper: ${deployments.libraries.helper}\nDualDexSwapV4Lib: ${deployments.libraries.dualDexSwapV4Lib}\nADMIN_ADDRESS: ${owner}\nPCS_ROUTER_ADDRESS: ${router}\nPCS_POOL_MANAGER_ADDRESS: ${poolManager}\nPCS_POOL_FEE: ${poolFee}\nPCS_TICK_SPACING: ${tickSpacingEnv}\nPCS_HOOKS_ADDRESS: ${hooks}\nUSDC_ADDRESS: ${usdc}\nLONG_ADDRESS: ${deployments.tokens.long}`,
      );
    }

    // Validate addresses (exclude swapPoolFees as it's not an address)
    for (const addr of [
      deployments.libraries.signatureVerifier,
      deployments.libraries.helper,
      deployments.libraries.dualDexSwapV4Lib,
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

    if (hooks !== ethers.constants.AddressZero && !ethers.utils.isAddress(hooks)) {
      throw new Error(`Invalid hooks address: ${hooks}`);
    }

    const fee = Number(poolFee);
    if (!Number.isInteger(fee) || fee <= 0 || fee > 1_000_000) {
      throw new Error(`Invalid pool fee provided: ${poolFee}`);
    }

    const tickSpacing = Number(tickSpacingEnv);
    if (!Number.isInteger(tickSpacing) || tickSpacing <= 0) {
      throw new Error(`Invalid tick spacing provided: ${tickSpacingEnv}`);
    }

    // Construct paymentsInfo struct
    const paymentsInfo: DualDexSwapV4Lib.PaymentsInfoStruct = {
      dexType: DexType.PcsV4,
      slippageBps: parseCheckInSlippageBps(process.env.CHECKIN_SLIPPAGE_BPS),
      router,
      usdToken: usdc,
      long: deployments.tokens.long,
      maxPriceFeedDelay: parseMaxPriceFeedDelay(process.env.CHECKIN_MAX_PRICE_FEED_DELAY),
      poolKey: encodePcsPoolKey(usdc, deployments.tokens.long, poolManager, fee, tickSpacing, hooks),
      hookData: hookDataEnv,
    } as DualDexSwapV4Lib.PaymentsInfoStruct;

    console.log('Deploying BelongCheckIn contract...');
    const belongCheckIn: BelongCheckIn = await deployBelongCheckIn(
      deployments.libraries.signatureVerifier,
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

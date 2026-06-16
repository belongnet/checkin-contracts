import dotenv from 'dotenv';
import { BigNumber, BigNumberish } from 'ethers';
import { ethers } from 'hardhat';

import { BelongCheckIn } from '../../../typechain-types';
import { DualDexSwapV4Lib } from '../../../typechain-types/contracts/v2/platform/extensions/DualDexSwapV4';

import fs from 'fs';

dotenv.config();

const DEFAULT_SLIPPAGE_BPS_1E27 = BigNumber.from('50000000000000000000000000'); // 5%
const MAX_SLIPPAGE_BPS_1E27 = BigNumber.from(10).pow(27);
const UPDATE = process.env.UPDATE?.trim().toLowerCase() !== 'false';
const SYNC_DEPLOYMENT_JSON = process.env.SYNC_DEPLOYMENT_JSON?.trim().toLowerCase() !== 'false';

type DeploymentJson = {
  checkIn?: {
    address?: string;
    paymentsInfo?: {
      slippageBps?: unknown;
      poolKey?: string;
    };
  };
};

function parseSlippage(value: string | undefined): BigNumber {
  const slippageBps = value ? BigNumber.from(value) : DEFAULT_SLIPPAGE_BPS_1E27;
  if (slippageBps.lt(0) || slippageBps.gte(MAX_SLIPPAGE_BPS_1E27)) {
    throw new Error(`Invalid SLIPPAGE_BPS_1E27 provided: ${slippageBps.toString()}`);
  }
  return slippageBps;
}

function deploymentBigNumber(value: unknown): BigNumber | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (BigNumber.isBigNumber(value)) {
    return value;
  }
  if (typeof value === 'object' && 'hex' in value && typeof value.hex === 'string') {
    return BigNumber.from(value.hex);
  }
  return BigNumber.from(value as BigNumberish);
}

function formatSlippage(slippageBps: BigNumber): string {
  const bps = slippageBps.mul(10_000).div(MAX_SLIPPAGE_BPS_1E27);
  return `${bps.toString()} bps`;
}

function paymentsInfoForJson(info: DualDexSwapV4Lib.PaymentsInfoStruct) {
  const dexType = BigNumber.from(info.dexType);
  const maxPriceFeedDelay = BigNumber.from(info.maxPriceFeedDelay);
  return {
    dexType: dexType.toNumber(),
    slippageBps: BigNumber.from(info.slippageBps),
    router: info.router,
    usdToken: info.usdToken,
    long: info.long,
    maxPriceFeedDelay: maxPriceFeedDelay.lte(Number.MAX_SAFE_INTEGER)
      ? maxPriceFeedDelay.toNumber()
      : maxPriceFeedDelay.toString(),
    poolKey: info.poolKey,
    hookData: info.hookData,
  };
}

async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

  let deployments: DeploymentJson = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  const checkInAddress = process.env.CHECKIN_ADDRESS ?? process.env.CHECK_IN_ADDRESS ?? deployments.checkIn?.address;
  if (!checkInAddress) {
    throw new Error('Missing BelongCheckIn address. Set CHECKIN_ADDRESS or CHECK_IN_ADDRESS.');
  }
  if (!ethers.utils.isAddress(checkInAddress)) {
    throw new Error(`Invalid BelongCheckIn address: ${checkInAddress}`);
  }

  const targetSlippageBps = parseSlippage(process.env.SLIPPAGE_BPS_1E27);
  const belongCheckIn = (await ethers.getContractAt('BelongCheckIn', checkInAddress)) as BelongCheckIn;
  const current = await belongCheckIn.paymentsInfo();

  const deploymentPaymentsInfo = deployments.checkIn?.paymentsInfo;
  if (
    deploymentPaymentsInfo?.poolKey &&
    deploymentPaymentsInfo.poolKey.toLowerCase() !== current.poolKey.toLowerCase()
  ) {
    console.warn('Deployment JSON poolKey differs from on-chain paymentsInfo; preserving the on-chain poolKey.');
  }
  const deploymentSlippage = deploymentBigNumber(deploymentPaymentsInfo?.slippageBps);
  if (deploymentSlippage && !deploymentSlippage.eq(current.slippageBps)) {
    console.warn(
      'Deployment JSON slippage differs from on-chain paymentsInfo; preserving the on-chain config baseline.',
    );
  }

  const nextPaymentsInfo: DualDexSwapV4Lib.PaymentsInfoStruct = {
    dexType: current.dexType,
    slippageBps: targetSlippageBps,
    router: current.router,
    usdToken: current.usdToken,
    long: current.long,
    maxPriceFeedDelay: current.maxPriceFeedDelay,
    poolKey: current.poolKey,
    hookData: current.hookData,
  };

  console.log(`BelongCheckIn: ${checkInAddress}`);
  console.log(`Current slippage: ${current.slippageBps.toString()} (${formatSlippage(current.slippageBps)})`);
  console.log(`Target slippage:  ${targetSlippageBps.toString()} (${formatSlippage(targetSlippageBps)})`);

  if (!current.slippageBps.eq(targetSlippageBps)) {
    const calldata = belongCheckIn.interface.encodeFunctionData('setPaymentsInfo', [nextPaymentsInfo]);
    console.log(`Safe transaction target: ${checkInAddress}`);
    console.log('Safe transaction value:  0');
    console.log(`Safe transaction data:   ${calldata}`);

    if (!UPDATE) {
      console.log('UPDATE=false; skipping setPaymentsInfo transaction.');
    } else {
      const [signer] = await ethers.getSigners();
      if (!signer) {
        throw new Error('No signer configured. Set PK, or run with UPDATE=false to skip the transaction.');
      }

      const owner = await belongCheckIn.owner();
      if (owner.toLowerCase() !== signer.address.toLowerCase()) {
        throw new Error(
          `Signer ${signer.address} is not the BelongCheckIn owner ${owner}. Submit the printed calldata through the owner/Safe instead.`,
        );
      }

      const connected = belongCheckIn.connect(signer);
      await connected.callStatic.setPaymentsInfo(nextPaymentsInfo);
      const tx = await connected.setPaymentsInfo(nextPaymentsInfo);
      console.log(`setPaymentsInfo tx: ${tx.hash}`);
      await tx.wait();
      console.log('PaymentsInfo updated on-chain.');
    }
  } else {
    console.log('On-chain slippage already matches target; no transaction needed.');
  }

  if (SYNC_DEPLOYMENT_JSON) {
    const overrideAddress = process.env.CHECKIN_ADDRESS ?? process.env.CHECK_IN_ADDRESS;
    const canonicalAddress = deployments.checkIn?.address;
    if (overrideAddress && canonicalAddress && overrideAddress.toLowerCase() !== canonicalAddress.toLowerCase()) {
      console.warn(
        `CHECKIN_ADDRESS override (${overrideAddress}) differs from the deployment JSON address (${canonicalAddress}); skipping sync to avoid overwriting the canonical record. Update ${deploymentFile} manually if this override is intentional.`,
      );
    } else {
      const stored = await belongCheckIn.paymentsInfo();
      if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir, { recursive: true });
      }
      deployments.checkIn = deployments.checkIn ?? {};
      deployments.checkIn.address = checkInAddress;
      deployments.checkIn.paymentsInfo = paymentsInfoForJson(stored);
      fs.writeFileSync(deploymentFile, `${JSON.stringify(deployments, null, 2)}\n`);
      console.log(`Synced on-chain paymentsInfo to ${deploymentFile}.`);
    }
  } else {
    console.log('SYNC_DEPLOYMENT_JSON=false; leaving deployment JSON unchanged.');
  }
}

main().catch(error => {
  console.error('Script failed: ', error);
  process.exit(1);
});

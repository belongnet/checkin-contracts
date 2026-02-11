import dotenv from 'dotenv';
import EthCrypto from 'eth-crypto';
import { ethers } from 'hardhat';

import { hashVestingInfo } from '../../../helpers/math';
import { verifyContract } from '../../../helpers/verify';
import { VestingWalletInfoStruct } from '../../../typechain-types/contracts/v2/periphery/VestingWalletExtended';

import fs from 'fs';

dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true;
const VERIFY = ENV_VERIFY ?? true;

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
];

function parseUintEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}

function parseAmount(
  label: string,
  rawEnv: string | undefined,
  readableEnv: string | undefined,
  decimals: number,
  defaultValue?: string,
) {
  const source =
    rawEnv ?? (readableEnv !== undefined ? ethers.utils.parseUnits(readableEnv, decimals).toString() : undefined);
  if (source === undefined) {
    if (defaultValue !== undefined) {
      return ethers.BigNumber.from(defaultValue);
    }
    throw new Error(`Missing amount for ${label}`);
  }
  return ethers.BigNumber.from(source);
}

async function deploy() {
  const [signer] = await ethers.getSigners();
  const sender = await signer.getAddress();
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

  if (!deployments.vestingWallets) {
    deployments.vestingWallets = [];
  }

  if (DEPLOY) {
    console.log('Deploy VestingWallet: ');

    const signerPk = process.env.SIGNER_PK;
    const factoryAddress = process.env.FACTORY_ADDRESS ?? deployments.factory?.proxy;
    const tokenAddress = process.env.VESTING_TOKEN ?? deployments.tokens?.long;
    const beneficiary = process.env.VESTING_BENEFICIARY;
    const ownerAddress = process.env.VESTING_OWNER ?? sender;
    const description = process.env.VESTING_DESCRIPTION ?? 'Vesting wallet';

    const startTimestamp = parseUintEnv('VESTING_START_TIMESTAMP');
    const cliffDurationSeconds = parseUintEnv('VESTING_CLIFF_DURATION_SECONDS', '0');
    const durationSeconds = parseUintEnv('VESTING_DURATION_SECONDS', '0');

    if (!signerPk || !factoryAddress || !tokenAddress || !beneficiary) {
      throw new Error(
        `Missing required environment variables:\nSIGNER_PK\nFACTORY_ADDRESS: ${factoryAddress}\nVESTING_TOKEN: ${tokenAddress}\nVESTING_BENEFICIARY: ${beneficiary}\n`,
      );
    }

    for (const addr of [factoryAddress, tokenAddress, beneficiary, ownerAddress]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const [decimals, symbol] = await Promise.all([token.decimals(), token.symbol().catch(() => 'TOKEN')]);

    const totalAllocation = parseAmount(
      'VESTING_TOTAL_ALLOCATION',
      process.env.VESTING_TOTAL_RAW,
      process.env.VESTING_TOTAL_ALLOCATION,
      decimals,
    );
    const tgeAmount = parseAmount(
      'VESTING_TGE_AMOUNT',
      process.env.VESTING_TGE_RAW,
      process.env.VESTING_TGE_AMOUNT,
      decimals,
      '0',
    );
    const linearAllocation = parseAmount(
      'VESTING_LINEAR_AMOUNT',
      process.env.VESTING_LINEAR_RAW,
      process.env.VESTING_LINEAR_AMOUNT,
      decimals,
      '0',
    );

    if (durationSeconds === 0 && !linearAllocation.isZero()) {
      throw new Error('Linear allocation must be zero when duration is zero.');
    }

    if (tgeAmount.add(linearAllocation).gt(totalAllocation)) {
      throw new Error('TGE amount + linear allocation exceeds total allocation.');
    }

    const balance = await token.balanceOf(sender);
    if (balance.lt(totalAllocation)) {
      throw new Error(
        `Insufficient ${symbol} balance. Have ${balance.toString()}, need ${totalAllocation.toString()}.`,
      );
    }

    const allowance = await token.allowance(sender, factoryAddress);
    if (allowance.lt(totalAllocation)) {
      if (!allowance.isZero()) {
        console.log(`Resetting ${symbol} allowance to 0 before setting new allowance...`);
        await (await token.approve(factoryAddress, 0)).wait();
      }
      console.log(`Approving ${symbol} allocation to Factory...`);
      await (await token.approve(factoryAddress, totalAllocation)).wait();
    }

    const vestingWalletInfo: VestingWalletInfoStruct = {
      startTimestamp,
      cliffDurationSeconds,
      durationSeconds,
      token: tokenAddress,
      beneficiary,
      totalAllocation,
      tgeAmount,
      linearAllocation,
      description,
    };

    const factory = await ethers.getContractAt('Factory', factoryAddress);
    const existingWallets = await factory.getVestingWalletInstanceInfos(beneficiary, 0);
    const nextIndex = existingWallets.length;

    const message = hashVestingInfo(ownerAddress, vestingWalletInfo, chainId);
    const signature = EthCrypto.sign(signerPk, message);

    console.log('Deploying VestingWallet contract...');
    const tx = await factory.connect(signer).deployVestingWallet(ownerAddress, vestingWalletInfo, signature);
    const receipt = await tx.wait();

    const deployedInfo = await factory.getVestingWalletInstanceInfo(beneficiary, nextIndex);
    deployments.vestingWallets.push({
      address: deployedInfo.vestingWallet,
      beneficiary,
      owner: ownerAddress,
      token: tokenAddress,
      description,
      index: nextIndex,
      info: {
        startTimestamp,
        cliffDurationSeconds,
        durationSeconds,
        totalAllocation: totalAllocation.toString(),
        tgeAmount: tgeAmount.toString(),
        linearAllocation: linearAllocation.toString(),
      },
      factory: factoryAddress,
      txHash: receipt.transactionHash,
    });

    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed VestingWallet to: ', deployedInfo.vestingWallet);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      const wallets = deployments.vestingWallets ?? [];
      if (!wallets.length || !wallets[wallets.length - 1].address) {
        throw new Error('No VestingWallet deployment data found for verification.');
      }
      const target = wallets[wallets.length - 1].address;
      await verifyContract(target);
      console.log('VestingWallet verification successful.');
    } catch (error) {
      console.error('VestingWallet verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed: ', error);
  process.exit(1);
});

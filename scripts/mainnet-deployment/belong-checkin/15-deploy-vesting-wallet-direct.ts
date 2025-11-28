import dotenv from 'dotenv';
import fs from 'fs';
import { BigNumber } from 'ethers';
import { ethers, upgrades } from 'hardhat';
import { verifyContract } from '../../../helpers/verify';
import { VestingWalletInfoStruct } from '../../../typechain-types/contracts/v2/periphery/VestingWalletExtended';

dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const ENV_FUND = process.env.FUND?.toLowerCase() !== 'false'; // default true
const DEPLOY = ENV_DEPLOY ?? true;
const VERIFY = ENV_VERIFY ?? true;
const FUND = ENV_FUND;

const ERC20_ABI = [
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 value) returns (bool)',
];

function parseUintEnv(name: string, fallback?: string) {
  const value = process.env[name] ?? fallback;
  if (value === undefined) throw new Error(`Missing required environment variable: ${name}`);
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name} must be a non-negative integer`);
  return parsed;
}

function parseAmount(
  label: string,
  rawEnv: string | undefined,
  readableEnv: string | undefined,
  decimals: number,
  defaultValue?: string,
) {
  const source = rawEnv ?? (readableEnv !== undefined ? ethers.utils.parseUnits(readableEnv, decimals).toString() : undefined);
  if (source === undefined) {
    if (defaultValue !== undefined) return BigNumber.from(defaultValue);
    throw new Error(`Missing amount for ${label}`);
  }
  return BigNumber.from(source);
}

async function main() {
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
  if (!deployments.vestingWallets) deployments.vestingWallets = [];

  if (DEPLOY) {
    console.log('Deploy VestingWallet (direct, no Factory):');

    const owner = process.env.VESTING_OWNER ?? sender;
    const beneficiary = process.env.VESTING_BENEFICIARY;
    const tokenAddress = process.env.VESTING_TOKEN ?? deployments.tokens?.long;
    const description = process.env.VESTING_DESCRIPTION ?? 'Vesting wallet';

    const startTimestamp = parseUintEnv('VESTING_START_TIMESTAMP');
    const cliffDurationSeconds = parseUintEnv('VESTING_CLIFF_DURATION_SECONDS', '0');
    const durationSeconds = parseUintEnv('VESTING_DURATION_SECONDS', '0');

    if (!beneficiary || !tokenAddress) {
      throw new Error(
        `Missing required environment variables:\nVESTING_BENEFICIARY=${beneficiary}\nVESTING_TOKEN=${tokenAddress}\n`,
      );
    }

    for (const addr of [owner, beneficiary, tokenAddress]) {
      if (!ethers.utils.isAddress(addr)) throw new Error(`Invalid address: ${addr}`);
    }

    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const [decimals, symbol] = await Promise.all([
      token.decimals(),
      token.symbol().catch(() => 'TOKEN'),
    ]);

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

    if (FUND) {
      const balance = await token.balanceOf(sender);
      if (balance.lt(totalAllocation)) {
        throw new Error(`Insufficient ${symbol} balance. Have ${balance.toString()}, need ${totalAllocation.toString()}.`);
      }
    }

    const info: VestingWalletInfoStruct = {
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

    console.log('Deploying proxy...');
    const VestingWallet = await ethers.getContractFactory('VestingWalletExtended');
    const vestingWallet = await upgrades.deployProxy(VestingWallet, [owner, info], {
      initializer: 'initialize',
      unsafeAllow: ['constructor'],
    });
    await vestingWallet.deployed();

    if (FUND) {
      console.log(`Funding vesting wallet with ${totalAllocation.toString()} ${symbol}...`);
      await (await token.transfer(vestingWallet.address, totalAllocation)).wait();
    } else {
      console.log('Skipped funding (FUND=false). Remember to transfer tokens manually.');
    }

    deployments.vestingWallets.push({
      address: vestingWallet.address,
      beneficiary,
      owner,
      token: tokenAddress,
      description,
      info: {
        startTimestamp,
        cliffDurationSeconds,
        durationSeconds,
        totalAllocation: totalAllocation.toString(),
        tgeAmount: tgeAmount.toString(),
        linearAllocation: linearAllocation.toString(),
      },
      factory: null,
      txHash: vestingWallet.deployTransaction.hash,
      funded: FUND,
    });
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

    console.log('Deployed VestingWallet to:', vestingWallet.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification:');
    try {
      const wallets = deployments.vestingWallets ?? [];
      if (!wallets.length || !wallets[wallets.length - 1].address) {
        throw new Error('No VestingWallet deployment data found for verification.');
      }
      const target = wallets[wallets.length - 1].address;
      await verifyContract(target);
      console.log('VestingWallet verification successful.');
    } catch (error) {
      console.error('VestingWallet verification failed:', error);
    }
    console.log('Done.');
  }
}

main().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});

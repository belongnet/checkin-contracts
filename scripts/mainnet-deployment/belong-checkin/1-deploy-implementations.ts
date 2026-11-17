import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import {
  deployAccessTokenImplementation,
  deployCreditTokenImplementation,
  deployRoyaltiesReceiverV2Implementation,
  deployVestingWalletImplementation,
} from '../../../helpers/deployFixtures';
import { assertLibraryMatchesLocalBuild } from '../../helpers/bytecode';
import { assertNotRecorded, envFlag } from '../../helpers/env';
import { verifyContract } from '../../helpers/verify-contract';

import fs from 'fs';

dotenv.config();

type ImplementationTarget = 'accessToken' | 'creditToken' | 'royaltiesReceiver' | 'vestingWallet';

const ALL_TARGETS: ImplementationTarget[] = ['accessToken', 'creditToken', 'royaltiesReceiver', 'vestingWallet'];

const TARGET_LABELS: Record<ImplementationTarget, string> = {
  accessToken: 'AccessTokenImplementation',
  creditToken: 'CreditTokenImplementation',
  royaltiesReceiver: 'RoyaltiesReceiverV2Implementation',
  vestingWallet: 'VestingWalletImplementation',
};

function normalizeTarget(value: string): ImplementationTarget {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'accesstoken' || normalized === 'access_token' || normalized === 'access') return 'accessToken';
  if (normalized === 'credittoken' || normalized === 'credit_token' || normalized === 'credit') return 'creditToken';
  if (normalized === 'royaltiesreceiver' || normalized === 'royalties_receiver' || normalized === 'royalties') {
    return 'royaltiesReceiver';
  }
  if (normalized === 'vestingwallet' || normalized === 'vesting_wallet' || normalized === 'vesting') {
    return 'vestingWallet';
  }
  throw new Error(`Unsupported implementation target: ${value}`);
}

function parseTargets(value: string | undefined): Set<ImplementationTarget> {
  if (!value || value.trim() === '' || value.trim().toLowerCase() === 'all') {
    return new Set<ImplementationTarget>(ALL_TARGETS);
  }

  const parsed = value.split(',').map(normalizeTarget);
  return new Set<ImplementationTarget>(parsed);
}

const DEPLOY = envFlag('DEPLOY', true);
const VERIFY = envFlag('VERIFY', true);
const TARGETS = parseTargets(process.env.IMPLEMENTATIONS);

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

  if (!deployments.implementations) {
    deployments.implementations = {};
  }

  if (DEPLOY) {
    console.log('Deploy Implementations: ');
    // Checked up front, so the run never stops half-way after deploying some of the targets.
    for (const target of TARGETS) {
      assertNotRecorded(deployments.implementations[target], TARGET_LABELS[target]);
    }

    // Validate environment variables
    if (TARGETS.has('accessToken') && !deployments.libraries.signatureVerifier) {
      throw new Error('Missing required environment variables: SignatureVerifier');
    }

    // Validate addresses
    const requiredAddresses: string[] = [];
    if (TARGETS.has('accessToken')) {
      requiredAddresses.push(deployments.libraries.signatureVerifier);
    }
    for (const addr of requiredAddresses) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    // AccessToken calls into the linked SignatureVerifier, so the recorded library must be this
    // checkout's build: linked to an older one, mints would verify that library's digests instead.
    if (TARGETS.has('accessToken')) {
      await assertLibraryMatchesLocalBuild('SignatureVerifier', deployments.libraries.signatureVerifier);
    }

    console.log(`Targets: ${Array.from(TARGETS).join(', ')}`);

    if (TARGETS.has('accessToken')) {
      console.log('Deploying AccessTokenImplementation contract...');
      const accessTokenImpl = await deployAccessTokenImplementation(deployments.libraries.signatureVerifier);
      deployments.implementations.accessToken = accessTokenImpl.address;
      fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
      console.log('Deployed AccessTokenImplementation to: ', accessTokenImpl.address);
    }

    if (TARGETS.has('creditToken')) {
      console.log('Deploying CreditTokenImplementation contract...');
      const creditTokenImpl = await deployCreditTokenImplementation();
      deployments.implementations.creditToken = creditTokenImpl.address;
      fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
      console.log('Deployed CreditTokenImplementation to: ', creditTokenImpl.address);
    }

    if (TARGETS.has('royaltiesReceiver')) {
      console.log('Deploying RoyaltiesReceiverV2Implementation contract...');
      const rrImpl = await deployRoyaltiesReceiverV2Implementation();
      deployments.implementations.royaltiesReceiver = rrImpl.address;
      fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
      console.log('Deployed RoyaltiesReceiverV2Implementation to: ', rrImpl.address);
    }

    if (TARGETS.has('vestingWallet')) {
      console.log('Deploying VestingWalletImplementation contract...');
      const vestingWalletImpl = await deployVestingWalletImplementation();
      deployments.implementations.vestingWallet = vestingWalletImpl.address;
      fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
      console.log('Deployed VestingWalletImplementation to: ', vestingWalletImpl.address);
    }

    console.log('Done.');
  }

  if (VERIFY) {
    if (TARGETS.has('accessToken')) {
      console.log('Verification AccessTokenImplementation: ');
      try {
        if (!deployments.implementations.accessToken) {
          throw new Error('No AccessTokenImplementation deployment data found for verification.');
        }
        await verifyContract(deployments.implementations.accessToken);
        console.log('AccessTokenImplementation verification successful.');
      } catch (error) {
        console.error('AccessTokenImplementation verification failed: ', error);
      }
      console.log('Done.');
    }

    if (TARGETS.has('creditToken')) {
      console.log('Verification CreditTokenImplementation: ');
      try {
        if (!deployments.implementations.creditToken) {
          throw new Error('No CreditTokenImplementation deployment data found for verification.');
        }
        await verifyContract(deployments.implementations.creditToken);
        console.log('CreditTokenImplementation verification successful.');
      } catch (error) {
        console.error('CreditTokenImplementation verification failed: ', error);
      }
      console.log('Done.');
    }

    if (TARGETS.has('royaltiesReceiver')) {
      console.log('Verification RoyaltiesReceiverV2Implementation: ');
      try {
        if (!deployments.implementations.royaltiesReceiver) {
          throw new Error('No RoyaltiesReceiverV2Implementation deployment data found for verification.');
        }
        await verifyContract(deployments.implementations.royaltiesReceiver);
        console.log('RoyaltiesReceiverV2Implementation verification successful.');
      } catch (error) {
        console.error('RoyaltiesReceiverV2Implementation verification failed: ', error);
      }
      console.log('Done.');
    }

    if (TARGETS.has('vestingWallet')) {
      console.log('Verification VestingWalletImplementation:');
      try {
        if (!deployments.implementations.vestingWallet) {
          throw new Error('No VestingWalletImplementation deployment data found for verification.');
        }
        await verifyContract(deployments.implementations.vestingWallet);
        console.log('VestingWalletImplementation verification successful.');
      } catch (error) {
        console.error('VestingWalletImplementation verification failed: ', error);
      }
      console.log('Done.');
    }
  }
}

deploy().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});

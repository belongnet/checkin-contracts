import dotenv from 'dotenv';
import fs from 'fs';
import { ethers } from 'hardhat';
import { BelongCheckIn } from '../../../typechain-types';

dotenv.config();

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

  console.log('Setting BelongCheckIn up...');

  const belongCheckIn = deployments.BelongCheckIn.proxy;
  const factory = deployments.Factory.proxy;
  const escrow = deployments.Escrow.address;
  const staking = deployments.Staking.address;
  const venueToken = deployments.VenueToken.address;
  const promoterToken = deployments.PromoterToken.address;
  const longPF = process.env.LONG_PRICE_FEED;

  // Validate environment variables
  if (!belongCheckIn || !factory || !escrow || !staking || !venueToken || !promoterToken || !longPF) {
    throw new Error(
      'Missing required environment variables: BelongCheckIn, Factory, Escrow, Staking, VenueToken, PromoterToken, LongPriceFeed',
    );
  }

  // Validate addresses (exclude uniswapPoolFees as it's not an address)
  for (const addr of [factory, escrow, staking, venueToken, promoterToken, longPF]) {
    if (!ethers.utils.isAddress(addr)) {
      throw new Error(`Invalid address: ${addr}`);
    }
  }

  const belongCheckIn: BelongCheckIn = await ethers.getContractAt('BelongCheckIn', belongCheckIn);

  const contracts = {
    factory,
    escrow,
    staking,
    venueToken,
    promoterToken,
    longPF,
  };

  await belongCheckIn.setContracts(contracts);

  console.log('Done.');
}

deploy().catch(error => {
  console.error('Script failed: ', error);
  process.exit(1);
});

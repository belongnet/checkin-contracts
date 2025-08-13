import dotenv from 'dotenv';
import fs from 'fs';
import { ethers } from 'hardhat';
import { deployCreditTokens } from '../../../helpers/deployFixtures';
import { verifyContract } from '../../../helpers/verify';

dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true; // <-- ENV_UPGRADE is `false` (not nullish), so UPGRADE=false
const VERIFY = ENV_VERIFY ?? true; // same

async function deploy() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;
  const [admin] = await ethers.getSigners();

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
    console.log('Setting VenueToken and PromoterToken...');

    const factory = deployments.Factory.proxy;

    // Validate environment variables
    if (!factory) {
      throw new Error('Missing required environment variables: Factory');
    }

    // Validate addresses (exclude uniswapPoolFees as it's not an address)
    for (const addr of [factory]) {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    }

    const venueMetadata = {
      name: 'VenueToken',
      symbol: 'VET',
      uri: 'contractURI/VenueToken',
    };
    const promoterMetadata = {
      name: 'PromoterToken',
      symbol: 'PMT',
      uri: 'contractURI/PromoterToken',
    };

    const { venueToken, promoterToken } = await deployCreditTokens(true, true, factory, process.env.SIGNER_PK, admin);

    // Update deployments object
    deployments = {
      ...deployments,
      VenueToken: {
        address: venueToken.address,
        parameters: [
          {
            name: venueMetadata.name,
            symbol: venueMetadata.symbol,
            uri: venueMetadata.uri,
            transferable: true,
          },
        ],
      },
      PromoterToken: {
        address: promoterToken.address,
        parameters: [
          {
            name: promoterMetadata.name,
            symbol: promoterMetadata.symbol,
            uri: promoterMetadata.uri,
            transferable: true,
          },
        ],
      },
    };

    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

    console.log('Deployed VenueToken to:', venueToken.address);
    console.log('Deployed PromoterToken to:', promoterToken.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification:');
    try {
      if (!deployments.VenueToken?.address || !deployments.VenueToken?.parameters) {
        throw new Error('No VenueToken deployment data found for verification.');
      }
      await verifyContract(deployments.VenueToken.address);
      console.log('VenueToken verification successful.');
    } catch (error) {
      console.error('VenueToken verification failed:', error);
    }
    try {
      if (!deployments.PromoterToken?.address || !deployments.PromoterToken?.parameters) {
        throw new Error('No PromoterToken deployment data found for verification.');
      }
      await verifyContract(deployments.PromoterToken.address);
      console.log('PromoterToken verification successful.');
    } catch (error) {
      console.error('PromoterToken verification failed:', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Script failed: ', error);
  process.exit(1);
});

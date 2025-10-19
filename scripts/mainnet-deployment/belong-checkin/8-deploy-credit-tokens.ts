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
  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  if (!deployments.tokens) {
    deployments.tokens = {};
  }

  if (DEPLOY) {
    console.log('Deploy VenueToken and PromoterToken: ');

    const signerPK = process.env.SIGNER_PK;

    // Validate environment variables
    if (!deployments.factory.proxy || !deployments.checkIn.address || !signerPK) {
      throw new Error(
        `Missing required environment variables:\nFactory: ${deployments.factory.proxy}\nCheckIn: ${deployments.checkIn.address}\nSIGNER_PK`,
      );
    }

    // Validate addresses (exclude swapPoolFees as it's not an address)
    for (const addr of [deployments.factory.proxy, deployments.checkIn.address]) {
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

    console.log('Deploying VenueToken and PromoterToken contracts...');
    const { venueToken, promoterToken } = await deployCreditTokens(
      true,
      true,
      deployments.factory.proxy,
      signerPK,
      admin,
      admin.address,
      deployments.checkIn.address,
      deployments.checkIn.address,
    );

    // Update deployments object
    deployments.tokens.venueToken = {
      address: venueToken.address,
      parameters: [
        {
          name: venueMetadata.name,
          symbol: venueMetadata.symbol,
          uri: venueMetadata.uri,
          transferable: true,
        },
      ],
    };
    deployments.tokens.promoterToken = {
      address: promoterToken.address,
      parameters: [
        {
          name: promoterMetadata.name,
          symbol: promoterMetadata.symbol,
          uri: promoterMetadata.uri,
          transferable: true,
        },
      ],
    };
    // Write to file
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

    console.log('Deployed VenueToken to: ', venueToken.address);
    console.log('Deployed PromoterToken to: ', promoterToken.address);
    console.log('Done.');
  }

  if (VERIFY) {
    console.log('Verification: ');
    try {
      if (!deployments.tokens.venueToken.address) {
        throw new Error('No VenueToken deployment data found for verification.');
      }
      await verifyContract(deployments.tokens.venueToken.address);
      console.log('VenueToken verification successful.');
    } catch (error) {
      console.error('VenueToken verification failed: ', error);
    }
    try {
      if (!deployments.tokens.promoterToken.address) {
        throw new Error('No PromoterToken deployment data found for verification.');
      }
      await verifyContract(deployments.tokens.promoterToken.address);
      console.log('PromoterToken verification successful.');
    } catch (error) {
      console.error('PromoterToken verification failed: ', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Script failed: ', error);
  process.exit(1);
});

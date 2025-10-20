import fs from 'fs';
import dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { deployNftWithoutFactory } from '../../../helpers/deployFixtures';
import { verifyContract } from '../../../helpers/verify';

dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true;
const VERIFY = ENV_VERIFY ?? true;

const NFT_ARGS = [
  {
    transferValidator: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    factory: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    creator: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    feeReceiver: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    referralCode: '0x0000000000000000000000000000000000000000000000000000000000000000',
    info: {
      metadata: {
        name: 'NFT',
        symbol: 'NFT',
      },
      payingToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      feeNumerator: Number(0),
      transferable: false,
      maxTotalSupply: Number(0),
      mintPrice: Number(0),
      whitelistMintPrice: Number(0),
      collectionExpire: Number(0),
      contractURI: '0000',
      signature:
        '0x7698e843a10f030c70588cf485a6aed9f2fb1dcfbf78eeab0c92ea114ff1ac511b003b0724da54f0aa172b88bc19826d88333770559a86ab9b2a1199e44a152d1b',
    },
  },
];

async function main() {
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

  deployments.nft = deployments.nft ?? {};

  if (DEPLOY) {
    console.log('Deploy NFT contract:');

    const nft = await deployNftWithoutFactory(NFT_ARGS[0]);

    deployments.nft = {
      address: nft.address,
      args: NFT_ARGS,
    };

    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log(`NFT deployed to: ${nft.address}`);
    console.log('Deployment data saved to', deploymentFile);
  }

  if (VERIFY) {
    console.log('Verification:');
    try {
      const nftAddress: string | undefined = deployments.nft?.address;
      if (!nftAddress) {
        throw new Error('No NFT address found in deployments file.');
      }
      await verifyContract(nftAddress, NFT_ARGS);
      console.log('NFT verification successful.');
    } catch (error) {
      console.error('NFT verification failed:', error);
    }
  }
}

main().catch(error => {
  console.error('NFT deployment script failed:', error);
  process.exit(1);
});

import fs from 'fs';
import dotenv from 'dotenv';
import { verifyContract } from '../../../helpers/verify';
import { ethers } from 'hardhat';

dotenv.config();

async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentFile = `deployments/chainId-${chainId}.json`;

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found at ${deploymentFile}. Run the mock deployment first.`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  const nft = deployments?.nft;

  if (!nft?.address) {
    throw new Error('No NFT mock deployment recorded in deployments file.');
  }

  console.log('Verifying NFT mock at', nft.address);
  await verifyContract(nft.address, nft.args ?? []);
  console.log('NFT mock verification successful.');
}

main().catch(error => {
  console.error('NFT mock verification failed:', error);
  process.exit(1);
});

import fs from 'fs';
import { ethers, upgrades } from 'hardhat';

const proxy = '0xCa673987F1D74552fC25Dd7975848FE6f5F21abC';

async function main() {
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

  const FactoryV2 = await ethers.getContractFactory('Factory', {
    libraries: { SignatureVerifier: deployments.SigantureVerifier.address },
  });

  // (Optional) pre-check: will fail if layout breaks
  await upgrades.validateUpgrade(proxy, FactoryV2, {
    kind: 'transparent',
    unsafeAllow: ['constructor'],
    unsafeAllowLinkedLibraries: true,
  });

  const royalties = { amountToCreator: 8000, amountToPlatform: 2000 };
  const implementations = {
    accessToken: deployments.AccessTokenImplementation.address,
    creditToken: deployments.CreditTokenImplementation.address,
    royaltiesReceiver: deployments.RoyaltiesReceiverV2Implementation.address,
  };

  const upgraded = await upgrades.upgradeProxy(proxy, FactoryV2, {
    kind: 'transparent',
    call: { fn: 'upgradeToV2', args: [royalties, implementations] },
    unsafeAllow: ['constructor'],
    unsafeAllowLinkedLibraries: true,
  });

  console.log('Upgraded proxy still at:', upgraded.address);
  console.log('new impl:', await upgrades.erc1967.getImplementationAddress(upgraded.address));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

import { ethers, upgrades } from 'hardhat';

import { verifyContract } from '../../helpers/verify-contract';

import fs from 'fs';

const DEPLOY = process.env.DEPLOY?.trim().toLowerCase() !== 'false';
const VERIFY = process.env.VERIFY?.trim().toLowerCase() === 'true';

async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Deployment file not found: ${deploymentFile}`);
  }

  const deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  const proxy = deployments.checkIn?.address;
  const signatureVerifier = deployments.libraries?.signatureVerifier;
  const helper = deployments.libraries?.helper;
  const dualDexSwapV4Lib = deployments.libraries?.dualDexSwapV4Lib;

  if (!proxy || !signatureVerifier || !helper || !dualDexSwapV4Lib) {
    throw new Error(
      `Missing required deployment data:\nBelongCheckIn proxy: ${proxy}\nSignatureVerifier: ${signatureVerifier}\nHelper: ${helper}\nDualDexSwapV4Lib: ${dualDexSwapV4Lib}`,
    );
  }

  const BelongCheckIn = await ethers.getContractFactory('BelongCheckIn', {
    libraries: {
      SignatureVerifier: signatureVerifier,
      Helper: helper,
      DualDexSwapV4Lib: dualDexSwapV4Lib,
    },
  });

  await upgrades.validateUpgrade(proxy, BelongCheckIn, {
    kind: 'transparent',
    unsafeAllow: ['constructor'],
    unsafeAllowLinkedLibraries: true,
  });

  let implementation =
    process.env.CHECKIN_IMPLEMENTATION_ADDRESS ??
    deployments.checkIn?.pendingUpgrade?.implementation ??
    deployments.checkIn?.implementation;

  if (DEPLOY && !process.env.CHECKIN_IMPLEMENTATION_ADDRESS) {
    console.log('Deploying new BelongCheckIn implementation...');
    const implementationContract = await BelongCheckIn.deploy();
    await implementationContract.deployed();
    implementation = implementationContract.address;
  }

  if (!implementation || !ethers.utils.isAddress(implementation)) {
    throw new Error(`Invalid CheckIn implementation address: ${implementation}`);
  }

  const proxyAdmin = await upgrades.erc1967.getAdminAddress(proxy);
  const proxyAdminContract = new ethers.Contract(
    proxyAdmin,
    ['function owner() view returns (address)'],
    ethers.provider,
  );
  const proxyAdminOwner = await proxyAdminContract.owner();
  const proxyAdminInterface = new ethers.utils.Interface(['function upgrade(address proxy, address implementation)']);
  const data = proxyAdminInterface.encodeFunctionData('upgrade', [proxy, implementation]);

  deployments.checkIn.pendingUpgrade = {
    proxy,
    proxyAdmin,
    proxyAdminOwner,
    implementation,
    dualDexSwapV4Lib,
    data,
  };
  fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));

  console.log('Safe transaction fields:');
  console.log('To:   ', proxyAdmin);
  console.log('Value:', '0');
  console.log('Data: ', data);
  console.log('');
  console.log('Proxy:              ', proxy);
  console.log('ProxyAdmin owner:   ', proxyAdminOwner);
  console.log('New implementation: ', implementation);
  console.log('DualDexSwapV4Lib:   ', dualDexSwapV4Lib);

  if (VERIFY) {
    await verifyContract(implementation);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});

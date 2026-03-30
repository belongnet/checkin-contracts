import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { BelongCheckIn } from '../../../typechain-types/contracts/v2/platform';

import fs from 'fs';

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
  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }
  deployments.factory = deployments.factory || {};
  deployments.checkIn = deployments.checkIn || {};
  deployments.tokens = deployments.tokens || {};

  console.log('Set BelongCheckIn up: ');

  const platformAddressEnv = process.env.PLATFORM_ADDRESS;
  const signerAddressEnv = process.env.SIGNER_ADDRESS;

  // Validate environment variables
  if (
    !deployments.checkIn.address ||
    !deployments.factory.proxy ||
    !deployments.checkIn.escrow ||
    !deployments.tokens.staking ||
    !deployments.tokens.venueToken.address ||
    !deployments.tokens.promoterToken.address ||
    !deployments.tokens.longPriceFeed ||
    !platformAddressEnv ||
    !signerAddressEnv
  ) {
    throw new Error(
      `Missing required environment variables:\nBelongCheckIn: ${deployments.checkIn.address}\nFactory: ${deployments.factory.proxy}\nEscrow: ${deployments.checkIn.escrow}\nStaking: ${deployments.tokens.staking}\nVenueToken: ${deployments.tokens.venueToken.address}\nPromoterToken: ${deployments.tokens.promoterToken.address}\nLONG_PRICE_FEED: ${deployments.tokens.longPriceFeed}\nPLATFORM_ADDRESS: ${platformAddressEnv}\nSIGNER_ADDRESS: ${signerAddressEnv}\n`,
    );
  }

  // Validate addresses (exclude swapPoolFees as it's not an address)
  for (const addr of [
    deployments.checkIn.address,
    deployments.factory.proxy,
    deployments.checkIn.escrow,
    deployments.tokens.staking,
    deployments.tokens.venueToken.address,
    deployments.tokens.promoterToken.address,
    deployments.tokens.longPriceFeed,
    platformAddressEnv,
    signerAddressEnv,
  ]) {
    if (!ethers.utils.isAddress(addr)) {
      throw new Error(`Invalid address: ${addr}`);
    }
  }

  const platformAddress = ethers.utils.getAddress(platformAddressEnv);
  const signerAddress = ethers.utils.getAddress(signerAddressEnv);

  const factory = await ethers.getContractAt('Factory', deployments.factory.proxy);
  const currentFactoryParameters = await factory.nftFactoryParameters();
  const platformMatches = currentFactoryParameters.platformAddress.toLowerCase() === platformAddress.toLowerCase();
  const signerMatches = currentFactoryParameters.signerAddress.toLowerCase() === signerAddress.toLowerCase();

  const [royaltiesParameters, implementations] = await Promise.all([
    factory.royaltiesParameters(),
    factory.implementations(),
  ]);
  const normalizeNumber = (value: unknown): number => {
    if (value === null || value === undefined) {
      throw new Error('Unable to resolve numeric value.');
    }
    if (typeof value === 'number') {
      return value;
    }
    if (typeof value === 'bigint') {
      return Number(value);
    }
    if (typeof value === 'string') {
      return Number(value);
    }
    if (typeof (value as { toString?: () => string }).toString === 'function') {
      return Number((value as { toString: () => string }).toString());
    }
    throw new Error(`Unsupported numeric value: ${String(value)}`);
  };

  const referralPercentages = [0, 0, 0, 0, 0] as [number, number, number, number, number];
  for (let i = 0; i < referralPercentages.length; i += 1) {
    const rawValue = await factory.usedToPercentage(i);
    referralPercentages[i] = normalizeNumber(rawValue);
  }

  const maxArrayLength = 20;

  try {
    await factory.callStatic.upgradeToV2(royaltiesParameters, implementations, referralPercentages, maxArrayLength);
    console.log('Upgrading Factory to V2...');
    const upgradeTx = await factory.upgradeToV2(
      royaltiesParameters,
      implementations,
      referralPercentages,
      maxArrayLength,
    );
    await upgradeTx.wait();
    console.log('Factory upgraded to V2.');
  } catch (error) {
    const message = (error as Error)?.message ?? '';
    if (message.includes('InvalidInitialization')) {
      console.log('Factory already upgraded to V2; skipping.');
    } else {
      throw error;
    }
  }

  if (!platformMatches || !signerMatches) {
    const updatedFactoryParameters = {
      platformAddress,
      signerAddress,
      defaultPaymentCurrency: currentFactoryParameters.defaultPaymentCurrency,
      platformCommission: currentFactoryParameters.platformCommission,
      maxArraySize: currentFactoryParameters.maxArraySize,
      transferValidator: currentFactoryParameters.transferValidator,
    };

    console.log('Updating Factory parameters...');
    const tx = await factory.setFactoryParameters(
      updatedFactoryParameters,
      royaltiesParameters,
      implementations,
      referralPercentages,
      maxArrayLength,
    );
    await tx.wait();
    console.log('Factory parameters updated.');
  } else {
    console.log('Factory parameters already match env; skipping update.');
  }

  const belongCheckIn: BelongCheckIn = (await ethers.getContractAt(
    'BelongCheckIn',
    deployments.checkIn.address,
  )) as BelongCheckIn;

  const contractsConfig: BelongCheckIn.ContractsStruct = {
    factory: deployments.factory.proxy,
    escrow: deployments.checkIn.escrow,
    staking: deployments.tokens.staking,
    venueToken: deployments.tokens.venueToken.address,
    promoterToken: deployments.tokens.promoterToken.address,
    longPF: deployments.tokens.longPriceFeed,
  };

  const currentContracts = (await belongCheckIn.belongCheckInStorage()).contracts;
  const contractsMatch =
    currentContracts.factory.toLowerCase() === contractsConfig.factory.toLowerCase() &&
    currentContracts.escrow.toLowerCase() === contractsConfig.escrow.toLowerCase() &&
    currentContracts.staking.toLowerCase() === contractsConfig.staking.toLowerCase() &&
    currentContracts.venueToken.toLowerCase() === contractsConfig.venueToken.toLowerCase() &&
    currentContracts.promoterToken.toLowerCase() === contractsConfig.promoterToken.toLowerCase() &&
    currentContracts.longPF.toLowerCase() === contractsConfig.longPF.toLowerCase();

  if (!contractsMatch) {
    console.log('Updating BelongCheckIn contract references...');
    const tx = await belongCheckIn.setContracts(contractsConfig);
    await tx.wait();
    console.log('BelongCheckIn contract references updated.');
  } else {
    console.log('BelongCheckIn contract references already match deployments; skipping update.');
  }

  console.log('Done.');
}

deploy().catch(error => {
  console.error('Script failed: ', error);
  process.exit(1);
});

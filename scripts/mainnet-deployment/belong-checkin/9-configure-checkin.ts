import dotenv from 'dotenv';
import { ethers } from 'hardhat';

import { BelongCheckIn } from '../../../typechain-types';

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
  const referralPercentages = [0, 0, 0, 0, 0] as [number, number, number, number, number];
  for (let i = 0; i < referralPercentages.length; i += 1) {
    referralPercentages[i] = (await factory.usedToPercentage(i)).toNumber();
  }

  const referralEvents = await factory.queryFilter(factory.filters.ReferralParametersSet());
  const latestReferralEvent = referralEvents[referralEvents.length - 1];
  if (!latestReferralEvent?.args?.maxArrayLength) {
    throw new Error('Unable to resolve referral max array length from events.');
  }
  const maxArrayLength = latestReferralEvent.args.maxArrayLength.toNumber();

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

  const belongCheckIn: BelongCheckIn = await ethers.getContractAt('BelongCheckIn', deployments.checkIn.address);

  const contracts = {
    factory: deployments.factory.proxy,
    escrow: deployments.checkIn.escrow,
    staking: deployments.tokens.staking,
    venueToken: deployments.tokens.venueToken.address,
    promoterToken: deployments.tokens.promoterToken.address,
    deployments.tokens.longPriceFeed,
  };

  console.log('Setting BelongCheckIn up...');
  await belongCheckIn.setContracts(contracts);

  console.log('Done.');
}

deploy().catch(error => {
  console.error('Script failed: ', error);
  process.exit(1);
});

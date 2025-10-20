import dotenv from 'dotenv';
import fs from 'fs';
import { ethers } from 'hardhat';
import { BelongCheckIn } from '../../../typechain-types';
import EthCrypto from 'eth-crypto';
import { U } from '../../../helpers/math';
import { getToken } from '../../../helpers/fork';
import { VenueInfoStruct, VenueRulesStruct } from '../../../typechain-types/contracts/v2/platform/BelongCheckIn';

dotenv.config();

async function deploy() {
  const [deployer] = await ethers.getSigners();
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

  console.log('Test BelongCheckIn venueDeposit...');

  const belongCheckIn: BelongCheckIn = await ethers.getContractAt('BelongCheckIn', deployments.checkIn.address);

  const USDC = await getToken('0x14196f08a4fa0b66b7331bc40dd6bcd8a1deea9f');

  const uri = 'uriuri';
  const amount = await U(10, await USDC.decimals());
  const message = ethers.utils.solidityKeccak256(
    ['address', 'bytes32', 'string', 'uint256'],
    [deployer.address, ethers.constants.HashZero, uri, chainId],
  );
  const signature = EthCrypto.sign(process.env.SIGNER_PK!, message);

  console.log('message: ', message, '\nsignature: ', signature);
  const venueInfo: VenueInfoStruct = {
    rules: { paymentType: 1, bountyType: 0, longPaymentType: 0 } as VenueRulesStruct,
    venue: deployer.address,
    amount,
    referralCode: ethers.constants.HashZero,
    uri,
    signature: signature,
  };

  await belongCheckIn.venueDeposit(venueInfo);

  console.log('Done.');
}

deploy().catch(error => {
  console.error('Script failed: ', error);
  process.exit(1);
});

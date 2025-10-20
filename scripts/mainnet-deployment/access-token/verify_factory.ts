import { checkAddress } from '../../../helpers/checkers';
import { verifyContract } from '../../../helpers/verify';
import dotenv from 'dotenv';
dotenv.config();

const NFTFactory_Address = process.env.NFT_FACTORY_ADDRESS;
async function verify() {
  console.log('Verification: ');

  checkAddress(NFTFactory_Address);

  try {
    await verifyContract(NFTFactory_Address!);
    console.log('NFTFactory verification successful.');
  } catch (error) {
    console.error('NFTFactory verification failed:', error);
  }

  console.log('Done.');
}

verify();

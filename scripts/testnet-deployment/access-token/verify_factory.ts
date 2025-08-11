import { checkAddress } from '../../../helpers/checkers';
import { verifyContract } from '../../../helpers/verify';
import dotenv from 'dotenv';
dotenv.config();

const NFTFactory_Address = '0xCa673987F1D74552fC25Dd7975848FE6f5F21abC';
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

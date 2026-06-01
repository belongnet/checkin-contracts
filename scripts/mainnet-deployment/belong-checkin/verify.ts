import { verifyContract } from '../../helpers/verify-contract';

const address = '0x3E02292e7A1Fe0EA5682BfADB1Cc7573bf28e4bA';
async function verify() {
  console.log('Verification: ');

  try {
    await verifyContract(address);
  } catch (error) {
    console.error(error);
  }
}

verify();

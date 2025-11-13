import hre from 'hardhat';

export async function verifyContract(address: string, constructorArguments: any[] = []) {
  console.log(`Trying to verifying ${address}\n`);

  try {
    await hre.run('verify:verify', {
      address,
      constructorArguments,
    });
    console.log('Successfully verified!');
  } catch (err) {
    console.log('Verification failed!!!');
    ignoreAlreadyVerifiedError(err);
  }
}

const ignoreAlreadyVerifiedError = (err: any) => {
  if (err.message.includes('Already Verified')) {
    console.log('Contract already verified, skipping');

    return;
  } else {
    throw err;
  }
};

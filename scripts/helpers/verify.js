const hre = require("hardhat");

async function verifyContract(address, constructorArguments = []) {
  console.log(`Trying to verifying ${address}\n`);

  try {
    await hre.run("verify:verify", {
      address,
      constructorArguments,
    });
    console.log("Successfully verified!");
  } catch (err) {
    console.log("Verification failed!!!");
    ignoreAlreadyVerifiedError(err);
  }
}

const ignoreAlreadyVerifiedError = (err) => {
  if (err.message.includes("Already Verified")) {
    console.log("Contract already verified, skipping");

    return;
  } else {
    throw err;
  }
};

module.exports = verifyContract;

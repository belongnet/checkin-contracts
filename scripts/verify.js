const verifyContract = require("./helpers/verify");

const Storage_Address = "0x935AaAE808d09C2BDf6840bB85dB9eC7c82fBA7c";
const NFTFactory_Address = "0xe33ed0F583e68A5291822A64b569c9e39F753637";
const ReceiverFactory_Address = "0xaDcDaBD5b96Af2c89829128321d913CF939d8604";

async function verify() {
  try {
    verifyContract(Storage_Address, []);
    console.log("Storage verification successful.");
  } catch (error) {
    console.error("Storage verification failed:", error);
  }

  try {
    verifyContract(NFTFactory_Address, []);
    console.log("NFTFactory verification successful.");
  } catch (error) {
    console.error("NFTFactory verification failed:", error);
  }

  try {
    verifyContract(ReceiverFactory_Address, []);
    console.log("ReceiverFactory verification successful.");
  } catch (error) {
    console.error("ReceiverFactory verification failed:", error);
  }
}

verify();

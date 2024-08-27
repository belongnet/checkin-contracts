const verifyContract = require("../helpers/verify");

const Storage_Address = "";
const NFTFactory_Address = "";
const ReceiverFactory_Address = "";

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

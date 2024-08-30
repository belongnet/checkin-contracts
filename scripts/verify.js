const verifyContract = require("./helpers/verify");

const Storage_Address = "0xffF664489fa997f6Ec6147fe8D6d459d4C5607dC";
const NFTFactory_Address = "0xE7dd5A4D81Be2b511EA958934e02c216c6C7Ec38";
const ReceiverFactory_Address = "0x3d1f856a1258FEcd940aCD46b3DF3dCD935b4792";
const TransferValidator_Address = "0xaCCF2EB146ec1B84cB505Bf04D99A4C3E8326563";

async function verify() {
  try {
    verifyContract(Storage_Address);
    console.log("Storage verification successful.");
  } catch (error) {
    console.error("Storage verification failed:", error);
  }

  try {
    verifyContract(NFTFactory_Address);
    console.log("NFTFactory verification successful.");
  } catch (error) {
    console.error("NFTFactory verification failed:", error);
  }

  try {
    verifyContract(ReceiverFactory_Address);
    console.log("ReceiverFactory verification successful.");
  } catch (error) {
    console.error("ReceiverFactory verification failed:", error);
  }

  try {
    verifyContract(TransferValidator_Address, [true]);
    console.log("ReceiverFactory verification successful.");
  } catch (error) {
    console.error("ReceiverFactory verification failed:", error);
  }
}

verify();

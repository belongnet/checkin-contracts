import { checkAddress } from "../helpers/checkers";
import { verifyContract } from "../helpers/verify";
import dotenv from "dotenv";
dotenv.config();

const NFTFactory_Address = '0x4b6AC59541F51051E30993e1dC30c55d0983b3d0';
async function verify() {
  console.log("Verification: ");

  checkAddress(NFTFactory_Address);

  try {
    await verifyContract(NFTFactory_Address!);
    console.log("NFTFactory verification successful.");
  } catch (error) {
    console.error("NFTFactory verification failed:", error);
  }

  console.log("Done.");
}

verify();

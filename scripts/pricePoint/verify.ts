import { verifyContract } from "../helpers/verify";

const PricePointFactory_Address = "0x558c10601DA6e40Ba549646aAF80Ea7Bca2B8787"; //0x5D1899c01B3389605FEbC9d0fC8d6B678E8abAce

async function verify() {
  console.log("Verification: ");

  try {
    verifyContract(PricePointFactory_Address);
    console.log("PricePointFactory verification successful.");
  } catch (error) {
    console.error("PricePointFactory verification failed:", error);
  }

  console.log("Done.");
}

verify();

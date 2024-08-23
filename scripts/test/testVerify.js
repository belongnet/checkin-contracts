const verifyContract = require("../helpers/verify");

const address = "0x2a1Ca33F1f0c53dA38b87324b09D9b9Ef19a760e";
const params = [];

async function verify_nft() {
  verifyContract(address, params);
}

verify_nft();

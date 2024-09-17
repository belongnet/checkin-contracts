import { verifyContract } from "./helpers/verify";
import { InstanceInfoStruct, NftParametersStruct } from "../typechain-types/contracts/nft-with-royalties/NFT";

const Storage_Address = "0x55f5662efffb06418DB2b36e98cd53B86BC7D466"; // SKALE_CALYPSO: "0x21e633FAE68838d3B517EBE72f4d01b18dC2b815";
const NFTFactory_Address = "0xf3134745A7d92c7995611E20F54C3044D3d9c937"; // SKALE_CALYPSO: "0xf36BE8463c25e9AA235185dfbe344Fc486Ba7889";
const ReceiverFactory_Address = "0xc1f8923ccee489A68Af11A104B1F74c7adcf0e9f"; // SKALE_CALYPSO: "0x1ee86eA9De1954a04e0DeF1E101CD99D050bDa99";
const TransferValidator_Address = "0xb7a26DC03a9BB0d31b8770e4Fb88027AD705Ba06"; // SKALE_CALYPSO: "0x60157fe5101bcD5168653841Df6Ee0a7BB49B5F8";

const nft_address = "0x4877B0d16da2bC4e4b6D646a57baBb49B19535Bc";
const creator_address = '0x192De36d0A4a23FE101a38a3722557113a8e7F77';

async function verify() {
  console.log("Verification: ");

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

  const info: InstanceInfoStruct = {
    name: "Skale Gas",
    symbol: "skale-gas",
    contractURI: "https://foster-images.s3.us-east-1.amazonaws.com/up/assets/nft/skale-gas/skale-gas.json",
    payingToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    mintPrice: 10000000000000000n,
    whitelistMintPrice: 0,
    transferable: true,
    maxTotalSupply: 9999,
    feeNumerator: 200,
    feeReceiver: '0x192De36d0A4a23FE101a38a3722557113a8e7F77',
    collectionExpire: 0,
    signature: '0x61e25d5c181e6c8cdcf6ac4d8637b602e37fe9cbcc8ea7bd2b3c0148eecdd5c948600acc259a23f51bbad2fe9c166e3cc925c36c29c1b89f023e12fc132ab5c71c'
  }

  const params: NftParametersStruct = {
    storageContract: Storage_Address,
    info,
    creator: creator_address
  }

  try {
    verifyContract(nft_address, [params, TransferValidator_Address]);
    console.log("ReceiverFactory verification successful.");
  } catch (error) {
    console.error("ReceiverFactory verification failed:", error);
  }

  console.log("Done.");
}

verify();

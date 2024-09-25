const { BigNumber } = require("ethers");
const { ethers } = require("hardhat");
const EthCrypto = require("eth-crypto");
const oneWeek = 604800;

const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const Storage_Address = "0x1ee86eA9De1954a04e0DeF1E101CD99D050bDa99";
const NFTFactory_Address = "0x7364f9bf517FcB23a883bEb11cacEf7D1254bb7c";
const ReceiverFactory_Address = "0xE96a7435Ba30342478a076D3aF8c55Ae964e43c2";

const nftName = "InstanceName";
const nftSymbol = "INSMBL";
const contractURI = "ipfs://tbd/contractURI/";
const price = ethers.utils.parseEther("0.03");
const feeNumerator = BigNumber.from("600");
const maxTotalSupply = 10;
const transferable = true;
const chainId = 168587773;

async function deploy() {
  const [deployer] = await ethers.getSigners();

  const blockTimestampNow = (await ethers.provider.getBlock("latest"))
    .timestamp;

  console.log("NFT deployment:");
  const Storage = await ethers.getContractAt(
    "StorageContract",
    Storage_Address
  );
  const NFTFactory = await ethers.getContractAt(
    "NFTFactory",
    NFTFactory_Address
  );

  const message = ethers.utils.solidityKeccak256(
    ["string", "string", "string", "uint96", "address", "uint256"],
    [nftName, nftSymbol, contractURI, feeNumerator, deployer.address, chainId]
  );

  const signature = await deployer.signMessage(message);
  console.log(signature);
  const deadline = blockTimestampNow + oneWeek;
  console.log(deadline);

  const instanceInfoETH = [
    nftName,
    nftSymbol,
    contractURI,
    ETH_ADDRESS,
    price,
    price,
    transferable,
    maxTotalSupply,
    feeNumerator,
    deployer.address,
    blockTimestampNow + oneWeek,
    signature,
  ];

  await NFTFactory.produce(instanceInfoETH);
  const hash = ethers.utils.solidityKeccak256(
    ["string", "string"],
    [nftName, nftSymbol]
  );

  const nftAddress = await Storage.getInstance(hash);

  console.log("Deployed to:", nftAddress.address);

  console.log("Receiver deployment:");
  const ReceiverFactory = await ethers.getContractAt(
    "ReceiverFactory",
    ReceiverFactory_Address
  );

  let tx = await ReceiverFactory.deployReceiver([deployer.address], [10000]);
  let receipt = await tx.wait();
  const receiverAddress = receipt.events[2].args.royaltiesReceiver;
  console.log("Deployed to: ", receiverAddress);
}

deploy();

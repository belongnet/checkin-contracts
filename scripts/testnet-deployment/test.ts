import { ReceiverFactory } from "../../typechain-types";
import { ethers } from "hardhat";

const ReceiverFactory_address = "0xc1f8923ccee489A68Af11A104B1F74c7adcf0e9f";

async function deploy() {
	const RR: ReceiverFactory = await ethers.getContractAt('ReceiverFactory', ReceiverFactory_address);
	const tx = await RR.deployReceiver(["0x8eE651E9791e4Fe615796303F48856C1Cf73C885", "0x192De36d0A4a23FE101a38a3722557113a8e7F77"], [2000, 8000]);

	const receipt = (await tx.wait()).events!;
	const receiverAddress = receipt[2].args!.royaltiesReceiver;

	console.log("Address", receiverAddress);
}

deploy();

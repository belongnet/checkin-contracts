import { ethers } from "hardhat";
import { ContractFactory } from "ethers";
import { USDCMock, WETHMock } from "../../typechain-types";

async function deploy() {
	console.log("Deploying:");

	console.log("USDCMock:");
	const USDCMock: ContractFactory = await ethers.getContractFactory("USDCMock");
	const usdc: USDCMock = await USDCMock.deploy() as USDCMock;
	await usdc.deployed();
	console.log("USDCMock to: ", usdc.address);

	console.log("WETHMock:");
	const WETHMock: ContractFactory = await ethers.getContractFactory("WETHMock");
	const weth: WETHMock = await WETHMock.deploy() as WETHMock;
	await weth.deployed();
	console.log("WETHMock to: ", weth.address);

	console.log("Done.");
}

deploy();

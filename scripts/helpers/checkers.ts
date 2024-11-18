import { ethers } from "hardhat";

export function defaultParamsCheck(paramToCheck: string | undefined, defaultParam: string | number): string | number {
	if (paramToCheck === undefined || paramToCheck.trim() === '') {
		return defaultParam;
	}

	if (/^-?\d+(\.\d+)?$/.test(paramToCheck)) {
		return Number(paramToCheck);
	}

	return paramToCheck;
}

export function checkAddress(address: string | undefined): void {
	if (address === undefined || address.trim() === '' || !ethers.utils.isAddress(address)) {
		throw Error(`Invalid Ethereum address provided: ${address}`);
	}
}

export function checkNumber(number: number | undefined): void {
	if (number === undefined || number.toString().trim() === '' || isNaN(Number(number))) {
		throw Error(`Invalid number provided: ${number}`);
	}
}

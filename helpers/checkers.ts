import { BigNumberish, BytesLike } from 'ethers';
import { isBytesLike } from 'ethers/lib/utils';
import { ethers } from 'hardhat';

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
  checkString(address);

  if (!ethers.utils.isAddress(address!)) {
    throw Error(`Invalid Ethereum address provided: ${address}`);
  }
}

export function checkNumber(number: number | BigNumberish | undefined): void {
  if (number === undefined || number.toString().trim() === '' || isNaN(Number(number))) {
    throw Error(`Invalid number provided: ${number}`);
  }
}

export function checkString(param: string | undefined): void {
  if (param === undefined || param.toString().trim() === '') {
    throw Error(`Invalid string provided: ${param}`);
  }
}

export function checkBytesLike(param: string | BytesLike | undefined): void {
  if (!isBytesLike(param)) {
    throw Error(`Invalid BytesLike provided: ${param}`);
  }
}

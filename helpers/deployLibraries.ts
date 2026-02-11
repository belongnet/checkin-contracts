import { ContractFactory } from 'ethers';
import { ethers } from 'hardhat';

import { Helper, SignatureVerifier } from '../typechain-types';

export async function deploySignatureVerifier(): Promise<SignatureVerifier> {
  const SignatureVerifier: ContractFactory = await ethers.getContractFactory('SignatureVerifier');
  const signatureVerifier: SignatureVerifier = (await SignatureVerifier.deploy()) as SignatureVerifier;
  await signatureVerifier.deployed();
  return signatureVerifier;
}

export async function deployHelper(): Promise<Helper> {
  const Helper: ContractFactory = await ethers.getContractFactory('Helper');
  const helper: Helper = (await Helper.deploy()) as Helper;
  await helper.deployed();
  return helper;
}

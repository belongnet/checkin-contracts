import { ethers } from 'hardhat';
import {
  MockTransferValidatorV2,
  WETHMock,
  LONGPriceFeedMockV1,
  LONGPriceFeedMockV2,
  LONGPriceFeedMockV3,
} from '../../../typechain-types';
import { ContractFactory } from 'ethers';

export async function deployWETHMock(): Promise<WETHMock> {
  const WETHMock: ContractFactory = await ethers.getContractFactory('WETHMock');
  const wethMock: WETHMock = (await WETHMock.deploy()) as WETHMock;
  await wethMock.deployed();
  return wethMock;
}

export async function deployMockTransferValidatorV2(): Promise<MockTransferValidatorV2> {
  const MockTransferValidatorV2: ContractFactory = await ethers.getContractFactory('MockTransferValidatorV2');
  const mockTransferValidatorV2: MockTransferValidatorV2 = (await MockTransferValidatorV2.deploy(
    true,
  )) as MockTransferValidatorV2;
  await mockTransferValidatorV2.deployed();
  return mockTransferValidatorV2;
}

export async function deployPriceFeeds(): Promise<{
  pf1: LONGPriceFeedMockV1;
  pf2: LONGPriceFeedMockV2;
  pf3: LONGPriceFeedMockV3;
}> {
  const LONGPriceFeedMockV1: ContractFactory = await ethers.getContractFactory('LONGPriceFeedMockV1');
  const longPriceFeedMockV1: LONGPriceFeedMockV1 = (await LONGPriceFeedMockV1.deploy()) as LONGPriceFeedMockV1;
  await longPriceFeedMockV1.deployed();

  const LONGPriceFeedMockV2: ContractFactory = await ethers.getContractFactory('LONGPriceFeedMockV2');
  const longPriceFeedMockV2: LONGPriceFeedMockV2 = (await LONGPriceFeedMockV2.deploy()) as LONGPriceFeedMockV2;
  await longPriceFeedMockV2.deployed();

  const LONGPriceFeedMockV3: ContractFactory = await ethers.getContractFactory('LONGPriceFeedMockV3');
  const longPriceFeedMockV3: LONGPriceFeedMockV3 = (await LONGPriceFeedMockV3.deploy()) as LONGPriceFeedMockV3;
  await longPriceFeedMockV3.deployed();

  return { pf1: longPriceFeedMockV1, pf2: longPriceFeedMockV2, pf3: longPriceFeedMockV3 };
}

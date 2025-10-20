import { createTransportReplayer, openTransportReplayer, RecordStore } from '@ledgerhq/hw-transport-mocker';
import Eth from '@ledgerhq/hw-app-eth';
import { ethers, upgrades } from 'hardhat';
import { checkNumber, defaultParamsCheck } from '../../helpers/checkers';
import { NFTFactory, NftFactoryParametersStruct } from '../../typechain-types/contracts/factories/NFTFactory';
import { ContractFactory } from 'ethers';

const signerAddress = process.env.SIGNER_ADDRESS;
const platformAddress = process.env.PLATFORM_ADDRESS;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const platformCommission = defaultParamsCheck(process.env.PLATFORM_COMMISSION, 200) as number;
const transferValidator = defaultParamsCheck(process.env.TRANSFER_VALIDATOR, ZERO_ADDRESS) as string;
const defaultPaymentCurrency = defaultParamsCheck(process.env.PAYMENT_CURRENCY, ETH_ADDRESS) as string;
const maxArraySize = defaultParamsCheck(process.env.MAX_ARRAY_SIZE, 20) as number;

const referralPercentages: number[] = [
  0,
  defaultParamsCheck(process.env.REFERRAL_PERCENT_FIRST_TIME_USAGE, 5000) as number,
  defaultParamsCheck(process.env.REFERRAL_PERCENT_SECOND_TIME_USAGE, 3000) as number,
  defaultParamsCheck(process.env.REFERRAL_PERCENT_THIRD_TIME_USAGE, 1500) as number,
  defaultParamsCheck(process.env.REFERRAL_PERCENT_THIRD_TIME_USAGE, 500) as number,
];

const factoryParams = {
  transferValidator,
  platformAddress,
  signerAddress,
  platformCommission,
  defaultPaymentCurrency,
  maxArraySize,
} as NftFactoryParametersStruct;

async function mockLedgerSigner() {
  const transport = await openTransportReplayer(RecordStore.fromString(''));

  const eth = new Eth(transport);

  const mockAddress = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

  return {
    getAddress: async () => mockAddress,
    signTransaction: async tx => {
      console.log('Mock Ledger підписує транзакцію:', tx);
      return ethers.utils.serializeTransaction(tx);
    },
    signMessage: async msg => {
      console.log('Mock Ledger підписує повідомлення:', msg);
      return '0xMockSignature';
    },
  };
}

async function main() {
  let deployer = await mockLedgerSigner();

  console.log(`Account: ${await deployer.getAddress()}`);

  const NFTFactory: ContractFactory = await ethers.getContractFactory('NFTFactory');
  const factory: NFTFactory = (await upgrades.deployProxy(NFTFactory, [
    factoryParams,
    referralPercentages,
  ])) as NFTFactory;
  await factory.deployed();

  console.log(`NFTFactory: ${factory.address}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});

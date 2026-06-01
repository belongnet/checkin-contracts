import { expect } from 'chai';
import { BigNumber, Contract } from 'ethers';
import { ethers } from 'hardhat';

import { deployDualDexSwapV4Lib } from '../../../helpers/deployFixtures';
import { getToken, startSimulateBSC, startSimulateMainnet, stopSimulate } from '../../../helpers/fork';
import {
  discoverPcsPoolKeyOnFork,
  PCS_CL_POOL_MANAGER,
  PCS_V4_ROUTER,
  USDT_ADDRESS as BSC_USDT_ADDRESS,
  WBNB_ADDRESS,
} from '../../../helpers/pcs';
import { discoverUniPoolKeyOnFork, UNI_V4_ROUTER, USDC_ADDRESS, WETH_ADDRESS } from '../../../helpers/uni';
import { DualDexSwapV4Lib, DualDexSwapV4LibHarness } from '../../../typechain-types';
import { DualDexSwapV4Lib as DualDexSwapV4LibType } from '../../../typechain-types/contracts/v2/platform/extensions/DualDexSwapV4';

enum DexType {
  UniV4,
  PcsV4,
  PcsV3,
  UniV3,
}

const WRAPPED_NATIVE_ABI = [
  'function deposit() external payable',
  'function transfer(address to,uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
];

const runMainnetForkTests = !!(
  process.env.MAINNET_RPC_URL ||
  process.env.ETH_RPC_URL ||
  process.env.ETHEREUM_RPC_URL ||
  process.env.INFURA_ID_PROJECT
);
const runBscForkTests = !!process.env.BSC_RPC_URL;

const describeMainnetFork = runMainnetForkTests ? describe : describe.skip;
const describeBscFork = runBscForkTests ? describe : describe.skip;

if (!runMainnetForkTests) {
  console.warn(
    'Skipping Uniswap v4 mainnet fork tests (set MAINNET_RPC_URL, ETH_RPC_URL, ETHEREUM_RPC_URL, or INFURA_ID_PROJECT).',
  );
}

if (!runBscForkTests) {
  console.warn('Skipping PancakeSwap v4 BSC fork tests (set BSC_RPC_URL).');
}

async function deployHarness(): Promise<DualDexSwapV4LibHarness> {
  const dualDexSwapV4Lib: DualDexSwapV4Lib = await deployDualDexSwapV4Lib();
  const HarnessFactory = await ethers.getContractFactory('DualDexSwapV4LibHarness', {
    libraries: { DualDexSwapV4Lib: dualDexSwapV4Lib.address },
  });
  const harness = (await HarnessFactory.deploy()) as DualDexSwapV4LibHarness;
  await harness.deployed();
  return harness;
}

async function wrapAndTransferToHarness(tokenAddress: string, amount: BigNumber, harnessAddress: string) {
  const [sender] = await ethers.getSigners();
  const wrapped = new Contract(tokenAddress, WRAPPED_NATIVE_ABI, sender);
  await wrapped.deposit({ value: amount });
  await wrapped.transfer(harnessAddress, amount);
}

describeMainnetFork('DualDexSwapV4Lib real Ethereum mainnet fork', () => {
  afterEach(stopSimulate);

  it('executes a real Uniswap v4 WETH -> USDC swap through Universal Router', async () => {
    await startSimulateMainnet();

    const [recipient] = await ethers.getSigners();
    const harness = await deployHarness();
    const amountIn = ethers.utils.parseEther('0.01');

    const pool = await discoverUniPoolKeyOnFork({
      tokenIn: WETH_ADDRESS,
      tokenOut: USDC_ADDRESS,
      probeAmount: amountIn,
    });

    await wrapAndTransferToHarness(WETH_ADDRESS, amountIn, harness.address);

    const usdc = await getToken(USDC_ADDRESS);
    const beforeBalance = await usdc.balanceOf(recipient.address);

    const paymentsInfo = {
      dexType: DexType.UniV4,
      slippageBps: 0,
      router: UNI_V4_ROUTER,
      usdToken: USDC_ADDRESS,
      long: WETH_ADDRESS,
      maxPriceFeedDelay: 0,
      poolKey: pool.poolKey,
      hookData: '0x',
    } as DualDexSwapV4LibType.PaymentsInfoStruct;

    await harness.swapExact(paymentsInfo, {
      tokenIn: WETH_ADDRESS,
      tokenOut: USDC_ADDRESS,
      amountIn,
      amountOutMinimum: pool.amountOut.mul(90).div(100),
      deadline: Math.floor(Date.now() / 1000) + 300,
      poolKey: pool.poolKey,
      hookData: '0x',
      recipient: recipient.address,
    });

    const received = (await usdc.balanceOf(recipient.address)).sub(beforeBalance);
    expect(received).to.be.gt(0);
  });
});

describeBscFork('DualDexSwapV4Lib real BSC mainnet fork', () => {
  afterEach(stopSimulate);

  it('executes a real PancakeSwap Infinity WBNB -> USDT swap through Universal Router', async () => {
    await startSimulateBSC();

    const [recipient] = await ethers.getSigners();
    const harness = await deployHarness();
    const amountIn = ethers.utils.parseEther('0.01');

    const pool = await discoverPcsPoolKeyOnFork({
      tokenIn: WBNB_ADDRESS,
      tokenOut: BSC_USDT_ADDRESS,
      poolManager: PCS_CL_POOL_MANAGER,
      probeAmount: amountIn,
    });

    await wrapAndTransferToHarness(WBNB_ADDRESS, amountIn, harness.address);

    const usdt = await getToken(BSC_USDT_ADDRESS);
    const beforeBalance = await usdt.balanceOf(recipient.address);

    const paymentsInfo = {
      dexType: DexType.PcsV4,
      slippageBps: 0,
      router: PCS_V4_ROUTER,
      usdToken: BSC_USDT_ADDRESS,
      long: WBNB_ADDRESS,
      maxPriceFeedDelay: 0,
      poolKey: pool.poolKey,
      hookData: '0x',
    } as DualDexSwapV4LibType.PaymentsInfoStruct;

    await harness.swapExact(paymentsInfo, {
      tokenIn: WBNB_ADDRESS,
      tokenOut: BSC_USDT_ADDRESS,
      amountIn,
      amountOutMinimum: pool.amountOut.mul(90).div(100),
      deadline: Math.floor(Date.now() / 1000) + 300,
      poolKey: pool.poolKey,
      hookData: '0x',
      recipient: recipient.address,
    });

    const received = (await usdt.balanceOf(recipient.address)).sub(beforeBalance);
    expect(received).to.be.gt(0);
  });
});

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
import { artifacts, ethers } from 'hardhat';

import { encodePcsPoolKey } from '../../../helpers/math';

enum DexType {
  UniV4,
  PcsV4,
  PcsV3,
  UniV3,
}

function encodeUniPoolKey(tokenA: string, tokenB: string, fee: number, tickSpacing: number, hooks: string): string {
  const [currency0, currency1] = BigNumber.from(tokenA).lt(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];
  return ethers.utils.defaultAbiCoder.encode(
    ['tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks)'],
    [[currency0, currency1, fee, tickSpacing, hooks]],
  );
}

const UNI_PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
const PCS_PERMIT2 = '0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768';
const MAX_UINT48 = BigNumber.from(2).pow(48).sub(1);

describe('DualDexSwapV4Lib', () => {
  async function fixture() {
    await ethers.provider.send('hardhat_reset', []);
    const [deployer, recipient] = await ethers.getSigners();

    const permit2Artifact = await artifacts.readArtifact('MockPermit2');
    await ethers.provider.send('hardhat_setCode', [UNI_PERMIT2, permit2Artifact.deployedBytecode]);
    await ethers.provider.send('hardhat_setCode', [PCS_PERMIT2, permit2Artifact.deployedBytecode]);
    const uniPermit2 = await ethers.getContractAt('MockPermit2', UNI_PERMIT2);
    const pcsPermit2 = await ethers.getContractAt('MockPermit2', PCS_PERMIT2);

    const ERC20Factory = await ethers.getContractFactory('WETHMock');
    const usd = await ERC20Factory.deploy();
    await usd.deployed();
    const long = await ERC20Factory.deploy();
    await long.deployed();

    const rate1to1 = ethers.utils.parseUnits('1', 18);
    const LibFactory = await ethers.getContractFactory('DualDexSwapV4Lib');
    const lib = await LibFactory.deploy();
    await lib.deployed();

    const RouterFactory = await ethers.getContractFactory('MockUniV4Router');
    const router = await RouterFactory.deploy(usd.address, long.address, rate1to1);
    await router.deployed();

    const PcsPermit2RouterFactory = await ethers.getContractFactory('MockPcsV4Permit2Router');
    const pcsPermit2Router = await PcsPermit2RouterFactory.deploy(PCS_PERMIT2, usd.address, long.address, rate1to1);
    await pcsPermit2Router.deployed();

    const HarnessFactory = await ethers.getContractFactory('DualDexSwapV4LibHarness', {
      libraries: { DualDexSwapV4Lib: lib.address },
    });
    const harness = await HarnessFactory.deploy();
    await harness.deployed();

    const poolKey = encodeUniPoolKey(usd.address, long.address, 3000, 10, ethers.constants.AddressZero);
    const paymentsInfo = {
      dexType: DexType.UniV4,
      slippageBps: 0,
      router: router.address,
      usdToken: usd.address,
      long: long.address,
      maxPriceFeedDelay: 0,
      poolKey,
      hookData: '0x',
    };

    const pcsPoolKey = encodePcsPoolKey(
      usd.address,
      long.address,
      pcsPermit2Router.address,
      500,
      10,
      ethers.constants.AddressZero,
    );
    const paymentsInfoPcs = {
      dexType: DexType.PcsV4,
      slippageBps: 0,
      router: pcsPermit2Router.address,
      usdToken: usd.address,
      long: long.address,
      maxPriceFeedDelay: 0,
      poolKey: pcsPoolKey,
      hookData: '0x',
    };

    const routerFloat = ethers.utils.parseEther('1000000');
    await usd.mint(router.address, routerFloat);
    await long.mint(router.address, routerFloat);
    await usd.mint(pcsPermit2Router.address, routerFloat);
    await long.mint(pcsPermit2Router.address, routerFloat);

    return {
      deployer,
      recipient,
      usd,
      long,
      router,
      pcsPermit2Router,
      harness,
      paymentsInfo,
      paymentsInfoPcs,
      rate1to1,
      lib,
      uniPermit2,
      pcsPermit2,
    };
  }

  it('swaps USD -> LONG and clears allowance', async () => {
    const { recipient, usd, long, router, harness, paymentsInfo, uniPermit2 } = await loadFixture(fixture);

    const amountIn = ethers.utils.parseEther('10');
    await usd.mint(harness.address, amountIn);
    await harness.approveToken(usd.address, router.address, amountIn);
    expect(await usd.allowance(harness.address, router.address)).to.eq(amountIn);

    const tx = await harness.swapUSDtokenToLONG(paymentsInfo, recipient.address, amountIn, amountIn, 0);

    await expect(tx).to.emit(router, 'MockSwap').withArgs(harness.address, recipient.address, amountIn, amountIn);
    await expect(tx)
      .to.emit(uniPermit2, 'Approval')
      .withArgs(harness.address, usd.address, router.address, amountIn, MAX_UINT48);
  });

  it('uses Pancake Permit2 for PCS v4 swaps', async () => {
    const { recipient, usd, pcsPermit2Router, harness, paymentsInfoPcs, pcsPermit2 } = await loadFixture(fixture);

    const amountIn = ethers.utils.parseEther('10');
    await usd.mint(harness.address, amountIn);

    const tx = await harness.swapUSDtokenToLONG(paymentsInfoPcs, recipient.address, amountIn, amountIn, 0);

    await expect(tx)
      .to.emit(pcsPermit2Router, 'MockSwap')
      .withArgs(harness.address, recipient.address, amountIn, amountIn);
    await expect(tx)
      .to.emit(pcsPermit2, 'Approval')
      .withArgs(harness.address, usd.address, pcsPermit2Router.address, amountIn, MAX_UINT48);
  });

  it('forwards minOut to the router', async () => {
    const { recipient, usd, harness, paymentsInfo } = await loadFixture(fixture);

    const amountIn = ethers.utils.parseEther('1');
    await usd.mint(harness.address, amountIn);

    await expect(
      harness.swapUSDtokenToLONG(paymentsInfo, recipient.address, amountIn, amountIn.add(1), 0),
    ).to.be.revertedWith('MockUniV4Router: slippage');
  });

  it('reverts on pool/token mismatch', async () => {
    const { recipient, usd, harness, paymentsInfo, lib } = await loadFixture(fixture);

    const amountIn = ethers.utils.parseEther('1');
    await usd.mint(harness.address, amountIn);

    const badParams = {
      tokenIn: usd.address,
      tokenOut: usd.address,
      amountIn,
      amountOutMinimum: 0,
      deadline: 0,
      poolKey: paymentsInfo.poolKey,
      hookData: '0x',
      recipient: recipient.address,
    };

    await expect(harness.swapExact(paymentsInfo, badParams)).to.be.revertedWithCustomError(lib, 'PoolTokenMismatch');
  });

  it('reverts on malformed multi-hop paths', async () => {
    const { recipient, usd, harness, paymentsInfo, lib } = await loadFixture(fixture);

    await expect(
      harness.swapExactPath(paymentsInfo, {
        tokens: [usd.address],
        poolKeys: [],
        amountIn: ethers.utils.parseEther('1'),
        amountOutMinimum: 0,
        deadline: 0,
        hookData: '0x',
        recipient: recipient.address,
      }),
    ).to.be.revertedWithCustomError(lib, 'PoolKeyMissing');
  });
});

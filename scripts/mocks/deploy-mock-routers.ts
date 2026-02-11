import dotenv from 'dotenv';
import fs from 'fs';
import { ethers } from 'hardhat';

import { verifyContract } from '../../helpers/verify';

dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true;
const VERIFY = ENV_VERIFY ?? true;

async function main() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }
  deployments.mocks = deployments.mocks || {};

  const fromEnv = (v?: string) => (v && v.trim().length > 0 ? v.trim() : undefined);

  let usd = fromEnv(process.env.USDC_ADDRESS);
  const rateEnv = process.env.MOCK_SWAP_RATE || '1000000000000000000'; // 1e18 => 1:1
  let poolManagerAddr = fromEnv(deployments.mocks.poolManager);
  let uniRouterAddr = fromEnv(deployments.mocks.uniV4Router);
  let pcsRouterAddr = fromEnv(deployments.mocks.pcsV4Router);

  const rate = ethers.BigNumber.from(rateEnv);
  if (rate.isZero()) {
    throw new Error('MOCK_SWAP_RATE must be > 0');
  }

  // LONG must come from existing deployments (or explicit env override)
  let long = fromEnv(process.env.LONG_ADDRESS) ?? fromEnv(deployments.tokens?.long);

  if (DEPLOY) {
    // Deploy a mock USDC if none provided
    if (!usd) {
      console.log('USDC_ADDRESS not provided, deploying USDCMock (6 decimals)...');
      const UsdcMock = await ethers.getContractFactory('USDCMock');
      const usdMock = await UsdcMock.deploy();
      await usdMock.deployed();
      const [signer] = await ethers.getSigners();
      await (await usdMock.mint(await signer.getAddress(), ethers.utils.parseUnits('1000000', 6))).wait();
      usd = usdMock.address;
      deployments.mocks.mockUsdc = usd;
      console.log('Mock USDC deployed at:', usd);
    }

    // Deploy a mock LONG if none provided
    if (!long) {
      throw new Error(
        'LONG_ADDRESS not provided and no deployments.tokens.long found, deploying WETHMock as LONG (18 decimals)...',
      );
    }

    console.log('Deploying mock routers/quoter with rate:', rate.toString());

    // Mock pool manager stub
    const PoolManager = await ethers.getContractFactory('MockPoolManager');
    const poolManager = await PoolManager.deploy();
    await poolManager.deployed();
    const sqrtPriceX96 = ethers.BigNumber.from(2).pow(96); // price = 1.0
    await (await poolManager.setSlot0(sqrtPriceX96, 0, 0, 300)).wait();
    await (await poolManager.setLiquidity(ethers.utils.parseEther('1000'))).wait();
    poolManagerAddr = poolManager.address;
    console.log('MockPoolManager:', poolManagerAddr);

    // Mock Uniswap v4
    const UniRouter = await ethers.getContractFactory('MockUniV4Router');
    const uniRouter = await UniRouter.deploy(usd, long, rate);
    await uniRouter.deployed();
    uniRouterAddr = uniRouter.address;
    console.log('MockUniV4Router:', uniRouterAddr);

    // Mock Pancake Infinity (v4)
    const PcsRouter = await ethers.getContractFactory('MockPcsV4Router');
    const pcsRouter = await PcsRouter.deploy(usd, long, rate);
    await pcsRouter.deployed();
    pcsRouterAddr = pcsRouter.address;
    console.log('MockPcsV4Router:', pcsRouterAddr);

    deployments.mocks.poolManager = poolManagerAddr;
    deployments.mocks.uniV4Router = uniRouterAddr;
    deployments.mocks.pcsV4Router = pcsRouterAddr;
    deployments.mocks.rate = rate.toString();

    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log(`Mocks written to ${deploymentFile}`);
  }

  if (VERIFY) {
    console.log('Verification:');
    if (uniRouterAddr) {
      try {
        await verifyContract(uniRouterAddr, [usd, long, rate]);
        console.log('MockUniV4Router verified');
      } catch (e) {
        console.error('MockUniV4Router verification failed:', e);
      }
    }
    if (pcsRouterAddr) {
      try {
        await verifyContract(pcsRouterAddr, [usd, long, rate]);
        console.log('MockPcsV4Router verified');
      } catch (e) {
        console.error('MockPcsV4Router verification failed:', e);
      }
    }
    if (poolManagerAddr) {
      try {
        await verifyContract(poolManagerAddr);
        console.log('MockPoolManager verified');
      } catch (e) {
        console.error('MockPoolManager verification failed:', e);
      }
    }
    if (deployments.mocks.mockUsdc) {
      try {
        await verifyContract(deployments.mocks.mockUsdc);
        console.log('Mock USDC verified');
      } catch (e) {
        console.error('Mock USDC verification failed:', e);
      }
    }
    if (deployments.mocks.mockLong) {
      try {
        await verifyContract(deployments.mocks.mockLong);
        console.log('Mock LONG verified');
      } catch (e) {
        console.error('Mock LONG verification failed:', e);
      }
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

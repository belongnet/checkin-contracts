import dotenv from 'dotenv';
import fs from 'fs';
import { verifyContract } from '../../../helpers/verify';
import { ethers } from 'hardhat';
import { Helper, SignatureVerifier, LONG, Staking, Escrow, TapAndEarn } from '../../../typechain-types';
import { deployHelper, deploySignatureVerifier } from '../../../helpers/deployLibraries';
import { deployEscrow, deployLONG, deployStaking, deployTapAndEarn } from '../../../helpers/deployFixtures';
dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true; // <-- ENV_UPGRADE is `false` (not nullish), so UPGRADE=false
const VERIFY = ENV_VERIFY ?? true; // same

async function deploy() {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDirectory = 'deployments';
  const deploymentFile = `${deploymentsDirectory}/chainId-${chainId}.json`;
  // Ensure deployments directory exists
  if (!fs.existsSync(deploymentsDirectory)) {
    fs.mkdirSync(deploymentsDirectory, { recursive: true });
  }
  // Initialize deployments object
  let deployments: any = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  if (DEPLOY) {
    console.log('For LONG deployment: ');
    const mintToAddress = process.env.MINT_LONG_TO;
    const amountToMint = process.env.LONG_AMOUNT_TO_MINT;
    const adminAddress = process.env.ADMIN_ADDRESS;
    const pauserAddress = process.env.PAUSER_ADDRESS;
    if (!mintToAddress || !amountToMint || !adminAddress || !pauserAddress) {
      throw new Error(
        'Missing required environment variables: MINT_LONG_TO, LONG_AMOUNT_TO_MINT, ADMIN_ADDRESS, PAUSER_ADDRESS',
      );
    }
    console.log('Everything specified!');

    console.log('For TapAndEarn deployment: ');
    const uniswapPoolFees = process.env.UNISWAPV3_POOL_FEES;
    const uniswapV3Router = process.env.UNISWAPV3_ROUTER_ADDRESS;
    const uniswapV3Quoter = process.env.UNISWAPV3_QUOTER_ADDRESS;
    const weth = process.env.WETH_ADDRESS;
    const usdc = process.env.USDC_ADDRESS;
    if (!uniswapPoolFees || !uniswapV3Router || !uniswapV3Quoter || !weth || !usdc) {
      throw new Error(
        'Missing required environment variables: UNISWAPV3_POOL_FEES, UNISWAPV3_ROUTER_ADDRESS, UNISWAPV3_QUOTER_ADDRESS, WETH_ADDRESS, USDC_ADDRESS',
      );
    }
    console.log('Everything specified!');

    console.log('For Staking deployment: ');
    const treasury = process.env.TREASURY_ADDRESS;
    if (!treasury) {
      throw new Error('Missing required environment variables: TREASURY_ADDRESS');
    }
    console.log('Everything specified!');

    console.log('For TapAndEarn configuration: ');
    const factoryAddress = process.env.FACTORY;
    const venueTokenAddress = process.env.VENUE_TOKEN;
    const promoterTokenAddress = process.env.PROMOTER_TOKEN;
    const longPriceFeedAddress = process.env.LONG_PRICE_FEED;
    if (!factoryAddress || !venueTokenAddress || !promoterTokenAddress || !longPriceFeedAddress) {
      throw new Error('Missing required environment variables: FACTORY, VENUE_TOKEN, PROMOTER_TOKEN, LONG_PRICE_FEED');
    }
    console.log('Everything specified!');

    // Deploy Helper
    console.log('Deploying Helper contract...');
    const helper: Helper = await deployHelper();
    deployments.Helper = {
      address: helper.address,
    };
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed Helper to:', helper.address);

    // Deploy SignatureVerifier
    console.log('Deploying SignatureVerifier contract...');
    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();
    deployments.SignatureVerifier = {
      address: signatureVerifier.address,
    };
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed SignatureVerifier to:', signatureVerifier.address);

    // Deploy LONG
    console.log('Deploying LONG contract...');
    // Validate addresses (exclude amountToMint)
    [mintToAddress, adminAddress, pauserAddress].forEach(addr => {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    });
    // Validate amountToMint
    if (isNaN(parseInt(amountToMint)) || parseInt(amountToMint) <= 0) {
      throw new Error(`Invalid LONG_AMOUNT_TO_MINT: ${amountToMint}`);
    }
    const long: LONG = await deployLONG(mintToAddress, adminAddress, pauserAddress);
    deployments.LONG = {
      address: long.address,
      parameters: [mintToAddress, amountToMint, adminAddress, pauserAddress],
    };
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed LONG to:', long.address);

    // Deploy TapAndEarn
    console.log('Deploying TapAndEarn contract...');
    // Validate addresses
    [adminAddress, uniswapV3Router, uniswapV3Quoter, weth, usdc].forEach(addr => {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    });
    const poolFees = parseInt(uniswapPoolFees, 10);
    if (isNaN(poolFees) || poolFees <= 0) {
      throw new Error(`Invalid Uniswap pool fees: ${uniswapPoolFees}`);
    }
    const paymentsInfo = {
      uniswapPoolFees: poolFees,
      uniswapV3Router,
      uniswapV3Quoter,
      weth,
      usdc,
      long: long.address,
    } as TapAndEarn.PaymentsInfoStruct;
    const tapAndEarn: TapAndEarn = await deployTapAndEarn(
      signatureVerifier.address,
      helper.address,
      adminAddress,
      paymentsInfo,
    );
    deployments.TapAndEarn = {
      address: tapAndEarn.address,
      parameters: [signatureVerifier.address, helper.address, adminAddress, paymentsInfo],
    };
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed TapAndEarn to:', tapAndEarn.address);

    // Deploy Escrow
    console.log('Deploying Escrow contract...');
    const escrow: Escrow = await deployEscrow(tapAndEarn.address);
    deployments.Escrow = {
      address: escrow.address,
      parameters: [tapAndEarn.address],
    };
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed Escrow to:', escrow.address);

    // Deploy Staking
    console.log('Deploying Staking contract...');
    [adminAddress, treasury].forEach(addr => {
      if (!ethers.utils.isAddress(addr)) {
        throw new Error(`Invalid address: ${addr}`);
      }
    });
    const staking: Staking = await deployStaking(adminAddress, treasury, long.address);
    deployments.Staking = {
      address: staking.address,
      parameters: [adminAddress, treasury, long.address],
    };
    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log('Deployed Staking to:', staking.address);

    // Set up TapAndEarn
    console.log('Setting up TapAndEarn contract...');

    const contracts = {
      factory: factoryAddress,
      escrow: escrow.address,
      staking: staking.address,
      venueToken: venueTokenAddress,
      promoterToken: promoterTokenAddress,
      longPF: longPriceFeedAddress,
    };

    await tapAndEarn.setContracts(contracts);
    console.log('All deployments done.');
  }

  if (VERIFY) {
    console.log('Verification:');
    // Verify Helper
    try {
      if (deployments.Helper?.address) {
        await verifyContract(deployments.Helper.address);
        console.log('Helper verification successful.');
      }
    } catch (error) {
      console.error('Helper verification failed:', error);
    }
    // Verify SignatureVerifier
    try {
      if (deployments.SignatureVerifier?.address) {
        await verifyContract(deployments.SignatureVerifier.address);
        console.log('SignatureVerifier verification successful.');
      }
    } catch (error) {
      console.error('SignatureVerifier verification failed:', error);
    }
    // Verify LONG
    try {
      if (deployments.LONG?.address && deployments.LONG?.parameters) {
        await verifyContract(deployments.LONG.address, deployments.LONG.parameters);
        console.log('LONG verification successful.');
      }
    } catch (error) {
      console.error('LONG verification failed:', error);
    }
    // Verify TapAndEarn
    try {
      if (deployments.TapAndEarn?.address) {
        await verifyContract(deployments.TapAndEarn.address);
        console.log('TapAndEarn verification successful.');
      }
    } catch (error) {
      console.error('TapAndEarn verification failed:', error);
    }
    // Verify Escrow
    try {
      if (deployments.Escrow?.address) {
        await verifyContract(deployments.Escrow.address);
        console.log('Escrow verification successful.');
      }
    } catch (error) {
      console.error('Escrow verification failed:', error);
    }
    // Verify Staking
    try {
      if (deployments.Staking?.address && deployments.Staking?.parameters) {
        await verifyContract(deployments.Staking.address, deployments.Staking.parameters);
        console.log('Staking verification successful.');
      }
    } catch (error) {
      console.error('Staking verification failed:', error);
    }
    console.log('Done.');
  }
}

deploy().catch(error => {
  console.error('Deployment script failed:', error);
  process.exit(1);
});

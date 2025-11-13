import dotenv from 'dotenv';
import { BigNumber } from 'ethers';
import { ethers } from 'hardhat';

import { deployAccessToken } from '../../../helpers/deployFixtures';
import { verifyContract } from '../../../helpers/verify';

import fs from 'fs';

dotenv.config();

const ENV_DEPLOY = process.env.DEPLOY?.toLowerCase() === 'true';
const ENV_VERIFY = process.env.VERIFY?.toLowerCase() === 'true';
const DEPLOY = ENV_DEPLOY ?? true;
const VERIFY = ENV_VERIFY ?? true;

interface DeploymentRecord {
  nftFactory?: {
    proxy?: string;
    parameters?: any;
  };
  accessTokens?: Array<{
    address: string;
    metadata: {
      name: string;
      symbol: string;
      uri: string;
    };
    mintPrice: string;
    whitelistMintPrice: string;
    paymentToken: string;
    referralCode: string;
    creator: string;
    feeNumerator: string;
    maxTotalSupply: string;
    collectionExpire: string;
    transferable: boolean;
    signature: string;
    royaltiesReceiver: string;
  }>;
}

async function main() {
  const [creator] = await ethers.getSigners();
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const deploymentsDir = 'deployments';
  const deploymentFile = `${deploymentsDir}/chainId-${chainId}.json`;

  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  let deployments: DeploymentRecord = {};
  if (fs.existsSync(deploymentFile)) {
    deployments = JSON.parse(fs.readFileSync(deploymentFile, 'utf-8'));
  }

  deployments.accessTokens = deployments.accessTokens ?? [];

  const factoryAddress = deployments.nftFactory?.proxy ?? process.env.NFT_FACTORY_ADDRESS;
  const signerPk = process.env.SIGNER_PK;
  const tokenName = process.env.ACCESS_TOKEN_NAME;
  const tokenSymbol = process.env.ACCESS_TOKEN_SYMBOL;
  const contractURI = process.env.ACCESS_TOKEN_URI;
  const mintPriceRaw = process.env.ACCESS_TOKEN_MINT_PRICE;
  const whitelistMintPriceRaw = process.env.ACCESS_TOKEN_WHITELIST_PRICE ?? mintPriceRaw;
  const paymentToken = process.env.ACCESS_TOKEN_PAYMENT_TOKEN ?? '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const referralCode = process.env.ACCESS_TOKEN_REFERRAL_CODE ?? '0x';
  const feeNumerator = Number(process.env.ACCESS_TOKEN_FEE_NUMERATOR ?? '600');
  const maxTotalSupplyRaw = process.env.ACCESS_TOKEN_MAX_TOTAL_SUPPLY ?? '0';
  const collectionExpireRaw = process.env.ACCESS_TOKEN_COLLECTION_EXPIRE ?? '0';
  const transferable = process.env.ACCESS_TOKEN_TRANSFERABLE?.toLowerCase() !== 'false';

  if (DEPLOY) {
    console.log('Deploy AccessToken via NFTFactory:');

    if (!factoryAddress || !ethers.utils.isAddress(factoryAddress)) {
      throw new Error(`Missing or invalid factory address: ${factoryAddress}`);
    }
    if (!signerPk) {
      throw new Error('SIGNER_PK not provided.');
    }
    if (!tokenName || !tokenSymbol || !contractURI || !mintPriceRaw) {
      throw new Error(
        'ACCESS_TOKEN_NAME, ACCESS_TOKEN_SYMBOL, ACCESS_TOKEN_URI, and ACCESS_TOKEN_MINT_PRICE must be set.',
      );
    }

    if (!ethers.utils.isAddress(paymentToken)) {
      throw new Error(`Invalid payment token address: ${paymentToken}`);
    }
    if (!Number.isFinite(feeNumerator)) {
      throw new Error(`Invalid fee numerator: ${feeNumerator}`);
    }

    const mintPrice = BigNumber.from(mintPriceRaw);
    const whitelistMintPrice = BigNumber.from(whitelistMintPriceRaw ?? mintPriceRaw);
    const maxTotalSupply = BigNumber.from(maxTotalSupplyRaw);
    const collectionExpire = BigNumber.from(collectionExpireRaw);

    const factory = await ethers.getContractAt('NFTFactory', factoryAddress);
    const signerAddress =
      deployments.nftFactory?.parameters?.signerAddress ?? (await factory.nftFactoryParameters()).signerAddress;
    if (!ethers.utils.isAddress(signerAddress)) {
      throw new Error(`Invalid signer address resolved from factory: ${signerAddress}`);
    }

    const { accessToken, royaltiesReceiver } = await deployAccessToken(
      { name: tokenName, symbol: tokenSymbol, uri: contractURI },
      mintPrice,
      whitelistMintPrice,
      { privateKey: signerPk, publicKey: '', address: signerAddress },
      creator,
      factory,
      referralCode,
      paymentToken,
      transferable,
      maxTotalSupply,
      feeNumerator,
      collectionExpire,
    );

    deployments.accessTokens.push({
      address: accessToken.address,
      metadata: { name: tokenName, symbol: tokenSymbol, uri: contractURI },
      mintPrice: mintPrice.toString(),
      whitelistMintPrice: whitelistMintPrice.toString(),
      paymentToken,
      referralCode: referralCode.toString(),
      creator: creator.address,
      feeNumerator: feeNumerator.toString(),
      maxTotalSupply: maxTotalSupply.toString(),
      collectionExpire: collectionExpire.toString(),
      transferable,
      signature: 'generated-by-backend',
      royaltiesReceiver: royaltiesReceiver.address,
    });

    fs.writeFileSync(deploymentFile, JSON.stringify(deployments, null, 2));
    console.log(`AccessToken deployed to: ${accessToken.address}`);
    console.log(`RoyaltiesReceiver deployed to: ${royaltiesReceiver.address}`);
  }

  if (VERIFY) {
    console.log('Verification:');
    for (const record of deployments.accessTokens) {
      try {
        await verifyContract(record.address);
        console.log(`AccessToken verification successful: ${record.address}`);
      } catch (error) {
        console.error(`AccessToken verification failed for ${record.address}:`, error);
      }

      try {
        await verifyContract(record.royaltiesReceiver);
        console.log(`RoyaltiesReceiver verification successful: ${record.royaltiesReceiver}`);
      } catch (error) {
        console.error(`RoyaltiesReceiver verification failed for ${record.royaltiesReceiver}:`, error);
      }
    }
  }
}

main().catch(error => {
  console.error('AccessToken deployment script failed:', error);
  process.exit(1);
});

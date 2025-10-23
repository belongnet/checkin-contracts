import hre, { ethers, network } from 'hardhat';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { IERC20Metadata } from '../typechain-types';
import { ChainIds, chainRPCs } from '../utils/chain-ids';

export async function getSignerFromAddress(address: string): Promise<SignerWithAddress> {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  });
  return await ethers.getSigner(address);
}

export async function getToken(tokenAddress: string): Promise<IERC20Metadata> {
  return (await ethers.getContractAt(
    '@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol:IERC20Metadata',
    tokenAddress,
  )) as IERC20Metadata;
}

export async function startSimulateMainnet() {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: chainRPCs(ChainIds.mainnet),
          blockNumber: 23490636,
          enable: true,
        },
      },
    ],
  });
}

export async function startSimulateBSC() {
  const rpcUrl = chainRPCs(ChainIds.bsc);
  const forkingParams: {
    jsonRpcUrl: string;
    blockNumber?: number;
    enable: boolean;
  } = {
    jsonRpcUrl: rpcUrl,
    enable: true,
  };

  if (process.env.BSC_FORK_BLOCK_NUMBER) {
    const parsedBlock = Number(process.env.BSC_FORK_BLOCK_NUMBER);
    if (!Number.isNaN(parsedBlock) && parsedBlock > 0) {
      forkingParams.blockNumber = parsedBlock;
    }
  }

  const hardhatForkingConfig = hre.config.networks.hardhat?.forking;
  if (hardhatForkingConfig) {
    hardhatForkingConfig.url = rpcUrl;
    hardhatForkingConfig.blockNumber = forkingParams.blockNumber;
  }

  const runtimeForkingConfig = (network.config as typeof network.config & { forking?: typeof forkingParams }).forking;
  if (runtimeForkingConfig) {
    runtimeForkingConfig.url = rpcUrl;
    runtimeForkingConfig.blockNumber = forkingParams.blockNumber;
  }

  await network.provider.request({
    method: 'hardhat_reset',
    params: [],
  });

  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: forkingParams,
      },
    ],
  });
}

export async function stopSimulate() {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [],
  });
}

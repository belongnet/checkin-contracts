import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import hre, { ethers, network } from 'hardhat';

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
  const blockFromEnv = Number(process.env.BSC_FORK_BLOCK ?? '');
  const forkingConfig: {
    jsonRpcUrl: string;
    blockNumber?: number;
    enable: boolean;
  } = {
    jsonRpcUrl: chainRPCs(ChainIds.bsc),
    enable: true,
  };

  if (!Number.isNaN(blockFromEnv) && blockFromEnv > 0) {
    forkingConfig.blockNumber = blockFromEnv;
  }

  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: forkingConfig,
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

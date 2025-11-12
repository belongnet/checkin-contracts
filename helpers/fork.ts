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
  await network.provider.request({
    method: 'hardhat_reset',
    params: [
      {
        forking: {
          jsonRpcUrl: chainRPCs(ChainIds.bsc),
          blockNumber: 67924992,
          enable: true,
        },
      },
    ],
  });
  if (process.env.DEBUG_SIGNATURES === '1') {
    const net = await ethers.provider.getNetwork();
    // eslint-disable-next-line no-console
    console.log('startSimulateBSC chainId', net.chainId);
  }
}

export async function stopSimulate() {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [],
  });
}

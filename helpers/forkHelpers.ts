import hre, { ethers, network } from 'hardhat';
import { IERC20Metadata } from '../../../typechain-types';
import { chainRPCs } from '../../../utils/chain-ids';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';

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
          jsonRpcUrl: chainRPCs(1),
          blockNumber: 23068383,
          enable: true,
        },
      },
    ],
  });
}

export async function stopSimulateMainnet() {
  await network.provider.request({
    method: 'hardhat_reset',
    params: [],
  });
}

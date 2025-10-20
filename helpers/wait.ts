import { ethers } from 'hardhat';

export async function waitBlocks(n: number): Promise<number> {
  const provider = ethers.provider;
  const target = (await provider.getBlockNumber()) + n;

  return await new Promise<number>(resolve => {
    const onBlock = (bn: number) => {
      if (bn >= target) {
        provider.off('block', onBlock);
        resolve(bn);
      }
    };
    provider.on('block', onBlock);
  });
}

export async function waitForNextBlock(): Promise<number> {
  const provider = ethers.provider;
  const start = await provider.getBlockNumber();

  return await new Promise<number>(resolve => {
    const onBlock = (bn: number) => {
      if (bn > start) {
        provider.off('block', onBlock);
        resolve(bn);
      }
    };
    provider.on('block', onBlock);
  });
}

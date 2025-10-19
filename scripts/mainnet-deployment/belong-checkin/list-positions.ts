// scripts/list_positions.ts
import { ethers } from 'hardhat';

const IF_ERC721_ENUM = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
];

async function main() {
  const [signer] = await ethers.getSigners();
  const NPM = process.env.UNISWAPV3_NPM_ADDRESS!;
  const me = await signer.getAddress();
  const erc721 = new ethers.Contract(NPM, IF_ERC721_ENUM, signer);

  const n = await erc721.balanceOf(me);
  console.log(`You own ${n.toString()} positions`);
  for (let i = 0; i < n.toNumber(); i++) {
    const id = await erc721.tokenOfOwnerByIndex(me, i);
    console.log(`tokenId[${i}]=${id.toString()}`);
  }
}
main().catch(e => {
  console.error(e);
  process.exit(1);
});

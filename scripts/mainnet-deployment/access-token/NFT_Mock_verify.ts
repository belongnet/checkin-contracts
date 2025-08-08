import { verifyContract } from '../../helpers/verify';
import dotenv from 'dotenv';
dotenv.config();

const nft_address = process.env.NFT_MOCK;
async function deploy() {
  console.log('Deploying:');

  console.log('NFTFactory:');
  verifyContract(nft_address!, [
    {
      transferValidator: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      factory: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      creator: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      feeReceiver: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      referralCode: '0x0000000000000000000000000000000000000000000000000000000000000000',
      info: {
        metadata: {
          name: 'NFT',
          symbol: 'NFT',
        },
        payingToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        feeNumerator: Number(0),
        transferable: false,
        maxTotalSupply: Number(0),
        mintPrice: Number(0),
        whitelistMintPrice: Number(0),
        collectionExpire: Number(0),
        contractURI: '0000',
        signature:
          '0x7698e843a10f030c70588cf485a6aed9f2fb1dcfbf78eeab0c92ea114ff1ac511b003b0724da54f0aa172b88bc19826d88333770559a86ab9b2a1199e44a152d1b',
      },
    },
  ]);

  console.log('Verified:', nft_address);
  console.log('Done.');
}

deploy();

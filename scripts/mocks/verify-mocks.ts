import { verifyContract } from '../../helpers/verify';

const USDCMock_Address = '0x4F6dD6D2218F1b1675F6314e3e3fDF6BB8d24D26';
const WETHMock_Address = '0xfb2668b47f93b168ef99EA95d28bd31dB723ad79';

async function verify() {
  console.log('Verification: ');

  try {
    verifyContract(USDCMock_Address);
    console.log('USDC verification successful.');
  } catch (error) {
    console.error('USDC verification failed:', error);
  }

  try {
    verifyContract(WETHMock_Address);
    console.log('WETH verification successful.');
  } catch (error) {
    console.error('WETH verification failed:', error);
  }

  console.log('Done.');
}

verify();

import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { LONG } from '../../../typechain-types';
import { deployLONG } from '../../../helpers/deployFixtures';

describe('LONG', () => {
  async function fixture() {
    const [admin, pauser, minter, burner] = await ethers.getSigners();

    const LONG: LONG = await deployLONG(admin.address, admin.address, pauser.address);

    return {
      admin,
      pauser,
      minter,
      burner,
      LONG,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { LONG, admin, pauser } = await loadFixture(fixture);

      expect(LONG.address).to.be.properAddress;

      expect(await LONG.name()).to.eq('LONG');
      expect(await LONG.symbol()).to.eq('LONG');
      expect((await LONG.eip712Domain()).name).to.eq('LONG');

      expect(await LONG.hasRole(await LONG.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      expect(await LONG.hasRole(await LONG.PAUSER_ROLE(), pauser.address)).to.be.true;
    });
  });

  describe('Mint Burn Pause', () => {
    it('pause() only with PAUSER_ROLE', async () => {
      const { LONG, admin, pauser } = await loadFixture(fixture);

      await expect(LONG.connect(admin).pause())
        .to.be.revertedWithCustomError(LONG, 'AccessControlUnauthorizedAccount')
        .withArgs(admin.address, await LONG.PAUSER_ROLE());

      const pause = await LONG.connect(pauser).pause();

      await expect(pause).to.emit(LONG, 'Paused').withArgs(pauser.address);
    });

    it('unpause() only with PAUSER_ROLE', async () => {
      const { LONG, admin, pauser } = await loadFixture(fixture);

      await LONG.connect(pauser).pause();

      await expect(LONG.connect(admin).unpause())
        .to.be.revertedWithCustomError(LONG, 'AccessControlUnauthorizedAccount')
        .withArgs(admin.address, await LONG.PAUSER_ROLE());

      const unpause = await LONG.connect(pauser).unpause();

      await expect(unpause).to.emit(LONG, 'Unpaused').withArgs(pauser.address);
    });
  });
});

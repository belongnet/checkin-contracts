import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployEscrow } from '../../../helpers/deployFixtures';
import { Escrow } from '../../../typechain-types';

describe('Escrow', () => {
  async function fixture() {
    const [admin, treasury, pauser, minter, burner, user1, user2] = await ethers.getSigners();

    const escrow: Escrow = await deployEscrow(admin.address);

    return {
      admin,
      treasury,
      pauser,
      minter,
      burner,
      user1,
      user2,
      escrow,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { escrow, admin } = await loadFixture(fixture);

      expect(escrow.address).to.be.properAddress;
      expect(await escrow.belongCheckIn()).to.eq(admin.address);

      await expect(escrow.initialize(escrow.address)).to.be.revertedWithCustomError(escrow, 'InvalidInitialization');
    });
  });

  describe('Escrow features', () => {
    it('venueDeposit()', async () => {
      const { escrow, admin, user1 } = await loadFixture(fixture);

      await expect(escrow.connect(user1).venueDeposit(admin.address, 10, 20)).to.be.revertedWithCustomError(
        escrow,
        'NotBelongCheckIn',
      );
      const tx = await escrow.venueDeposit(admin.address, 10, 20);

      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      expect((await escrow.venueDeposits(admin.address)).usdTokenDeposits).to.eq(10);
      expect((await escrow.venueDeposits(admin.address)).longDeposits).to.eq(20);
    });

    it('distributeLONGDeposit()', async () => {
      const { escrow, admin, user1 } = await loadFixture(fixture);

      await escrow.venueDeposit(admin.address, 10, 20);

      await expect(
        escrow.connect(user1).distributeLONGDeposit(user1.address, user1.address, 10),
      ).to.be.revertedWithCustomError(escrow, 'NotBelongCheckIn');
      await expect(escrow.distributeLONGDeposit(admin.address, admin.address, 30))
        .to.be.revertedWithCustomError(escrow, 'NotEnoughLONGs')
        .withArgs(20, 30);
    });

    it('distributeVenueDeposit()', async () => {
      const { escrow, admin, user1 } = await loadFixture(fixture);

      await escrow.venueDeposit(admin.address, 10, 20);

      await expect(
        escrow.connect(user1).distributeVenueDeposit(admin.address, user1.address, 10),
      ).to.be.revertedWithCustomError(escrow, 'NotBelongCheckIn');
      await expect(escrow.distributeVenueDeposit(admin.address, user1.address, 20))
        .to.be.revertedWithCustomError(escrow, 'NotEnoughUSDTokens')
        .withArgs(10, 20);
    });
  });
});

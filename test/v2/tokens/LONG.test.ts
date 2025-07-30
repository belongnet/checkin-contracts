import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { ContractFactory } from 'ethers';
import { expect } from 'chai';
import { LONG } from '../../../typechain-types';

describe('LONG', () => {
  async function fixture() {
    const [admin, pauser, minter, burner] = await ethers.getSigners();

    const LONG: ContractFactory = await ethers.getContractFactory('LONG');
    const long: LONG = (await LONG.deploy(admin.address, pauser.address, minter.address, burner.address)) as LONG;
    await long.deployed();

    return {
      admin,
      pauser,
      minter,
      burner,
      long,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { long, admin, pauser, minter, burner } = await loadFixture(fixture);

      expect(long.address).to.be.properAddress;

      expect(await long.name()).to.eq('LONG');
      expect(await long.symbol()).to.eq('LONG');
      expect((await long.eip712Domain()).name).to.eq('LONG');

      expect(await long.hasRole(await long.DEFAULT_ADMIN_ROLE(), admin.address)).to.be.true;
      expect(await long.hasRole(await long.PAUSER_ROLE(), pauser.address)).to.be.true;
      expect(await long.hasRole(await long.MINTER_ROLE(), minter.address)).to.be.true;
      expect(await long.hasRole(await long.BURNER_ROLE(), burner.address)).to.be.true;
    });
  });

  describe('Mint Burn', () => {
    it('mint() only with MINTER_ROLE', async () => {
      const { long, admin, minter } = await loadFixture(fixture);

      await expect(long.connect(admin).mint(admin.address, 1000))
        .to.be.revertedWithCustomError(long, 'AccessControlUnauthorizedAccount')
        .withArgs(admin.address, await long.MINTER_ROLE());

      const tx = await long.connect(minter).mint(admin.address, 1000);

      await expect(tx).to.emit(long, 'Transfer').withArgs(ethers.constants.AddressZero, admin.address, 1000);
    });

    it('burn() only with BURNER_ROLE', async () => {
      const { long, admin, pauser, minter, burner } = await loadFixture(fixture);

      await long.connect(minter).mint(admin.address, 1000);

      await expect(long.connect(admin)['burn(address,uint256)'](admin.address, 1000))
        .to.be.revertedWithCustomError(long, 'AccessControlUnauthorizedAccount')
        .withArgs(admin.address, await long.BURNER_ROLE());

      const tx = await long.connect(burner)['burn(address,uint256)'](admin.address, 1000);

      await expect(tx).to.emit(long, 'Transfer').withArgs(admin.address, ethers.constants.AddressZero, 1000);
    });
  });
});

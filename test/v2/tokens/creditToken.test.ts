import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import EthCrypto from 'eth-crypto';
import {
  Factory,
  RoyaltiesReceiverV2,
  AccessToken,
  CreditToken,
  SignatureVerifier,
  MockTransferValidatorV2,
  LONG,
} from '../../../typechain-types';
import {
  deployAccessTokenImplementation,
  deployCreditTokenImplementation,
  deployFactory,
  deployRoyaltiesReceiverV2Implementation,
  deployLONG,
  deployCreditTokens,
} from '../../../helpers/deployFixtures';
import { deploySignatureVerifier } from '../../../helpers/deployLibraries';
import { deployMockTransferValidatorV2 } from '../../../helpers/deployMockFixtures';
import { ERC1155InfoStruct } from '../../../typechain-types/contracts/v2/platform/Factory';

describe('CreditToken', () => {
  let implementations: Factory.ImplementationsStruct;

  async function fixture() {
    const [admin, manager, minter, burner, pauser] = await ethers.getSigners();
    const signer = EthCrypto.createIdentity();

    const LONG: LONG = await deployLONG(admin.address, admin.address, pauser.address);

    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();
    const validator: MockTransferValidatorV2 = await deployMockTransferValidatorV2();
    const accessTokenImplementation: AccessToken = await deployAccessTokenImplementation(signatureVerifier.address);
    const royaltiesReceiverV2Implementation: RoyaltiesReceiverV2 = await deployRoyaltiesReceiverV2Implementation();
    const creditTokenImplementation: CreditToken = await deployCreditTokenImplementation();

    implementations = {
      accessToken: accessTokenImplementation.address,
      creditToken: creditTokenImplementation.address,
      royaltiesReceiver: royaltiesReceiverV2Implementation.address,
    };

    const factory: Factory = await deployFactory(
      admin.address,
      signer.address,
      signatureVerifier.address,
      validator.address,
      implementations,
    );

    const { venueToken, promoterToken } = await deployCreditTokens(
      true,
      false,
      factory.address,
      signer.privateKey,
      admin,
      manager.address,
      minter.address,
      burner.address,
    );

    return {
      signatureVerifier,
      factory,
      venueToken,
      promoterToken,
      LONG,
      admin,
      manager,
      minter,
      burner,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { venueToken, promoterToken, admin, manager, minter, burner } = await loadFixture(fixture);

      expect(venueToken.address).to.be.properAddress;
      expect(promoterToken.address).to.be.properAddress;

      expect(await venueToken.name()).to.eq('VenueToken');
      expect(await venueToken.symbol()).to.eq('VET');
      expect(await venueToken['uri()']()).to.eq('contractURI/VenueToken');
      expect(await venueToken.transferable()).to.be.true;

      expect(await promoterToken.name()).to.eq('PromoterToken');
      expect(await promoterToken.symbol()).to.eq('PMT');
      expect(await promoterToken['uri()']()).to.eq('contractURI/PromoterToken');
      expect(await promoterToken.transferable()).to.be.false;

      expect(await venueToken.hasRole(admin.address, await venueToken.DEFAULT_ADMIN_ROLE())).to.be.true;
      expect(await venueToken.hasRole(manager.address, await venueToken.MANAGER_ROLE())).to.be.true;
      expect(await venueToken.hasRole(minter.address, await venueToken.MINTER_ROLE())).to.be.true;
      expect(await venueToken.hasRole(burner.address, await venueToken.BURNER_ROLE())).to.be.true;

      expect(await promoterToken.hasRole(admin.address, await promoterToken.DEFAULT_ADMIN_ROLE())).to.be.true;
      expect(await promoterToken.hasRole(manager.address, await promoterToken.MANAGER_ROLE())).to.be.true;
      expect(await promoterToken.hasRole(minter.address, await promoterToken.MINTER_ROLE())).to.be.true;
      expect(await promoterToken.hasRole(burner.address, await promoterToken.BURNER_ROLE())).to.be.true;

      await expect(
        promoterToken.initialize({
          name: '12',
          symbol: '12',
          defaultAdmin: promoterToken.address,
          manager: promoterToken.address,
          minter: promoterToken.address,
          burner: promoterToken.address,
          uri: '12',
          transferable: true,
        } as ERC1155InfoStruct),
      ).to.be.revertedWithCustomError(promoterToken, 'InvalidInitialization');
    });
  });

  describe('Mint Burn Pause', () => {
    it('mint() only with MINTER_ROLE', async () => {
      const { venueToken, promoterToken, admin, minter } = await loadFixture(fixture);

      await expect(venueToken.connect(admin).mint(admin.address, 1, 1000, '')).to.be.revertedWithCustomError(
        venueToken,
        'EnumerableRolesUnauthorized',
      );
      await expect(promoterToken.connect(admin).mint(admin.address, 1, 1000, '')).to.be.revertedWithCustomError(
        promoterToken,
        'EnumerableRolesUnauthorized',
      );

      const venueTokenMint = await venueToken.connect(minter).mint(admin.address, 1, 1000, '');
      const promoterTokenMint = await promoterToken.connect(minter).mint(admin.address, 1, 1000, '1');

      expect(await venueToken['uri(uint256)'](1)).to.eq('');
      expect(await promoterToken['uri(uint256)'](1)).to.eq('1');
      await expect(venueTokenMint)
        .to.emit(venueToken, 'TransferSingle')
        .withArgs(minter.address, ethers.constants.AddressZero, admin.address, 1, 1000);
      await expect(promoterTokenMint)
        .to.emit(promoterToken, 'TransferSingle')
        .withArgs(minter.address, ethers.constants.AddressZero, admin.address, 1, 1000);
      await expect(venueTokenMint).to.emit(venueToken, 'TokenUriSet').withArgs(1, '');
      await expect(promoterTokenMint).to.emit(promoterToken, 'TokenUriSet').withArgs(1, '1');
    });

    it('burn() only with BURNER_ROLE', async () => {
      const { venueToken, promoterToken, admin, minter, burner } = await loadFixture(fixture);

      await expect(venueToken.connect(admin).burn(admin.address, 1, 1000)).to.be.revertedWithCustomError(
        venueToken,
        'EnumerableRolesUnauthorized',
      );
      await expect(promoterToken.connect(admin).burn(admin.address, 1, 1000)).to.be.revertedWithCustomError(
        promoterToken,
        'EnumerableRolesUnauthorized',
      );

      await venueToken.connect(minter).mint(admin.address, 1, 1000, '');
      await promoterToken.connect(minter).mint(admin.address, 1, 1000, '');

      const venueTokenBurn = await venueToken.connect(burner).burn(admin.address, 1, 1000);
      const promoterTokenBurn = await promoterToken.connect(burner).burn(admin.address, 1, 1000);

      console.log((await venueTokenBurn.wait()).events[1].args);
      expect(await venueToken['uri(uint256)'](1)).to.eq('');
      expect(await promoterToken['uri(uint256)'](1)).to.eq('');
      await expect(venueTokenBurn)
        .to.emit(venueToken, 'TransferSingle')
        .withArgs(burner.address, admin.address, ethers.constants.AddressZero, 1, 1000);
      await expect(promoterTokenBurn)
        .to.emit(promoterToken, 'TransferSingle')
        .withArgs(burner.address, admin.address, ethers.constants.AddressZero, 1, 1000);
      await expect(venueTokenBurn).to.emit(venueToken, 'TokenUriSet').withArgs(1, '');
      await expect(promoterTokenBurn).to.emit(promoterToken, 'TokenUriSet').withArgs(1, '');
    });

    it('_beforeTokenTransfer() checks the transferrable state', async () => {
      const { venueToken, promoterToken, admin, minter, manager } = await loadFixture(fixture);

      await venueToken.connect(minter).mint(admin.address, 1, 1000, '');
      await promoterToken.connect(minter).mint(admin.address, 1, 1000, '');

      await venueToken.connect(admin).safeTransferFrom(admin.address, minter.address, 1, 1000, '0x');
      await expect(
        promoterToken.connect(admin).safeTransferFrom(admin.address, minter.address, 1, 1000, '0x'),
      ).to.be.revertedWithCustomError(promoterToken, 'TokenCanNotBeTransfered');

      expect(await venueToken.balanceOf(admin.address, 1)).to.eq(0);
      expect(await venueToken.balanceOf(minter.address, 1)).to.eq(1000);

      await expect(promoterToken.connect(admin).setTransferable(false)).to.be.revertedWithCustomError(
        promoterToken,
        'EnumerableRolesUnauthorized',
      );

      const venueTokenBurn = await venueToken.connect(manager).setTransferable(false);
      const promoterTokenBurn = await promoterToken.connect(manager).setTransferable(true);

      await expect(venueTokenBurn).to.emit(venueToken, 'TransferableSet').withArgs(false);
      await expect(promoterTokenBurn).to.emit(promoterToken, 'TransferableSet').withArgs(true);
      expect(await venueToken.transferable()).to.be.false;
      expect(await promoterToken.transferable()).to.be.true;

      await expect(
        venueToken.connect(admin).safeTransferFrom(admin.address, minter.address, 1, 1000, '0x'),
      ).to.be.revertedWithCustomError(venueToken, 'TokenCanNotBeTransfered');
      await promoterToken.connect(admin).safeTransferFrom(admin.address, minter.address, 1, 1000, '0x');

      expect(await promoterToken.balanceOf(admin.address, 1)).to.eq(0);
      expect(await promoterToken.balanceOf(minter.address, 1)).to.eq(1000);
    });
  });

  it('setURI() only with MANAGER_ROLE', async () => {
    const { venueToken, promoterToken, admin, manager } = await loadFixture(fixture);

    await expect(venueToken.connect(admin).setURI('')).to.be.revertedWithCustomError(
      venueToken,
      'EnumerableRolesUnauthorized',
    );

    const tx = await venueToken.connect(manager).setURI('setURI() only with MANAGER_ROLE');

    expect(await venueToken['uri()']()).to.eq('setURI() only with MANAGER_ROLE');
    await expect(tx).to.emit(venueToken, 'UriSet').withArgs('setURI() only with MANAGER_ROLE');
  });
});

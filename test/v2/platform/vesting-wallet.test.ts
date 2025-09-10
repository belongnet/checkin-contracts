import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import EthCrypto from 'eth-crypto';
import {
  AccessToken,
  CreditToken,
  Factory,
  LONG,
  MockTransferValidatorV2,
  RoyaltiesReceiverV2,
  SignatureVerifier,
  VestingWalletExtended,
} from '../../../typechain-types';
import {
  deployAccessTokenImplementation,
  deployCreditTokenImplementation,
  deployFactory,
  deployLONG,
  deployRoyaltiesReceiverV2Implementation,
  deployVestingWallet,
  deployVestingWalletImplementation,
} from '../../../helpers/deployFixtures';
import { VestingWalletInfoStruct } from '../../../typechain-types/contracts/v2/periphery/VestingWalletExtended';
import { deploySignatureVerifier } from '../../../helpers/deployLibraries';
import { deployMockTransferValidatorV2 } from '../../../helpers/deployMockFixtures';

describe.only('VestingWallet', () => {
  const description = 'VestingWallet';

  let vestingWalletInfo: VestingWalletInfoStruct;

  async function fixture() {
    const [admin, pauser, alice, bob, charlie] = await ethers.getSigners();
    const signer = EthCrypto.createIdentity();

    const LONG: LONG = await deployLONG(admin.address, admin.address, pauser.address);

    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();
    const validator: MockTransferValidatorV2 = await deployMockTransferValidatorV2();
    const accessTokenImplementation: AccessToken = await deployAccessTokenImplementation(signatureVerifier.address);
    const royaltiesReceiverV2Implementation: RoyaltiesReceiverV2 = await deployRoyaltiesReceiverV2Implementation();
    const creditTokenImplementation: CreditToken = await deployCreditTokenImplementation();
    const vestingWalletImplementation: VestingWalletExtended = await deployVestingWalletImplementation();

    const factory: Factory = await deployFactory(
      admin.address,
      signer.address,
      signatureVerifier.address,
      validator.address,
      {
        accessToken: accessTokenImplementation.address,
        creditToken: creditTokenImplementation.address,
        royaltiesReceiver: royaltiesReceiverV2Implementation.address,
        vestingWallet: vestingWalletImplementation.address,
      },
    );

    const startTimestamp = (await time.latest()) + 5;
    const cliffDurationSeconds = 60;
    const durationSeconds = 360;

    vestingWalletInfo = {
      startTimestamp,
      cliffDurationSeconds,
      durationSeconds,
      token: LONG.address,
      beneficiary: alice.address,
      totalAllocation: ethers.utils.parseEther('100'),
      tgeAmount: ethers.utils.parseEther('10'),
      linearAllocation: ethers.utils.parseEther('60'),
      description,
    };

    const vestingWallet: VestingWalletExtended = await deployVestingWallet(
      vestingWalletInfo,
      factory.address,
      LONG.address,
      signer.privateKey,
      admin,
    );

    return {
      admin,
      pauser,
      alice,
      bob,
      charlie,
      LONG,
      vestingWallet,
      factory,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { vestingWallet, LONG, admin } = await loadFixture(fixture);

      expect(await vestingWallet.description()).to.be.equal(description);
      expect((await vestingWallet.vestingStorage()).beneficiary).to.be.equal(vestingWalletInfo.beneficiary);
      expect((await vestingWallet.vestingStorage()).cliffDurationSeconds).to.be.equal(
        vestingWalletInfo.cliffDurationSeconds,
      );
      expect((await vestingWallet.vestingStorage()).durationSeconds).to.be.equal(vestingWalletInfo.durationSeconds);
      expect((await vestingWallet.vestingStorage()).linearAllocation).to.be.equal(vestingWalletInfo.linearAllocation);
      expect((await vestingWallet.vestingStorage()).startTimestamp).to.be.equal(vestingWalletInfo.startTimestamp);
      expect((await vestingWallet.vestingStorage()).tgeAmount).to.be.equal(vestingWalletInfo.tgeAmount);
      expect((await vestingWallet.vestingStorage()).token).to.be.equal(vestingWalletInfo.token);
      expect((await vestingWallet.vestingStorage()).totalAllocation).to.be.equal(vestingWalletInfo.totalAllocation);
      expect(await vestingWallet.owner()).to.be.equal(admin.address);

      expect(await LONG.balanceOf(vestingWallet.address)).to.eq(vestingWalletInfo.totalAllocation);
    });
  });
});

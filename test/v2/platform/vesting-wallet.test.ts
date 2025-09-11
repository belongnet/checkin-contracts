import { ethers } from 'hardhat';
import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { BigNumber } from 'ethers';
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

describe.only('VestingWalletExtended', () => {
  const description = 'VestingWallet';
  const E = (x: string) => ethers.utils.parseEther(x);

  async function increaseToStrict(ts: number | bigint) {
    const latest = await time.latest();
    const target = BigInt(ts);
    const next = target <= BigInt(latest) ? BigInt(latest) + 1n : target;
    await time.increaseTo(Number(next));
  }

  async function fixture() {
    const [admin, pauser, alice, bob, charlie] = await ethers.getSigners();
    const signer = EthCrypto.createIdentity();

    const LONG: LONG = await deployLONG(admin.address, admin.address, pauser.address);

    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();
    const validator: MockTransferValidatorV2 = await deployMockTransferValidatorV2();
    const accessTokenImplementation: AccessToken = await deployAccessTokenImplementation(signatureVerifier.address);
    const rrImpl: RoyaltiesReceiverV2 = await deployRoyaltiesReceiverV2Implementation();
    const creditTokenImpl: CreditToken = await deployCreditTokenImplementation();
    const vestingImpl: VestingWalletExtended = await deployVestingWalletImplementation();

    const factory: Factory = await deployFactory(
      admin.address,
      signer.address,
      signatureVerifier.address,
      validator.address,
      {
        accessToken: accessTokenImplementation.address,
        creditToken: creditTokenImpl.address,
        royaltiesReceiver: rrImpl.address,
        vestingWallet: vestingImpl.address,
      },
    );

    const start = (await time.latest()) + 1_000;
    const cliffDur = 60;
    const dur = 360;

    const info: VestingWalletInfoStruct = {
      startTimestamp: start,
      cliffDurationSeconds: cliffDur,
      durationSeconds: dur,
      token: LONG.address,
      beneficiary: alice.address,
      totalAllocation: E('100'), // 100 LONG
      tgeAmount: E('10'), // 10 LONG at TGE
      linearAllocation: E('60'), // 60 LONG linearly after cliff for 360s
      description,
    };

    const vestingWallet: VestingWalletExtended = await deployVestingWallet(
      info,
      factory.address,
      LONG.address,
      signer.privateKey,
      admin, // owner
    );

    const startStepBased = (await time.latest()) + 5;
    const cliffDurationStepBased = 0;
    const durationStepBased = 0;

    const infoStepBased: VestingWalletInfoStruct = {
      startTimestamp: startStepBased,
      cliffDurationSeconds: cliffDurationStepBased,
      durationSeconds: durationStepBased,
      token: LONG.address,
      beneficiary: admin.address,
      totalAllocation: E('10'),
      tgeAmount: E('2'),
      linearAllocation: 0,
      description: 'StepBased',
    };

    const vestingWalletStepBased: VestingWalletExtended = await deployVestingWallet(
      infoStepBased,
      factory.address,
      LONG.address,
      signer.privateKey,
      admin, // owner
    );

    return {
      admin,
      pauser,
      alice,
      bob,
      charlie,
      LONG,
      vestingWallet,
      vestingWalletStepBased,
      factory,
      start,
      startStepBased,
      cliffDur,
      dur,
      info,
    };
  }

  describe('Deployment', () => {
    it('should deploy and initialize correctly', async () => {
      const { vestingWallet, LONG, admin, info } = await loadFixture(fixture);

      expect(await vestingWallet.description()).to.eq(description);
      const s = await vestingWallet.vestingStorage();

      expect(s.beneficiary).to.eq(info.beneficiary);
      expect(s.cliffDurationSeconds).to.eq(info.cliffDurationSeconds);
      expect(s.durationSeconds).to.eq(info.durationSeconds);
      expect(s.linearAllocation).to.eq(info.linearAllocation);
      expect(s.startTimestamp).to.eq(info.startTimestamp);
      expect(s.tgeAmount).to.eq(info.tgeAmount);
      expect(s.token).to.eq(info.token);
      expect(s.totalAllocation).to.eq(info.totalAllocation);

      expect(await vestingWallet.owner()).to.eq(admin.address);
      expect(await LONG.balanceOf(vestingWallet.address)).to.eq(info.totalAllocation);

      // derived helpers
      expect(await vestingWallet.start()).to.eq(info.startTimestamp);
      expect(await vestingWallet.cliff()).to.eq(
        BigNumber.from(info.startTimestamp).add(await info.cliffDurationSeconds),
      );
      expect(await vestingWallet.duration()).to.eq(info.durationSeconds);
      expect(await vestingWallet.end()).to.eq(
        BigNumber.from(info.startTimestamp)
          .add(await info.cliffDurationSeconds)
          .add(await info.durationSeconds),
      );
    });
  });

  describe('Tranche management (single & batch)', () => {
    it('addTranche()', async () => {
      const { vestingWallet, admin, start, cliffDur, dur } = await loadFixture(fixture);

      const timestamp = start + 10;
      const amount = E('10'); // first tranche

      const tx = vestingWallet.connect(admin).addTranche({ timestamp, amount });

      await expect(tx).to.emit(vestingWallet, 'TrancheAdded').withArgs([timestamp, amount]); // struct-encoded event
      expect(await vestingWallet.tranchesLength()).to.eq(1);
      expect(await vestingWallet.tranchesTotal()).to.eq(amount);

      // non-monotonic should revert
      await expect(
        vestingWallet.connect(admin).addTranche({ timestamp: timestamp - 1, amount }),
      ).to.be.revertedWithCustomError(vestingWallet, 'NonMonotonic');
      // before start
      await expect(
        vestingWallet.connect(admin).addTranche({ timestamp: start - 1, amount }),
      ).to.be.revertedWithCustomError(vestingWallet, 'TrancheBeforeStart');
      // after end
      const end = start + cliffDur + dur;
      await expect(
        vestingWallet.connect(admin).addTranche({ timestamp: end + 1, amount }),
      ).to.be.revertedWithCustomError(vestingWallet, 'TrancheAfterEnd');
    });

    it('addTranches() (batch)', async () => {
      const { vestingWallet, admin, start, cliffDur, dur } = await loadFixture(fixture);

      const end = start + cliffDur + dur;

      // Remaining room for tranches = total - tge - linear = 30
      const amount = E('10');
      const amount2 = E('20');
      const timestamps = [start + 5, start + 70]; // monotonic, within [start, end], note: > cliff for second

      const tx = vestingWallet.connect(admin).addTranches([
        { timestamp: timestamps[0], amount },
        { timestamp: timestamps[1], amount: amount2 },
      ]);

      await expect(tx)
        .to.emit(vestingWallet, 'TrancheAdded')
        .withArgs([timestamps[0], amount])
        .and.to.emit(vestingWallet, 'TrancheAdded')
        .withArgs([timestamps[1], amount2]);
      expect(await vestingWallet.tranchesLength()).to.eq(2);
      expect(await vestingWallet.tranchesTotal()).to.eq(amount.add(amount2));

      // OverAllocation: try to add more than remaining (remaining is 0 now)
      await expect(
        vestingWallet.connect(admin).addTranche({ timestamp: end, amount: E('1') }),
      ).to.be.revertedWithCustomError(vestingWallet, 'OverAllocation');
    });

    it('onlyOwner guards addTranche/addTranches', async () => {
      const { vestingWallet, bob, start } = await loadFixture(fixture);

      await expect(
        vestingWallet.connect(bob).addTranche({ timestamp: start + 10, amount: E('1') }),
      ).to.be.revertedWithCustomError(vestingWallet, 'Unauthorized');

      await expect(
        vestingWallet.connect(bob).addTranches([{ timestamp: start + 10, amount: E('1') }]),
      ).to.be.revertedWithCustomError(vestingWallet, 'Unauthorized');
    });
  });

  describe('Finalize configuration', () => {
    it('finalize(): when tge + linear + tranchesTotal == total', async () => {
      const { vestingWallet, admin, start } = await loadFixture(fixture);

      // Put exactly the remaining 30 in tranches.
      await vestingWallet.connect(admin).addTranches([
        { timestamp: start + 5, amount: E('10') },
        { timestamp: start + 70, amount: E('20') },
      ]);

      const tx = vestingWallet.connect(admin).finalizeTranchesConfiguration();

      await expect(tx).to.emit(vestingWallet, 'Finalized');

      // No more adding
      await expect(
        vestingWallet.connect(admin).addTranche({ timestamp: start + 80, amount: E('1') }),
      ).to.be.revertedWithCustomError(vestingWallet, 'VestingFinalized');
    });

    it('finalize(): reverts if allocation not balanced', async () => {
      const { vestingWallet, admin, start } = await loadFixture(fixture);
      // Add only 10 (we need 30 to balance)
      await vestingWallet.connect(admin).addTranche({ timestamp: start + 5, amount: E('10') });

      await expect(vestingWallet.connect(admin).finalizeTranchesConfiguration()).to.be.revertedWithCustomError(
        vestingWallet,
        'AllocationNotBalanced',
      );
    });

    it('onlyOwner guard', async () => {
      const { vestingWallet, bob } = await loadFixture(fixture);
      await expect(vestingWallet.connect(bob).finalizeTranchesConfiguration()).to.be.revertedWithCustomError(
        vestingWallet,
        'Unauthorized',
      );
    });
  });

  describe('Vesting math (TGE + tranches + linear)', () => {
    it('vestedAmount & releasable across time; release pulls tokens and accumulates', async () => {
      const { vestingWallet, admin, alice, LONG, start, cliffDur, dur, info } = await loadFixture(fixture);

      const timestamp = start + 5;
      const timestamp2 = start + 70;
      const amount = E('10'); // total tranches: 30
      const amount2 = E('20');

      await vestingWallet.connect(admin).addTranches([
        { timestamp, amount },
        { timestamp: timestamp2, amount: amount2 },
      ]);

      await vestingWallet.connect(admin).finalizeTranchesConfiguration();

      const cliff = start + cliffDur;
      const end = cliff + dur;

      // Before start
      await increaseToStrict(start - 1);
      expect(await vestingWallet.vestedAmount(start - 1)).to.eq(0);
      expect(await vestingWallet.releasable()).to.eq(0);

      // At TGE
      await increaseToStrict(start + 1);
      expect(await vestingWallet.vestedAmount(start + 1)).to.eq(info.tgeAmount); // 10

      const release = vestingWallet.release();

      await expect(release).to.emit(vestingWallet, 'Released').withArgs(info.token, info.tgeAmount);
      expect(await LONG.balanceOf(alice.address)).to.eq(info.tgeAmount);
      expect(await LONG.balanceOf(vestingWallet.address)).to.eq(
        BigNumber.from(info.totalAllocation).sub(await info.tgeAmount),
      );

      // After first tranche (pre-cliff)
      await increaseToStrict(timestamp + 1);
      const vested_t1 = BigNumber.from(info.tgeAmount).add(amount); // linear not started yet
      expect(await vestingWallet.vestedAmount(timestamp + 1)).to.eq(vested_t1);
      // releasable = vested - released
      expect(await vestingWallet.releasable()).to.eq(amount);

      const release2 = await vestingWallet.release();
      await expect(release2).to.emit(vestingWallet, 'Released').withArgs(info.token, amount);

      expect(await LONG.balanceOf(alice.address)).to.eq(BigNumber.from(info.tgeAmount).add(amount));

      // After second tranche and a bit of linear
      await increaseToStrict(timestamp2 + 1);

      const now = await time.latest();
      const nowBN = BigNumber.from(now);
      const cliffBN = BigNumber.from(cliff);
      const durBN = BigNumber.from(dur);

      let elapsedClamped: BigNumber;
      if (nowBN.lte(cliffBN)) {
        elapsedClamped = BigNumber.from(0);
      } else {
        const diff = nowBN.sub(cliffBN);
        elapsedClamped = diff.gte(durBN) ? durBN : diff;
      }

      const linearNow = BigNumber.from(info.linearAllocation).mul(elapsedClamped).div(durBN);
      const vestedNow = BigNumber.from(info.tgeAmount).add(amount).add(amount2).add(linearNow);

      expect(await vestingWallet.vestedAmount(now)).to.eq(vestedNow);

      const releasedSoFar = BigNumber.from(info.tgeAmount).add(amount);
      const releasableNow = vestedNow.sub(releasedSoFar);
      const linearPerSecond = ethers.utils.parseEther('60').div(360);
      expect(await vestingWallet.releasable()).to.eq(releasableNow);

      const release3 = await vestingWallet.release();

      await expect(release3)
        .to.emit(vestingWallet, 'Released')
        .withArgs(info.token, releasableNow.add(linearPerSecond).add(1));
      expect(await LONG.balanceOf(alice.address)).to.eq(releasedSoFar.add(releasableNow.add(linearPerSecond).add(1)));

      // At full vesting end — all should be vested; release drains the rest
      await increaseToStrict(end + 1);
      expect(await vestingWallet.vestedAmount(end + 1)).to.eq(info.totalAllocation);
      const releasableEnd = (await vestingWallet.vestedAmount(end + 1)).sub(await vestingWallet['released']());
      const release4 = await vestingWallet.release();

      await expect(release4).to.emit(vestingWallet, 'Released').withArgs(info.token, releasableEnd);
      expect(await LONG.balanceOf(alice.address)).to.eq(info.totalAllocation);
      expect(await LONG.balanceOf(vestingWallet.address)).to.eq(0);
      expect(releasableEnd).to.be.gt(0);
    });
  });

  describe('Step-based only (duration = 0, linear = 0)', () => {
    it('works with pure TGE + tranches (no linear part)', async () => {
      const { vestingWalletStepBased, admin, alice, LONG, startStepBased, cliffDur, dur, info } = await loadFixture(
        fixture,
      );

      // Add 8 tokens as a single tranche right at start
      await vestingWalletStepBased.connect(admin).addTranche({ timestamp: startStepBased, amount: E('8') });
      await vestingWalletStepBased.connect(admin).finalizeTranchesConfiguration();

      await increaseToStrict(startStepBased + 1);
      expect(await vestingWalletStepBased.vestedAmount(startStepBased + 1)).to.eq(E('10'));
      const before = await LONG.balanceOf(admin.address);
      await vestingWalletStepBased.release();
      const after = await LONG.balanceOf(admin.address);
      expect(after.sub(before)).to.eq(E('10'));
      expect(await vestingWalletStepBased.releasable()).to.eq(0);
      expect(await LONG.balanceOf(vestingWalletStepBased.address)).to.eq(0);
    });
  });
});

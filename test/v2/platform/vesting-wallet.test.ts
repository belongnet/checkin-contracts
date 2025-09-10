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

describe('VestingWalletExtended', () => {
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

    return { admin, pauser, alice, bob, charlie, LONG, vestingWallet, factory, start, cliffDur, dur, info };
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
    it('addTranche: happy path & events; tranchesTotal updates; monotonic enforced', async () => {
      const { vestingWallet, admin, start, cliffDur, dur } = await loadFixture(fixture);

      const t1 = start + 10;
      const a1 = E('10'); // first tranche
      await expect(vestingWallet.connect(admin).addTranche({ timestamp: t1, amount: a1 }))
        .to.emit(vestingWallet, 'TrancheAdded')
        .withArgs([t1, a1]); // struct-encoded event

      expect(await vestingWallet.tranchesLength()).to.eq(1);
      expect(await vestingWallet.tranchesTotal()).to.eq(a1);

      // non-monotonic should revert
      await expect(
        vestingWallet.connect(admin).addTranche({ timestamp: t1 - 1, amount: E('1') }),
      ).to.be.revertedWithCustomError(vestingWallet, 'NonMonotonic');
      // before start
      await expect(
        vestingWallet.connect(admin).addTranche({ timestamp: start - 1, amount: E('1') }),
      ).to.be.revertedWithCustomError(vestingWallet, 'TrancheBeforeStart');
      // after end
      const end = start + cliffDur + dur;
      await expect(
        vestingWallet.connect(admin).addTranche({ timestamp: end + 1, amount: E('1') }),
      ).to.be.revertedWithCustomError(vestingWallet, 'TrancheAfterEnd');
    });

    it('addTranches (batch): happy path; amount sum + monotonic; OverAllocation guard', async () => {
      const { vestingWallet, admin, start, cliffDur, dur } = await loadFixture(fixture);

      const end = start + cliffDur + dur;

      // Remaining room for tranches = total - tge - linear = 30
      const a1 = E('10');
      const a2 = E('20');

      const ts = [start + 5, start + 70]; // monotonic, within [start, end], note: > cliff for second
      await expect(
        vestingWallet.connect(admin).addTranches([
          { timestamp: ts[0], amount: a1 },
          { timestamp: ts[1], amount: a2 },
        ]),
      )
        .to.emit(vestingWallet, 'TrancheAdded')
        .withArgs([ts[0], a1])
        .and.to.emit(vestingWallet, 'TrancheAdded')
        .withArgs([ts[1], a2]);

      expect(await vestingWallet.tranchesLength()).to.eq(2);
      expect(await vestingWallet.tranchesTotal()).to.eq(a1.add(a2));

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
    it('finalize: ok when tge + linear + tranchesTotal == total; then adding is blocked', async () => {
      const { vestingWallet, admin, start } = await loadFixture(fixture);

      // Put exactly the remaining 30 in tranches.
      await vestingWallet.connect(admin).addTranches([
        { timestamp: start + 5, amount: E('10') },
        { timestamp: start + 70, amount: E('20') },
      ]);

      await expect(vestingWallet.connect(admin).finalizeTranchesConfiguration()).to.emit(vestingWallet, 'Finalized');

      // No more adding
      await expect(
        vestingWallet.connect(admin).addTranche({ timestamp: start + 80, amount: E('1') }),
      ).to.be.revertedWithCustomError(vestingWallet, 'VestingFinalized');
    });

    it('finalize: reverts if allocation not balanced', async () => {
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

      const t1 = start + 5;
      const t2 = start + 70;
      const a1 = E('10'); // total tranches: 30
      const a2 = E('20');

      await vestingWallet.connect(admin).addTranches([
        { timestamp: t1, amount: a1 },
        { timestamp: t2, amount: a2 },
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
      await expect(vestingWallet.release())
        .to.emit(vestingWallet, 'ERC20Released')
        .withArgs(info.token, info.tgeAmount);

      expect(await LONG.balanceOf(alice.address)).to.eq(info.tgeAmount);
      expect(await LONG.balanceOf(vestingWallet.address)).to.eq(
        BigNumber.from(info.totalAllocation).sub(await info.tgeAmount),
      );

      // After first tranche (pre-cliff)
      await increaseToStrict(t1 + 1);
      const vested_t1 = BigNumber.from(info.tgeAmount).add(a1); // linear not started yet
      expect(await vestingWallet.vestedAmount(t1 + 1)).to.eq(vested_t1);
      // releasable = vested - released
      expect(await vestingWallet.releasable()).to.eq(a1);
      await vestingWallet.release();
      expect(await LONG.balanceOf(alice.address)).to.eq(BigNumber.from(info.tgeAmount).add(a1));

      // After second tranche and a bit of linear
      await increaseToStrict(t2 + 1);

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

      const vestedNow = BigNumber.from(info.tgeAmount).add(a1).add(a2).add(linearNow);

      expect(await vestingWallet.vestedAmount(now)).to.eq(vestedNow);

      const releasedSoFar = BigNumber.from(info.tgeAmount).add(a1);
      const releasableNow = vestedNow.sub(releasedSoFar);
      expect(await vestingWallet.releasable()).to.eq(releasableNow);
      await vestingWallet.release();
      expect(await LONG.balanceOf(alice.address)).to.approximately(
        releasedSoFar.add(releasableNow),
        ethers.utils.parseEther('0.2'),
      );

      // At full vesting end — all should be vested; release drains the rest
      await increaseToStrict(end + 1);
      expect(await vestingWallet.vestedAmount(end + 1)).to.eq(info.totalAllocation);
      const releasableEnd = (await vestingWallet.vestedAmount(end + 1)).sub(await vestingWallet['released']());
      await vestingWallet.release();

      expect(await LONG.balanceOf(alice.address)).to.eq(info.totalAllocation);
      expect(await LONG.balanceOf(vestingWallet.address)).to.eq(0);
      expect(releasableEnd).to.be.gt(0);
    });
  });

  describe('Step-based only (duration = 0, linear = 0)', () => {
    it('works with pure TGE + tranches (no linear part)', async () => {
      const [admin, pauser] = await ethers.getSigners();
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

      const start = (await time.latest()) + 5;
      const cliffDur = 0;
      const dur = 0;

      const info: VestingWalletInfoStruct = {
        startTimestamp: start,
        cliffDurationSeconds: cliffDur,
        durationSeconds: dur,
        token: LONG.address,
        beneficiary: admin.address,
        totalAllocation: E('10'),
        tgeAmount: E('2'),
        linearAllocation: E('0'),
        description: 'StepOnly',
      };

      const vestingWallet: VestingWalletExtended = await deployVestingWallet(
        info,
        factory.address,
        LONG.address,
        signer.privateKey,
        admin,
      );

      // Add 8 tokens as a single tranche right at start
      await vestingWallet.connect(admin).addTranche({ timestamp: start, amount: E('8') });
      await vestingWallet.connect(admin).finalizeTranchesConfiguration();

      await increaseToStrict(start + 1);
      expect(await vestingWallet.vestedAmount(start + 1)).to.eq(E('10'));
      const before = await LONG.balanceOf(admin.address);
      await vestingWallet.release();
      const after = await LONG.balanceOf(admin.address);
      expect(after.sub(before)).to.eq(E('10'));
      expect(await vestingWallet.releasable()).to.eq(0);
      expect(await LONG.balanceOf(vestingWallet.address)).to.eq(0);
    });
  });
});

import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { deployLONG, deployStaking } from '../../../helpers/deployFixtures';
import { getPercentage } from '../../../helpers/math';
import { LONG, Staking } from '../../../typechain-types';

describe('Staking', () => {
  async function fixture() {
    const [admin, treasury, pauser, minter, burner, user1, user2] = await ethers.getSigners();

    const long: LONG = await deployLONG(admin.address, admin.address, pauser.address);
    const staking: Staking = await deployStaking(admin.address, treasury.address, long.address);

    return {
      admin,
      treasury,
      pauser,
      minter,
      burner,
      user1,
      user2,
      long,
      staking,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { staking, long, admin } = await loadFixture(fixture);

      expect(staking.address).to.be.properAddress;

      expect(await staking.name()).to.eq('LONG Staking');
      expect(await staking.symbol()).to.eq('sLONG');
      expect(await staking.asset()).to.eq(long.address);
      expect(await staking.owner()).to.eq(admin.address);
    });

    it('can not be initialized again', async () => {
      const { staking } = await loadFixture(fixture);

      await expect(staking.initialize(staking.address, staking.address, staking.address)).to.be.revertedWithCustomError(
        staking,
        'InvalidInitialization',
      );
    });
  });

  describe('Staking features', () => {
    it('deposit()', async () => {
      const { staking, long, admin, minter, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      const tx = await staking.connect(user1).deposit(amount, user1.address);

      await expect(tx).to.emit(staking, 'Deposit').withArgs(user1.address, user1.address, amount, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(amount);
      expect(await long.balanceOf(staking.address)).to.eq(amount);
      expect(await long.balanceOf(user1.address)).to.eq(0);
      // CHANGED: check recorded shares instead of amount
      expect((await staking.stakes(user1.address, 0)).shares).to.eq(amount);
    });

    it('deposit() reverts if minted shares would be zero (donation griefing)', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const donation = ethers.utils.parseEther('101');
      const amount = ethers.utils.parseEther('100');

      // attacker donates directly to inflate totalAssets
      await long.connect(admin).transfer(staking.address, donation);

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await expect(staking.connect(user1).deposit(amount, user1.address)).to.be.revertedWithCustomError(
        staking,
        'SharesEqZero',
      );
    });

    it('mint()', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      const tx = await staking.connect(user1).mint(amount, user1.address);

      await expect(tx).to.emit(staking, 'Deposit').withArgs(user1.address, user1.address, amount, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(amount);
      expect(await long.balanceOf(staking.address)).to.eq(amount);
      expect(await long.balanceOf(user1.address)).to.eq(0);
      // CHANGED: check recorded shares instead of amount
      expect((await staking.stakes(user1.address, 0)).shares).to.eq(amount);
    });

    it('withdraw()', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      const oneDay = 24 * 60 * 60;
      await staking.connect(admin).setMinStakePeriod(oneDay);
      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount, user1.address);

      await expect(staking.connect(user1).withdraw(amount, user1.address, user1.address)).to.be.revertedWithCustomError(
        staking,
        'WithdrawMoreThanMax',
      );

      await time.increase(oneDay + 1);

      const tx = await staking.connect(user1).withdraw(amount, user1.address, user1.address);

      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(0);
      expect(await long.balanceOf(staking.address)).to.eq(0);
      expect(await long.balanceOf(user1.address)).to.eq(amount);
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('withdraw() 2 deposits', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('10000');

      await staking.connect(admin).setMinStakePeriod(1);
      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount.div(2), user1.address);
      await staking.connect(user1).deposit(amount.div(2), user1.address);

      await time.increase(2);

      const tx = await staking.connect(user1).withdraw(amount, user1.address, user1.address);

      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(0);
      expect(await long.balanceOf(staking.address)).to.eq(0);
      expect(await long.balanceOf(user1.address)).to.eq(amount);
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('withdraw() half of deposit', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const fullAmount = ethers.utils.parseEther('10000');
      const amount = fullAmount.div(2);

      await staking.connect(admin).setMinStakePeriod(1);
      await long.connect(admin).transfer(user1.address, fullAmount);
      await long.connect(user1).approve(staking.address, fullAmount);

      await staking.connect(user1).deposit(fullAmount, user1.address);

      await time.increase(2);

      const tx = await staking.connect(user1).withdraw(amount, user1.address, user1.address);

      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(staking.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(user1.address)).to.eq(amount);
      expect(await staking.unlockedStakes(user1.address)).to.eq(fullAmount.div(2));
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('increasing min lock does not relock already unlocked stakes', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);
      await staking.connect(user1).deposit(amount, user1.address);

      // advance beyond initial min stake period (1 day)
      await time.increase(24 * 60 * 60 + 1);

      // increase min stake period to 5 days
      const fiveDays = 5 * 24 * 60 * 60;
      await staking.connect(admin).setMinStakePeriod(fiveDays);

      // should still withdraw successfully because stake was already unlocked
      await staking.connect(user1).withdraw(amount, user1.address, user1.address);
      expect(await long.balanceOf(user1.address)).to.eq(amount);
    });

    it('increasing min lock does not extend existing lock durations', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);
      await staking.connect(user1).deposit(amount, user1.address);

      // increase minimum before the original lock expires
      const fiveDays = 5 * 24 * 60 * 60;
      await staking.connect(admin).setMinStakePeriod(fiveDays);

      // original lock (1 day) should still govern this stake
      await time.increase(24 * 60 * 60 + 1);

      await staking.connect(user1).withdraw(amount, user1.address, user1.address);
      expect(await long.balanceOf(user1.address)).to.eq(amount);
    });

    it('maxWithdraw and maxRedeem only expose unlocked stakes', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);
      await staking.connect(user1).deposit(amount, user1.address);

      expect(await staking.maxWithdraw(user1.address)).to.eq(0);
      expect(await staking.maxRedeem(user1.address)).to.eq(0);

      const minPeriod = await staking.minStakePeriod();
      await time.increase(minPeriod.add(1));

      expect(await staking.maxRedeem(user1.address)).to.eq(amount);
      expect(await staking.maxWithdraw(user1.address)).to.eq(amount);
    });

    it('transfer moves stake records to recipient', async () => {
      const { staking, long, admin, user1, user2 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      await staking.connect(admin).setMinStakePeriod(1);
      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);
      await staking.connect(user1).deposit(amount, user1.address);

      // Transfer all shares to user2
      await staking.connect(user1).transfer(user2.address, amount);

      await time.increase(2);

      const tx = await staking.connect(user2).withdraw(amount, user2.address, user2.address);

      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user2.address, user2.address, user2.address, amount, amount);
      expect(await long.balanceOf(user2.address)).to.eq(amount);
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('emergency withdraw only penalizes locked portion', async () => {
      const { staking, long, admin, treasury, user1 } = await loadFixture(fixture);

      const unlockedAmt = ethers.utils.parseEther('200');
      const lockedAmt = ethers.utils.parseEther('200');
      const total = unlockedAmt.add(lockedAmt);

      await long.connect(admin).transfer(user1.address, total);
      await long.connect(user1).approve(staking.address, total);

      await staking.connect(user1).deposit(unlockedAmt, user1.address);

      // advance to unlock the first deposit (min stake period remains default 1 day)
      await time.increase(24 * 60 * 60 + 1);

      await staking.connect(user1).deposit(lockedAmt, user1.address);

      const tx = await staking.connect(user1).emergencyWithdraw(total, user1.address, user1.address);

      const penalty = getPercentage(lockedAmt, await staking.penaltyPercentage());
      const payout = total.sub(penalty);

      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, total);
      expect(await long.balanceOf(user1.address)).to.eq(payout);
      expect(await long.balanceOf(treasury.address)).to.eq(penalty);
      expect(await staking.balanceOf(user1.address)).to.eq(0);
    });

    it('redeem()', async () => {
      const { staking, long, admin, minter, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      const oneDay = 24 * 60 * 60;
      await staking.connect(admin).setMinStakePeriod(oneDay);
      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount, user1.address);

      await expect(staking.connect(user1).withdraw(amount, user1.address, user1.address)).to.be.revertedWithCustomError(
        staking,
        'WithdrawMoreThanMax',
      );

      await time.increase(oneDay + 1);

      const tx = await staking.connect(user1).redeem(amount, user1.address, user1.address);

      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(0);
      expect(await long.balanceOf(staking.address)).to.eq(0);
      expect(await long.balanceOf(user1.address)).to.eq(amount);
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('redeem() 2 deposits', async () => {
      const { staking, long, admin, minter, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('10000');

      await staking.connect(admin).setMinStakePeriod(1);
      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount.div(2), user1.address);
      await staking.connect(user1).deposit(amount.div(2), user1.address);

      await time.increase(2);

      const tx = await staking.connect(user1).redeem(amount, user1.address, user1.address);

      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(0);
      expect(await long.balanceOf(staking.address)).to.eq(0);
      expect(await long.balanceOf(user1.address)).to.eq(amount);
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('redeem() half of deposit', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const fullAmount = ethers.utils.parseEther('10000');
      const amount = fullAmount.div(2);

      await staking.connect(admin).setMinStakePeriod(1);
      await long.connect(admin).transfer(user1.address, fullAmount);
      await long.connect(user1).approve(staking.address, fullAmount);

      await staking.connect(user1).deposit(fullAmount, user1.address);

      await time.increase(2);

      const tx = await staking.connect(user1).redeem(amount, user1.address, user1.address);

      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(staking.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(user1.address)).to.eq(amount);
      expect(await staking.unlockedStakes(user1.address)).to.eq(fullAmount.div(2));
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('emergencyWithdraw()', async () => {
      const { staking, long, treasury, admin, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount, user1.address);

      await expect(
        staking.connect(user1).emergencyWithdraw(amount.add(1), user1.address, user1.address),
      ).to.be.revertedWithCustomError(staking, 'WithdrawMoreThanMax');

      const expectedPayout = await staking
        .connect(user1)
        .callStatic.emergencyWithdraw(amount, user1.address, user1.address);
      const tx = await staking.connect(user1).emergencyWithdraw(amount, user1.address, user1.address);

      const penalty = getPercentage(amount, await staking.penaltyPercentage());
      const payout = amount.sub(penalty);

      expect(expectedPayout).to.eq(payout);
      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(0);
      expect(await long.balanceOf(staking.address)).to.eq(0);
      expect(await long.balanceOf(treasury.address)).to.eq(penalty);
      expect(await long.balanceOf(user1.address)).to.eq(payout);
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('emergencyWithdraw() 2 deposits', async () => {
      const { staking, long, treasury, admin, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('10000');

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount.div(2), user1.address);
      await staking.connect(user1).deposit(amount.div(2), user1.address);

      const tx = await staking.connect(user1).emergencyWithdraw(amount, user1.address, user1.address);

      const penalty = getPercentage(amount, await staking.penaltyPercentage());
      const payout = amount.sub(penalty);

      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(0);
      expect(await long.balanceOf(staking.address)).to.eq(0);
      expect(await long.balanceOf(treasury.address)).to.eq(penalty);
      expect(await long.balanceOf(user1.address)).to.eq(payout);
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('emergencyWithdraw() half of deposit', async () => {
      const { staking, long, treasury, admin, user1 } = await loadFixture(fixture);

      const fullAmount = ethers.utils.parseEther('10000');
      const amount = fullAmount.div(2);

      await long.connect(admin).transfer(user1.address, fullAmount);
      await long.connect(user1).approve(staking.address, fullAmount);

      await staking.connect(user1).deposit(fullAmount, user1.address);

      const tx = await staking.connect(user1).emergencyWithdraw(amount, user1.address, user1.address);

      const penalty = getPercentage(amount, await staking.penaltyPercentage());
      const payout = amount.sub(penalty);

      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(staking.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(treasury.address)).to.eq(penalty);
      expect(await long.balanceOf(user1.address)).to.eq(payout);
      expect((await staking.stakes(user1.address, 0)).shares).to.eq(fullAmount.div(2));
    });

    it('emergencyRedeem()', async () => {
      const { staking, long, treasury, admin, user1, user2 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount, user1.address);

      await expect(
        staking.connect(user1).emergencyRedeem(0, user1.address, user1.address),
      ).to.be.revertedWithCustomError(staking, 'SharesEqZero');

      await expect(
        staking.connect(user1).emergencyRedeem(amount.add(1), user1.address, user1.address),
      ).to.be.revertedWithCustomError(staking, 'RedeemMoreThanMax');

      await expect(
        staking.connect(user2).emergencyRedeem(amount, user1.address, user1.address),
      ).to.be.revertedWithCustomError(staking, 'InsufficientAllowance');

      const expectedPayout = await staking
        .connect(user1)
        .callStatic.emergencyRedeem(amount, user1.address, user1.address);
      const tx = await staking.connect(user1).emergencyRedeem(amount, user1.address, user1.address);

      const penalty = getPercentage(amount, await staking.penaltyPercentage());
      const payout = amount.sub(penalty);

      expect(expectedPayout).to.eq(payout);
      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(0);
      expect(await long.balanceOf(staking.address)).to.eq(0);
      expect(await long.balanceOf(treasury.address)).to.eq(penalty);
      expect(await long.balanceOf(user1.address)).to.eq(payout);
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('emergencyRedeem() 2 deposits', async () => {
      const { staking, long, treasury, admin, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('10000');

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount.div(2), user1.address);
      await staking.connect(user1).deposit(amount.div(2), user1.address);

      const tx = await staking.connect(user1).emergencyRedeem(amount, user1.address, user1.address);

      const penalty = getPercentage(amount, await staking.penaltyPercentage());
      const payout = amount.sub(penalty);

      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(0);
      expect(await long.balanceOf(staking.address)).to.eq(0);
      expect(await long.balanceOf(treasury.address)).to.eq(penalty);
      expect(await long.balanceOf(user1.address)).to.eq(payout);
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });

    it('emergencyRedeem() half of deposit', async () => {
      const { staking, long, treasury, admin, user1 } = await loadFixture(fixture);

      const fullAmount = ethers.utils.parseEther('10000');
      const amount = fullAmount.div(2);

      await long.connect(admin).transfer(user1.address, fullAmount);
      await long.connect(user1).approve(staking.address, fullAmount);
      await staking.connect(user1).deposit(fullAmount, user1.address);

      const tx = await staking.connect(user1).emergencyRedeem(amount, user1.address, user1.address);

      const penalty = getPercentage(amount, await staking.penaltyPercentage());
      const payout = amount.sub(penalty);

      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(staking.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(treasury.address)).to.eq(penalty);
      expect(await long.balanceOf(user1.address)).to.eq(payout);
      expect((await staking.stakes(user1.address, 0)).shares).to.eq(fullAmount.div(2));
    });
  });

  describe('Rewards distribution (rebase)', () => {
    it('only owner and non-zero amount', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const reward = ethers.utils.parseEther('100');

      await expect(staking.connect(user1).distributeRewards(reward)).to.be.revertedWithCustomError(
        staking,
        'Unauthorized',
      );
      await expect(staking.connect(admin).distributeRewards(0)).to.be.revertedWithCustomError(staking, 'ZeroReward');

      await long.connect(admin).approve(staking.address, reward);
      const duration = await staking.rewardsDuration();
      const expectedRate = reward.div(duration);

      await expect(staking.connect(admin).distributeRewards(reward))
        .to.emit(staking, 'RewardsDistributed')
        .withArgs(reward, duration, expectedRate);
    });

    it('single staker receives rebase via redeem(all shares)', async () => {
      const { staking, long, admin, user1 } = await loadFixture(fixture);

      const depositAmt = ethers.utils.parseEther('1000');
      const reward = ethers.utils.parseEther('250');

      await long.connect(admin).transfer(user1.address, depositAmt);
      await long.connect(user1).approve(staking.address, depositAmt);
      await staking.connect(user1).deposit(depositAmt, user1.address);

      await long.connect(admin).approve(staking.address, reward);
      await staking.connect(admin).distributeRewards(reward);

      await time.increase(await staking.rewardsDuration());
      await staking.connect(admin).setMinStakePeriod(1);

      const shares = await staking.balanceOf(user1.address);
      const expectedAssets = await staking.previewRedeem(shares);

      const tx = await staking.connect(user1).redeem(shares, user1.address, user1.address);

      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, expectedAssets, shares);

      expect(await long.balanceOf(user1.address)).to.eq(expectedAssets);
      expect(expectedAssets).to.approximately(depositAmt.add(reward), 1);
    });

    it('pro-rata rebase across two stakers', async () => {
      const { staking, long, admin, user1, user2 } = await loadFixture(fixture);

      const a1 = ethers.utils.parseEther('1000');
      const a2 = ethers.utils.parseEther('3000');
      const reward = ethers.utils.parseEther('400');

      // deposits
      await long.connect(admin).transfer(user1.address, a1);
      await long.connect(admin).transfer(user2.address, a2);
      await long.connect(user1).approve(staking.address, a1);
      await long.connect(user2).approve(staking.address, a2);
      await staking.connect(user1).deposit(a1, user1.address);
      await staking.connect(user2).deposit(a2, user2.address);

      // rebase
      await long.connect(admin).approve(staking.address, reward);
      await staking.connect(admin).distributeRewards(reward);

      await time.increase(await staking.rewardsDuration());
      await staking.connect(admin).setMinStakePeriod(1);

      // user1
      const s1 = await staking.balanceOf(user1.address);
      const exp1 = await staking.previewRedeem(s1);
      await staking.connect(user1).redeem(s1, user1.address, user1.address);

      // user2
      const s2 = await staking.balanceOf(user2.address);
      const exp2 = await staking.previewRedeem(s2);
      await staking.connect(user2).redeem(s2, user2.address, user2.address);

      expect(exp1.add(exp2)).to.approximately(a1.add(a2).add(reward), 1);

      // proportions
      const r1 = reward.mul(a1).div(a1.add(a2));
      const r2 = reward.sub(r1);
      expect(exp1).to.approximately(a1.add(r1), 1);
      expect(exp2).to.approximately(a2.add(r2), 1);
    });

    it('emergencyRedeem after rebase applies penalty on rebased assets', async () => {
      const { staking, long, admin, treasury, user1 } = await loadFixture(fixture);

      const depositAmt = ethers.utils.parseEther('1000');
      const reward = ethers.utils.parseEther('200');

      // keep stake locked while rewards stream finishes
      const newMinPeriod = (await staking.rewardsDuration()).add(24 * 60 * 60);
      await staking.connect(admin).setMinStakePeriod(newMinPeriod);

      await long.connect(admin).transfer(user1.address, depositAmt);
      await long.connect(user1).approve(staking.address, depositAmt);
      await staking.connect(user1).deposit(depositAmt, user1.address);

      await long.connect(admin).approve(staking.address, reward);
      await staking.connect(admin).distributeRewards(reward);

      await time.increase(await staking.rewardsDuration());
      const shares = await staking.balanceOf(user1.address);
      const assets = await staking.previewRedeem(shares);
      const penaltyPct = await staking.penaltyPercentage();
      const penalty = assets.mul(penaltyPct).div(await staking.SCALING_FACTOR());
      const payout = assets.sub(penalty);

      const expectedPayout = await staking
        .connect(user1)
        .callStatic.emergencyRedeem(shares, user1.address, user1.address);
      const tx = await staking.connect(user1).emergencyRedeem(shares, user1.address, user1.address);

      expect(expectedPayout).to.eq(payout);
      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, shares);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, payout, shares);

      expect(await long.balanceOf(user1.address)).to.eq(payout);
      expect(await long.balanceOf(treasury.address)).to.eq(penalty);
      expect(await staking.balanceOf(user1.address)).to.eq(0);
      await expect(staking.stakes(user1.address, 0)).to.be.reverted;
    });
  });

  describe('Set functions', () => {
    it('setMinStakePeriod()', async () => {
      const { staking, admin, user1 } = await loadFixture(fixture);

      await expect(staking.connect(user1).setMinStakePeriod(1)).to.be.revertedWithCustomError(staking, 'Unauthorized');
      await expect(staking.connect(admin).setMinStakePeriod(0)).to.be.revertedWithCustomError(
        staking,
        'MinStakePeriodShouldBeGreaterThanZero',
      );

      const tx = await staking.connect(admin).setMinStakePeriod(1);

      await expect(tx).to.emit(staking, 'MinStakePeriodSet').withArgs(1);
      expect(await staking.minStakePeriod()).to.eq(1);
    });

    it('setPenaltyPercentage()', async () => {
      const { staking, admin, user1 } = await loadFixture(fixture);

      await expect(staking.connect(user1).setPenaltyPercentage(1)).to.be.revertedWithCustomError(
        staking,
        'Unauthorized',
      );
      await expect(staking.connect(admin).setPenaltyPercentage(10000000)).to.be.revertedWithCustomError(
        staking,
        'PenaltyTooHigh',
      );

      const tx = await staking.connect(admin).setPenaltyPercentage(1);

      await expect(tx).to.emit(staking, 'PenaltyPercentSet').withArgs(1);
      expect(await staking.penaltyPercentage()).to.eq(1);
    });

    it('setTreasury()', async () => {
      const { staking, admin, user1 } = await loadFixture(fixture);

      await expect(staking.connect(user1).setTreasury(user1.address)).to.be.revertedWithCustomError(
        staking,
        'Unauthorized',
      );

      const tx = await staking.connect(admin).setTreasury(user1.address);

      await expect(tx).to.emit(staking, 'TreasurySet').withArgs(user1.address);
      expect(await staking.treasury()).to.eq(user1.address);
    });

    it('setRewardsDuration()', async () => {
      const { staking, admin, user1 } = await loadFixture(fixture);

      await expect(staking.connect(user1).setRewardsDuration(1)).to.be.revertedWithCustomError(staking, 'Unauthorized');
      await expect(staking.connect(admin).setRewardsDuration(0)).to.be.revertedWithCustomError(
        staking,
        'RewardDurationShouldBeGreaterThanZero',
      );

      const tx = await staking.connect(admin).setRewardsDuration(100);

      await expect(tx).to.emit(staking, 'RewardDurationSet').withArgs(100);
      expect(await staking.rewardsDuration()).to.eq(100);
    });
  });
});

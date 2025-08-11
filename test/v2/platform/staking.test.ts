import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { LONG, Staking } from '../../../typechain-types';
import { getPercentage } from '../helpers/getPercentage';
import { deployLONG, deployStaking } from '../helpers/deployFixtures';

describe('Staking', () => {
  async function fixture() {
    const [admin, treasury, pauser, minter, burner, user1, user2] = await ethers.getSigners();

    const long: LONG = await deployLONG(
      admin.address,
      ethers.utils.parseEther('750000000'),
      admin.address,
      pauser.address,
    );
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

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount, user1.address);

      await expect(staking.connect(user1).withdraw(amount, user1.address, user1.address)).to.be.revertedWithCustomError(
        staking,
        'MinStakePeriodNotMet',
      );

      await staking.connect(admin).setMinStakePeriod(1);

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

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount.div(2), user1.address);
      await staking.connect(user1).deposit(amount.div(2), user1.address);

      await staking.connect(admin).setMinStakePeriod(1);

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

      await long.connect(admin).transfer(user1.address, fullAmount);
      await long.connect(user1).approve(staking.address, fullAmount);

      await staking.connect(user1).deposit(fullAmount, user1.address);

      await staking.connect(admin).setMinStakePeriod(1);

      const tx = await staking.connect(user1).withdraw(amount, user1.address, user1.address);

      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(staking.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(user1.address)).to.eq(amount);
      expect((await staking.stakes(user1.address, 0)).shares).to.eq(fullAmount.div(2));
    });

    it('redeem()', async () => {
      const { staking, long, admin, minter, user1 } = await loadFixture(fixture);

      const amount = ethers.utils.parseEther('1000');

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount, user1.address);

      await expect(staking.connect(user1).withdraw(amount, user1.address, user1.address)).to.be.revertedWithCustomError(
        staking,
        'MinStakePeriodNotMet',
      );

      await staking.connect(admin).setMinStakePeriod(1);

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

      await long.connect(admin).transfer(user1.address, amount);
      await long.connect(user1).approve(staking.address, amount);

      await staking.connect(user1).deposit(amount.div(2), user1.address);
      await staking.connect(user1).deposit(amount.div(2), user1.address);

      await staking.connect(admin).setMinStakePeriod(1);

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

      await long.connect(admin).transfer(user1.address, fullAmount);
      await long.connect(user1).approve(staking.address, fullAmount);

      await staking.connect(user1).deposit(fullAmount, user1.address);

      await staking.connect(admin).setMinStakePeriod(1);

      const tx = await staking.connect(user1).redeem(amount, user1.address, user1.address);

      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      expect(await staking.balanceOf(user1.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(staking.address)).to.eq(fullAmount.div(2));
      expect(await long.balanceOf(user1.address)).to.eq(amount);
      expect((await staking.stakes(user1.address, 0)).shares).to.eq(fullAmount.div(2));
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

      const tx = await staking.connect(user1).emergencyWithdraw(amount, user1.address, user1.address);

      const penalty = getPercentage(amount, await staking.penaltyPercentage());
      const payout = amount.sub(penalty);

      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
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
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
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
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
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
        staking.connect(user1).emergencyRedeem(amount.add(1), user1.address, user1.address),
      ).to.be.revertedWithCustomError(staking, 'RedeemMoreThanMax');

      await expect(
        staking.connect(user2).emergencyRedeem(amount, user1.address, user1.address),
      ).to.be.revertedWithCustomError(staking, 'InsufficientAllowance');

      const tx = await staking.connect(user1).emergencyRedeem(amount, user1.address, user1.address);

      const penalty = getPercentage(amount, await staking.penaltyPercentage());
      const payout = amount.sub(penalty);

      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
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
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
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
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
      await expect(tx)
        .to.emit(staking, 'Withdraw')
        .withArgs(user1.address, user1.address, user1.address, amount, amount);
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

      await expect(staking.connect(admin).distributeRewards(reward))
        .to.emit(staking, 'RewardsDistributed')
        .withArgs(reward);
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

      await long.connect(admin).transfer(user1.address, depositAmt);
      await long.connect(user1).approve(staking.address, depositAmt);
      await staking.connect(user1).deposit(depositAmt, user1.address);

      await long.connect(admin).approve(staking.address, reward);
      await staking.connect(admin).distributeRewards(reward);

      const shares = await staking.balanceOf(user1.address);
      const assets = await staking.previewRedeem(shares);
      const penaltyPct = await staking.penaltyPercentage();
      const penalty = assets.mul(penaltyPct).div(await staking.SCALING_FACTOR());
      const payout = assets.sub(penalty);

      const tx = await staking.connect(user1).emergencyRedeem(shares, user1.address, user1.address);

      await expect(tx)
        .to.emit(staking, 'EmergencyWithdraw')
        .withArgs(user1.address, user1.address, user1.address, assets, shares);

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

    it('setpenaltyPercentage()', async () => {
      const { staking, admin, user1 } = await loadFixture(fixture);

      await expect(staking.connect(user1).setpenaltyPercentage(1)).to.be.revertedWithCustomError(
        staking,
        'Unauthorized',
      );
      await expect(staking.connect(admin).setpenaltyPercentage(10000000)).to.be.revertedWithCustomError(
        staking,
        'PenaltyTooHigh',
      );

      const tx = await staking.connect(admin).setpenaltyPercentage(1);

      await expect(tx).to.emit(staking, 'PenaltyPecentSet').withArgs(1);
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
  });
});

import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import { ethers } from 'hardhat';

import { LONGPriceFeed } from '../../../typechain-types';

describe('LONGPriceFeed', () => {
  async function fixture() {
    const [owner, other] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('LONGPriceFeed');
    const feed: LONGPriceFeed = (await factory.deploy(owner.address, 8, 'LONG / USD', 100000000)) as LONGPriceFeed;
    await feed.deployed();

    return { owner, other, feed, factory };
  }

  it('reverts when owner is zero address', async () => {
    const factory = await ethers.getContractFactory('LONGPriceFeed');
    await expect(
      factory.deploy(ethers.constants.AddressZero, 8, 'LONG / USD', 100000000),
    ).to.be.revertedWithCustomError(factory, 'ZeroAddressPassed');
  });

  it('deploys with metadata and initial round', async () => {
    const { feed } = await loadFixture(fixture);

    expect(await feed.decimals()).to.eq(8);
    expect(await feed.description()).to.eq('LONG / USD');
    expect(await feed.version()).to.eq(1);

    const [roundId, answer, startedAt, updatedAt, answeredInRound] = await feed.latestRoundData();
    expect(roundId).to.eq(1);
    expect(answer).to.eq(100000000);
    expect(startedAt).to.be.gt(0);
    expect(updatedAt).to.be.gt(0);
    expect(answeredInRound).to.eq(roundId);
  });

  it('reverts when no data present', async () => {
    const [owner] = await ethers.getSigners();
    const factory = await ethers.getContractFactory('LONGPriceFeed');
    const feed: LONGPriceFeed = (await factory.deploy(owner.address, 8, 'LONG / USD', 0)) as LONGPriceFeed;
    await feed.deployed();

    expect(await feed.latestRound()).to.eq(0);
    await expect(feed.latestRoundData()).to.be.revertedWithCustomError(feed, 'NoDataPresent').withArgs(0);
    await expect(feed.getRoundData(1)).to.be.revertedWithCustomError(feed, 'NoDataPresent').withArgs(1);
    await expect(feed.latestAnswer()).to.be.revertedWithCustomError(feed, 'NoDataPresent').withArgs(0);
    await expect(feed.latestTimestamp()).to.be.revertedWithCustomError(feed, 'NoDataPresent').withArgs(0);
  });

  it('only owner can update answer and description', async () => {
    const { feed, other } = await loadFixture(fixture);

    await expect(feed.connect(other).updateAnswer(100000001)).to.be.revertedWithCustomError(feed, 'Unauthorized');
    await expect(feed.connect(other).setDescription('NEW')).to.be.revertedWithCustomError(feed, 'Unauthorized');
  });

  it('rejects non-positive answers', async () => {
    const { feed } = await loadFixture(fixture);

    await expect(feed.updateAnswer(0)).to.be.revertedWithCustomError(feed, 'InvalidAnswer').withArgs(0);
  });

  it('updates rounds and accessors', async () => {
    const { feed } = await loadFixture(fixture);

    await expect(feed.updateAnswer(200000000)).to.emit(feed, 'NewRound').to.emit(feed, 'AnswerUpdated');

    expect(await feed.latestRound()).to.eq(2);
    expect(await feed.latestAnswer()).to.eq(200000000);
    expect(await feed.latestTimestamp()).to.be.gt(0);

    const [roundId, answer, , updatedAt, answeredInRound] = await feed.latestRoundData();
    expect(roundId).to.eq(2);
    expect(answer).to.eq(200000000);
    expect(updatedAt).to.be.gt(0);
    expect(answeredInRound).to.eq(2);

    const [oldRoundId, oldAnswer] = await feed.getRoundData(1);
    expect(oldRoundId).to.eq(1);
    expect(oldAnswer).to.eq(100000000);
  });
});

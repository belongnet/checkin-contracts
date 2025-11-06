import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import EthCrypto from 'eth-crypto';
import {
  AccessToken,
  CreditToken,
  Escrow,
  Factory,
  Helper,
  MockTransferValidatorV2,
  RoyaltiesReceiverV2,
  SignatureVerifier,
  Staking,
  BelongCheckIn,
  VestingWalletExtended,
  DualDexSwapV4Lib,
} from '../../../typechain-types';
import {
  deployCreditTokens,
  deployAccessTokenImplementation,
  deployCreditTokenImplementation,
  deployFactory,
  deployRoyaltiesReceiverV2Implementation,
  deployStaking,
  deployDualDexSwapV4Lib,
  deployBelongCheckIn,
  deployEscrow,
  deployVestingWalletImplementation,
} from '../../../helpers/deployFixtures';
import { getSignerFromAddress, getToken, startSimulateBSC, stopSimulate } from '../../../helpers/fork';
import { PCS_V2_ROUTER, USDT_ADDRESS, CAKE_ADDRESS } from '../../../helpers/pcs';
import { deployHelper, deploySignatureVerifier } from '../../../helpers/deployLibraries';
import { deployMockTransferValidatorV2, deployPriceFeeds } from '../../../helpers/deployMockFixtures';
import { expect } from 'chai';
import {
  CustomerInfoStruct,
  PromoterInfoStruct,
  VenueInfoStruct,
  VenueRulesStruct,
} from '../../../typechain-types/contracts/v2/platform/BelongCheckIn';
import { u } from '../../../helpers/math';
import { DualDexSwapV4Lib as DualDexSwapV4LibType } from '../../../typechain-types/contracts/v2/platform/extensions/DualDexSwapV4';

enum DexType {
  UniV4,
  PcsV4,
  PcsV2,
}

describe('BelongCheckIn BSC PancakeSwapV2', () => {
  const chainId = 31337;

  const USDT_WHALE_ADDRESS = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3';
  const CAKE_WHALE_ADDRESS = '0xD183F2BBF8b28d9fec8367cb06FE72B88778C86B';

  const MAX_PRICEFEED_DELAY = 3600;
  const SLIPPAGE_1pct_27dec = ethers.utils.parseUnits('1', 25);
  let paymentsInfo: DualDexSwapV4LibType.PaymentsInfoStruct;

  const usdTokenPercentage = 1000;
  const convenienceFeeAmount = ethers.utils.parseEther('5'); // $5
  const stakingRewards: [
    BelongCheckIn.RewardsInfoStruct,
    BelongCheckIn.RewardsInfoStruct,
    BelongCheckIn.RewardsInfoStruct,
    BelongCheckIn.RewardsInfoStruct,
    BelongCheckIn.RewardsInfoStruct,
  ] = [
    {
      venueStakingInfo: {
        depositFeePercentage: 1000,
        convenienceFeeAmount,
      } as BelongCheckIn.VenueStakingRewardInfoStruct,
      promoterStakingInfo: {
        usdTokenPercentage,
        longPercentage: 500,
      } as BelongCheckIn.PromoterStakingRewardInfoStruct,
    } as BelongCheckIn.RewardsInfoStruct,
    {
      venueStakingInfo: {
        depositFeePercentage: 900,
        convenienceFeeAmount,
      } as BelongCheckIn.VenueStakingRewardInfoStruct,
      promoterStakingInfo: {
        usdTokenPercentage,
        longPercentage: 400,
      } as BelongCheckIn.PromoterStakingRewardInfoStruct,
    } as BelongCheckIn.RewardsInfoStruct,
    {
      venueStakingInfo: {
        depositFeePercentage: 800,
        convenienceFeeAmount,
      } as BelongCheckIn.VenueStakingRewardInfoStruct,
      promoterStakingInfo: {
        usdTokenPercentage,
        longPercentage: 300,
      } as BelongCheckIn.PromoterStakingRewardInfoStruct,
    } as BelongCheckIn.RewardsInfoStruct,
    {
      venueStakingInfo: {
        depositFeePercentage: 700,
        convenienceFeeAmount,
      } as BelongCheckIn.VenueStakingRewardInfoStruct,
      promoterStakingInfo: {
        usdTokenPercentage,
        longPercentage: 200,
      } as BelongCheckIn.PromoterStakingRewardInfoStruct,
    } as BelongCheckIn.RewardsInfoStruct,
    {
      venueStakingInfo: {
        depositFeePercentage: 500,
        convenienceFeeAmount,
      } as BelongCheckIn.VenueStakingRewardInfoStruct,
      promoterStakingInfo: {
        usdTokenPercentage,
        longPercentage: 100,
      } as BelongCheckIn.PromoterStakingRewardInfoStruct,
    } as BelongCheckIn.RewardsInfoStruct,
  ];
  const fees: BelongCheckIn.FeesStruct = {
    referralCreditsAmount: 2,
    affiliatePercentage: 1000,
    longCustomerDiscountPercentage: 300,
    platformSubsidyPercentage: 300,
    processingFeePercentage: 250,
    buybackBurnPercentage: 5000,
  };
  let implementations: Factory.ImplementationsStruct, contracts: BelongCheckIn.ContractsStruct;

  before(startSimulateBSC);
  after(stopSimulate);

  async function fixture() {
    const [admin, treasury, manager, minter, burner, pauser, referral] = await ethers.getSigners();
    const signer = EthCrypto.createIdentity();

    const USDT_whale = await getSignerFromAddress(USDT_WHALE_ADDRESS);
    const CAKE_whale = await getSignerFromAddress(CAKE_WHALE_ADDRESS);
    const USDT = await getToken(USDT_ADDRESS);
    const CAKE = await getToken(CAKE_ADDRESS);

    const signatureVerifier: SignatureVerifier = await deploySignatureVerifier();
    const validator: MockTransferValidatorV2 = await deployMockTransferValidatorV2();
    const accessTokenImplementation: AccessToken = await deployAccessTokenImplementation(signatureVerifier.address);
    const royaltiesReceiverV2Implementation: RoyaltiesReceiverV2 = await deployRoyaltiesReceiverV2Implementation();
    const creditTokenImplementation: CreditToken = await deployCreditTokenImplementation();
    const vestingWallet: VestingWalletExtended = await deployVestingWalletImplementation();

    implementations = {
      accessToken: accessTokenImplementation.address,
      creditToken: creditTokenImplementation.address,
      royaltiesReceiver: royaltiesReceiverV2Implementation.address,
      vestingWallet: vestingWallet.address,
    };

    const factory: Factory = await deployFactory(
      treasury.address,
      signer.address,
      signatureVerifier.address,
      validator.address,
      implementations,
    );

    const helper: Helper = await deployHelper();

    const staking: Staking = await deployStaking(admin.address, treasury.address, CAKE.address);

    const referralCode = EthCrypto.hash.keccak256([
      { type: 'address', value: referral.address },
      { type: 'address', value: factory.address },
      { type: 'uint256', value: chainId },
    ]);

    await factory.connect(referral).createReferralCode();

    const dualDexSwapV4Lib: DualDexSwapV4Lib = await deployDualDexSwapV4Lib();

    // const MockPcsRouter = await ethers.getContractFactory('MockPcsRouter');
    // const mockRouter = await MockPcsRouter.deploy();
    // await mockRouter.deployed();

    // const MockPcsQuoter = await ethers.getContractFactory('MockPcsQuoter');
    // const mockQuoter = await MockPcsQuoter.deploy();
    // await mockQuoter.deployed();

    const v2PathEncoded = ethers.utils.defaultAbiCoder.encode(['address[]'], [[USDT.address, CAKE.address]]);

    paymentsInfo = {
      dexType: DexType.PcsV2,
      slippageBps: SLIPPAGE_1pct_27dec,
      router: PCS_V2_ROUTER,
      quoter: PCS_V2_ROUTER,
      usdToken: USDT.address,
      long: CAKE.address,
      maxPriceFeedDelay: MAX_PRICEFEED_DELAY,
      poolKey: v2PathEncoded,
      hookData: '0x',
    };

    const belongCheckIn: BelongCheckIn = await deployBelongCheckIn(
      signatureVerifier.address,
      helper.address,
      dualDexSwapV4Lib.address,
      admin.address,
      paymentsInfo,
    );

    const escrow: Escrow = await deployEscrow(belongCheckIn.address);
    const { pf1, pf2, pf2_2, pf2_3, pf3 } = await deployPriceFeeds();
    const { venueToken, promoterToken } = await deployCreditTokens(
      true,
      false,
      factory.address,
      signer.privateKey,
      admin,
      manager.address,
      belongCheckIn.address,
      belongCheckIn.address,
    );

    contracts = {
      factory: factory.address,
      escrow: escrow.address,
      staking: staking.address,
      venueToken: venueToken.address,
      promoterToken: promoterToken.address,
      longPF: pf1.address,
    };

    await belongCheckIn.setContracts(contracts);

    return {
      signatureVerifier,
      helper,
      factory,
      staking,
      venueToken,
      promoterToken,
      belongCheckIn,
      escrow,
      pf1,
      pf2,
      pf2_2,
      pf2_3,
      pf3,
      admin,
      treasury,
      manager,
      minter,
      burner,
      pauser,
      referral,
      signer,
      referralCode,
      USDT,
      CAKE,
      USDT_whale,
      CAKE_whale,
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { belongCheckIn, escrow, helper, pf1, pf2, pf2_2, pf2_3, pf3, admin } = await loadFixture(fixture);

      expect(belongCheckIn.address).to.be.properAddress;
      expect(escrow.address).to.be.properAddress;
      expect(pf1.address).to.be.properAddress;
      expect(pf2.address).to.be.properAddress;
      expect(pf3.address).to.be.properAddress;

      expect(await belongCheckIn.owner()).to.eq(admin.address);

      const belongCheckInStorage = await belongCheckIn.belongCheckInStorage();

      // Convert contracts tuple to object
      const contractsFromStorage = {
        factory: belongCheckInStorage.contracts.factory,
        escrow: belongCheckInStorage.contracts.escrow,
        staking: belongCheckInStorage.contracts.staking,
        venueToken: belongCheckInStorage.contracts.venueToken,
        promoterToken: belongCheckInStorage.contracts.promoterToken,
        longPF: belongCheckInStorage.contracts.longPF,
      };
      expect(contractsFromStorage).to.deep.eq(contracts);
      expect(belongCheckInStorage.contracts).to.deep.eq(await belongCheckIn.contracts());

      // Convert paymentsInfo tuple to object
      const paymentsInfoFromStorage = {
        dexType: belongCheckInStorage.paymentsInfo.dexType,
        slippageBps: belongCheckInStorage.paymentsInfo.slippageBps,
        router: belongCheckInStorage.paymentsInfo.router,
        quoter: belongCheckInStorage.paymentsInfo.quoter,
        usdToken: belongCheckInStorage.paymentsInfo.usdToken,
        long: belongCheckInStorage.paymentsInfo.long,
        maxPriceFeedDelay: belongCheckInStorage.paymentsInfo.maxPriceFeedDelay,
        poolKey: belongCheckInStorage.paymentsInfo.poolKey,
        hookData: belongCheckInStorage.paymentsInfo.hookData,
      };
      expect(paymentsInfoFromStorage).to.deep.eq(paymentsInfo);
      // Convert fees tuple to object
      const feesFromStorage = {
        referralCreditsAmount: belongCheckInStorage.fees.referralCreditsAmount,
        affiliatePercentage: belongCheckInStorage.fees.affiliatePercentage,
        longCustomerDiscountPercentage: belongCheckInStorage.fees.longCustomerDiscountPercentage,
        platformSubsidyPercentage: belongCheckInStorage.fees.platformSubsidyPercentage,
        processingFeePercentage: belongCheckInStorage.fees.processingFeePercentage,
        buybackBurnPercentage: belongCheckInStorage.fees.buybackBurnPercentage,
      };
      expect(feesFromStorage).to.deep.eq(fees);
      expect(belongCheckInStorage.fees).to.deep.eq(await belongCheckIn.fees());

      for (let tierValue = 0; tierValue < stakingRewards.length; tierValue++) {
        const result = await belongCheckIn.stakingRewards(tierValue);
        const resultFromStorage = {
          venueStakingInfo: {
            depositFeePercentage: result.venueStakingInfo.depositFeePercentage,
            convenienceFeeAmount: result.venueStakingInfo.convenienceFeeAmount,
          },
          promoterStakingInfo: {
            usdTokenPercentage: result.promoterStakingInfo.usdTokenPercentage,
            longPercentage: result.promoterStakingInfo.longPercentage,
          },
        };
        expect(resultFromStorage).to.deep.eq(stakingRewards[tierValue]);
      }

      expect(await escrow.belongCheckIn()).to.eq(belongCheckIn.address);

      await expect(
        belongCheckIn.initialize(belongCheckIn.address, {
          dexType: DexType.PcsV2,
          slippageBps: 10,
          router: belongCheckIn.address,
          quoter: belongCheckIn.address,
          usdToken: belongCheckIn.address,
          long: belongCheckIn.address,
          maxPriceFeedDelay: 10,
          poolKey: '0x',
          hookData: '0x',
        } as DualDexSwapV4LibType.PaymentsInfoStruct),
      ).to.be.revertedWithCustomError(belongCheckIn, 'InvalidInitialization');

      await expect(helper.getPrice(pf2.address, 3600))
        .to.be.revertedWithCustomError(helper, 'IncorrectRoundId')
        .withArgs(pf2.address, 0);
      const { updatedAt: updatedAt_pf2_2 } = await pf2_2.latestRoundData();
      await expect(helper.getPrice(pf2_2.address, 3600))
        .to.be.revertedWithCustomError(helper, 'IncorrectLatestUpdatedTimestamp')
        .withArgs(pf2_2.address, updatedAt_pf2_2);
      await expect(helper.getPrice(pf2_3.address, 3600))
        .to.be.revertedWithCustomError(helper, 'IncorrectAnswer')
        .withArgs(pf2_3.address, -10);
      const { updatedAt: updatedAt_pf3 } = await pf3.latestRoundData();
      await expect(helper.getPrice(pf3.address, 0))
        .to.be.revertedWithCustomError(helper, 'IncorrectLatestUpdatedTimestamp')
        .withArgs(pf3.address, updatedAt_pf3);
    });
  });

  describe('Set functions', () => {
    it('setParameters() can be set only by the owner', async () => {
      const { belongCheckIn, minter } = await loadFixture(fixture);

      const paymentsInfoNew = {
        dexType: DexType.PcsV2,
        slippageBps: BigNumber.from(10).pow(27).sub(1),
        router: paymentsInfo.router,
        quoter: paymentsInfo.quoter,
        usdToken: USDT_ADDRESS,
        long: CAKE_ADDRESS,
        maxPriceFeedDelay: MAX_PRICEFEED_DELAY,
        poolKey: paymentsInfo.poolKey,
        hookData: '0x', // or '' depending on your contract (both decode to empty bytes)
      };
      const feesNew = {
        referralCreditsAmount: 1,
        affiliatePercentage: 100,
        longCustomerDiscountPercentage: 100,
        platformSubsidyPercentage: 100,
        processingFeePercentage: 100,
        buybackBurnPercentage: 1000,
      };
      const convenienceFeeAmountNew = 1000000;
      const usdTokenPercentageNew = 100;
      const stakingRewardsNew: [
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
      ] = [
        {
          venueStakingInfo: {
            depositFeePercentage: 1000,
            convenienceFeeAmount: convenienceFeeAmountNew,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: usdTokenPercentageNew,
            longPercentage: 800,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 900,
            convenienceFeeAmount: convenienceFeeAmountNew,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: usdTokenPercentageNew,
            longPercentage: 700,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 800,
            convenienceFeeAmount: convenienceFeeAmountNew,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: usdTokenPercentageNew,
            longPercentage: 600,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 700,
            convenienceFeeAmount: convenienceFeeAmountNew,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: usdTokenPercentageNew,
            longPercentage: 500,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 500,
            convenienceFeeAmount: convenienceFeeAmountNew,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: usdTokenPercentageNew,
            longPercentage: 400,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
      ];

      await expect(
        belongCheckIn.connect(minter).setParameters(paymentsInfoNew, feesNew, stakingRewardsNew),
      ).to.be.revertedWithCustomError(belongCheckIn, 'Unauthorized');
      paymentsInfoNew.slippageBps = BigNumber.from(10).pow(27).add(1);
      await expect(
        belongCheckIn.setParameters(paymentsInfoNew, feesNew, stakingRewardsNew),
      ).to.be.revertedWithCustomError(belongCheckIn, 'BPSTooHigh');
      paymentsInfoNew.slippageBps = BigNumber.from(10).pow(27).sub(1);
      const tx = await belongCheckIn.setParameters(paymentsInfoNew, feesNew, stakingRewardsNew);
      await expect(tx).to.emit(belongCheckIn, 'ParametersSet');

      const belongCheckInStorage = await belongCheckIn.belongCheckInStorage();
      // Convert paymentsInfo tuple to object
      expect({
        dexType: belongCheckInStorage.paymentsInfo.dexType,
        slippageBps: belongCheckInStorage.paymentsInfo.slippageBps,
        router: belongCheckInStorage.paymentsInfo.router,
        quoter: belongCheckInStorage.paymentsInfo.quoter,
        usdToken: belongCheckInStorage.paymentsInfo.usdToken,
        long: belongCheckInStorage.paymentsInfo.long,
        maxPriceFeedDelay: belongCheckInStorage.paymentsInfo.maxPriceFeedDelay,
        poolKey: belongCheckInStorage.paymentsInfo.poolKey,
        hookData: belongCheckInStorage.paymentsInfo.hookData,
      }).to.deep.eq(paymentsInfoNew);
      // Convert fees tuple to object
      expect({
        referralCreditsAmount: belongCheckInStorage.fees.referralCreditsAmount,
        affiliatePercentage: belongCheckInStorage.fees.affiliatePercentage,
        longCustomerDiscountPercentage: belongCheckInStorage.fees.longCustomerDiscountPercentage,
        platformSubsidyPercentage: belongCheckInStorage.fees.platformSubsidyPercentage,
        processingFeePercentage: belongCheckInStorage.fees.processingFeePercentage,
        buybackBurnPercentage: belongCheckInStorage.fees.buybackBurnPercentage,
      }).to.deep.eq(feesNew);
      // Convert stakingRewards tuple to object for each tier
      for (let tierValue = 0; tierValue < stakingRewardsNew.length; tierValue++) {
        const result = await belongCheckIn.stakingRewards(tierValue);
        const resultFromStorage = {
          venueStakingInfo: {
            depositFeePercentage: result.venueStakingInfo.depositFeePercentage,
            convenienceFeeAmount: result.venueStakingInfo.convenienceFeeAmount,
          },
          promoterStakingInfo: {
            usdTokenPercentage: result.promoterStakingInfo.usdTokenPercentage,
            longPercentage: result.promoterStakingInfo.longPercentage,
          },
        };
        expect(resultFromStorage).to.deep.eq(stakingRewardsNew[tierValue]);
      }
    });

    it('setContracts() can be set only by the owner', async () => {
      const { belongCheckIn, minter } = await loadFixture(fixture);

      const contractsNew = {
        factory: belongCheckIn.address,
        escrow: belongCheckIn.address,
        staking: belongCheckIn.address,
        venueToken: belongCheckIn.address,
        promoterToken: belongCheckIn.address,
        longPF: belongCheckIn.address,
      };

      await expect(belongCheckIn.connect(minter).setContracts(contractsNew)).to.be.revertedWithCustomError(
        belongCheckIn,
        'Unauthorized',
      );
      const tx = await belongCheckIn.setContracts(contractsNew);
      await expect(tx).to.emit(belongCheckIn, 'ContractsSet');

      const belongCheckInStorage = await belongCheckIn.belongCheckInStorage();
      // Convert contracts tuple to object
      const contractsFromStorage = {
        factory: belongCheckInStorage.contracts.factory,
        escrow: belongCheckInStorage.contracts.escrow,
        staking: belongCheckInStorage.contracts.staking,
        venueToken: belongCheckInStorage.contracts.venueToken,
        promoterToken: belongCheckInStorage.contracts.promoterToken,
        longPF: belongCheckInStorage.contracts.longPF,
      };
      expect(contractsFromStorage).to.deep.eq(contractsNew);
    });
  });

  describe('Venue flow', () => {
    it('venueDeposit() (first deposit) (w/o referral) (no stakes)', async () => {
      const { belongCheckIn, escrow, venueToken, helper, signatureVerifier, treasury, signer, USDT, CAKE, USDT_whale } =
        await loadFixture(fixture);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: ethers.constants.HashZero,
        uri,
        signature: signature,
      };

      const venueInfoFake: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue: treasury.address,
        amount,
        affiliateReferralCode: ethers.constants.HashZero,
        uri,
        signature: signature,
      };

      const willBeTaken = convenienceFeeAmount.add(amount);

      const USDT_balance_before = await USDT.balanceOf(USDT_whale.address);

      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      await expect(belongCheckIn.connect(USDT_whale).venueDeposit(venueInfoFake)).to.be.revertedWithCustomError(
        signatureVerifier,
        'InvalidSignature',
      );

      const tx = await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDT_whale.address);

      await expect(tx).to.emit(belongCheckIn, 'VenuePaidDeposit');
      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(belongCheckIn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).remainingCredits).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.bountyType).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdTokenDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDT_whale.address, await helper.getVenueId(USDT_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDT_whale.address))).to.eq(uri);
      expect(await USDT.balanceOf(belongCheckIn.address)).to.eq(0);
      expect(await USDT.balanceOf(escrow.address)).to.eq(amount);
      expect(await CAKE.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
      expect(await USDT.balanceOf(treasury.address)).to.eq(0);

      const USDT_balance_after = await USDT.balanceOf(USDT_whale.address);
      expect(USDT_balance_before.sub(willBeTaken)).to.eq(USDT_balance_after);
    });

    it('venueDeposit() (free deposits exceed) (w/o referral) (no stakes)', async () => {
      const { belongCheckIn, escrow, venueToken, helper, admin, treasury, signer, USDT, CAKE, USDT_whale } =
        await loadFixture(fixture);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: ethers.constants.HashZero,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(1000, amount);
      const willBeTaken = paymentToTreasury.add(convenienceFeeAmount.add(amount));

      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await belongCheckIn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const USDT_balance_before = await USDT.balanceOf(USDT_whale.address);

      const tx = await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDT_whale.address);

      const USDT_balance_after = await USDT.balanceOf(USDT_whale.address);
      expect(USDT_balance_before.sub(willBeTaken)).to.eq(USDT_balance_after);

      expect(await USDT.balanceOf(treasury.address)).to.eq(paymentToTreasury.div(2));

      await expect(tx).to.emit(belongCheckIn, 'VenuePaidDeposit');
      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(belongCheckIn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      await expect(tx).to.emit(belongCheckIn, 'RevenueBuybackBurn');
      await expect(tx).to.emit(belongCheckIn, 'BurnedLONGs');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).remainingCredits).to.eq(0);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.bountyType).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdTokenDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDT_whale.address, await helper.getVenueId(USDT_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDT_whale.address))).to.eq(uri);
      expect(await USDT.balanceOf(belongCheckIn.address)).to.eq(0);
      expect(await USDT.balanceOf(escrow.address)).to.eq(amount);
      expect(await CAKE.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (first deposit) (w/ referral) (no stakes)', async () => {
      const {
        belongCheckIn,
        escrow,
        venueToken,
        helper,
        referral,
        treasury,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCode,
        uri,
        signature: signature,
      };

      const referralCodeWrong = EthCrypto.hash.keccak256([
        { type: 'address', value: referral.address },
        { type: 'address', value: referral.address },
        { type: 'uint256', value: chainId },
      ]);
      const messageCodeWrong = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCodeWrong, uri, chainId],
      );
      const signatureCodeWrong = EthCrypto.sign(signer.privateKey, messageCodeWrong);

      let venueInfoWrongCode: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCodeWrong,
        uri,
        signature: signatureCodeWrong,
      };

      let venueInfoWrongPaymentType: VenueInfoStruct = {
        rules: { paymentType: 0, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCode,
        uri,
        signature: signature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(amount));

      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      await expect(belongCheckIn.connect(USDT_whale).venueDeposit(venueInfoWrongCode))
        .to.be.revertedWithCustomError(belongCheckIn, 'WrongReferralCode')
        .withArgs(venueInfoWrongCode.affiliateReferralCode);
      await expect(
        belongCheckIn.connect(USDT_whale).venueDeposit(venueInfoWrongPaymentType),
      ).to.be.revertedWithCustomError(belongCheckIn, 'WrongPaymentTypeProvided');

      const USDT_balance_before = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_before = await CAKE.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDT_whale.address);

      const USDT_balance_after = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_after = await CAKE.balanceOf(referral.address);

      expect(USDT_balance_before.sub(willBeTaken)).to.eq(USDT_balance_after);

      expect(CAKE_balance_after).to.be.gt(CAKE_balance_before);

      await expect(tx).to.emit(belongCheckIn, 'VenuePaidDeposit');
      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(belongCheckIn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).remainingCredits).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.bountyType).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdTokenDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDT_whale.address, await helper.getVenueId(USDT_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDT_whale.address))).to.eq(uri);
      expect(await USDT.balanceOf(belongCheckIn.address)).to.eq(0);
      expect(await USDT.balanceOf(escrow.address)).to.eq(amount);
      expect(await USDT.balanceOf(treasury.address)).to.eq(0);
      expect(await CAKE.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (first deposit) (w/ referral) (no stakes)', async () => {
      const {
        belongCheckIn,
        escrow,
        venueToken,
        helper,
        referral,
        treasury,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCode,
        uri,
        signature: signature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(amount));

      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      const USDT_balance_before = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_before = await CAKE.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDT_whale.address);

      const USDT_balance_after = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_after = await CAKE.balanceOf(referral.address);

      expect(USDT_balance_before.sub(willBeTaken)).to.eq(USDT_balance_after);

      expect(CAKE_balance_after).to.be.gt(CAKE_balance_before);

      await expect(tx).to.emit(belongCheckIn, 'VenuePaidDeposit');
      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(belongCheckIn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).remainingCredits).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.bountyType).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdTokenDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDT_whale.address, await helper.getVenueId(USDT_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDT_whale.address))).to.eq(uri);
      expect(await USDT.balanceOf(belongCheckIn.address)).to.eq(0);
      expect(await USDT.balanceOf(escrow.address)).to.eq(amount);
      expect(await USDT.balanceOf(treasury.address)).to.eq(0);
      expect(await CAKE.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (no stakes)', async () => {
      const {
        belongCheckIn,
        escrow,
        venueToken,
        helper,
        admin,
        referral,
        treasury,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(1000, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(amount)).add(paymentToTreasury);

      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await belongCheckIn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const USDT_balance_before = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_before = await CAKE.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDT_whale.address);

      const USDT_balance_after = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_after = await CAKE.balanceOf(referral.address);

      expect(USDT_balance_before.sub(willBeTaken)).to.eq(USDT_balance_after);

      expect(CAKE_balance_after).to.be.gt(CAKE_balance_before);

      await expect(tx).to.emit(belongCheckIn, 'VenuePaidDeposit');
      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(belongCheckIn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).remainingCredits).to.eq(0);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.bountyType).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdTokenDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDT_whale.address, await helper.getVenueId(USDT_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDT_whale.address))).to.eq(uri);
      expect(await USDT.balanceOf(belongCheckIn.address)).to.eq(0);
      expect(await USDT.balanceOf(escrow.address)).to.eq(amount);
      expect(await CAKE.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (bronze tier stakes)', async () => {
      const {
        belongCheckIn,
        staking,
        escrow,
        venueToken,
        helper,
        admin,
        referral,
        treasury,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);
      await staking.setMinStakePeriod(1);

      await CAKE.connect(CAKE_whale).transfer(USDT_whale.address, ethers.utils.parseEther('50000'));
      await CAKE.connect(USDT_whale).approve(staking.address, ethers.utils.parseEther('50000'));
      await staking.connect(USDT_whale).deposit(ethers.utils.parseEther('50000'), USDT_whale.address);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(900, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(amount)).add(paymentToTreasury);

      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await belongCheckIn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const USDT_balance_before = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_before = await CAKE.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDT_whale.address);

      const USDT_balance_after = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_after = await CAKE.balanceOf(referral.address);

      expect(USDT_balance_before.sub(willBeTaken)).to.eq(USDT_balance_after);

      expect(CAKE_balance_after).to.be.gt(CAKE_balance_before);

      await expect(tx).to.emit(belongCheckIn, 'VenuePaidDeposit');
      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(belongCheckIn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).remainingCredits).to.eq(0);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.bountyType).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdTokenDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDT_whale.address, await helper.getVenueId(USDT_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDT_whale.address))).to.eq(uri);
      expect(await USDT.balanceOf(belongCheckIn.address)).to.eq(0);
      expect(await USDT.balanceOf(escrow.address)).to.eq(amount);
      expect(await CAKE.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);

      await staking
        .connect(USDT_whale)
        .withdraw(ethers.utils.parseEther('50000'), USDT_whale.address, USDT_whale.address);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (bronze tier stakes)', async () => {
      const {
        belongCheckIn,
        staking,
        escrow,
        venueToken,
        helper,
        admin,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);
      await CAKE.connect(CAKE_whale).transfer(USDT_whale.address, ethers.utils.parseEther('249999'));
      await CAKE.connect(USDT_whale).approve(staking.address, ethers.utils.parseEther('249999'));
      await staking.connect(USDT_whale).deposit(ethers.utils.parseEther('249999'), USDT_whale.address);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(900, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(amount)).add(paymentToTreasury);

      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await belongCheckIn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const USDT_balance_before = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_before = await CAKE.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDT_whale.address);

      const USDT_balance_after = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_after = await CAKE.balanceOf(referral.address);

      expect(USDT_balance_before.sub(willBeTaken)).to.eq(USDT_balance_after);

      expect(CAKE_balance_after).to.be.gt(CAKE_balance_before);

      await expect(tx).to.emit(belongCheckIn, 'VenuePaidDeposit');
      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(belongCheckIn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).remainingCredits).to.eq(0);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.bountyType).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdTokenDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDT_whale.address, await helper.getVenueId(USDT_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDT_whale.address))).to.eq(uri);
      expect(await USDT.balanceOf(belongCheckIn.address)).to.eq(0);
      expect(await USDT.balanceOf(escrow.address)).to.eq(amount);
      expect(await CAKE.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (silver tier stakes)', async () => {
      const {
        belongCheckIn,
        staking,
        escrow,
        venueToken,
        helper,
        admin,
        referral,
        treasury,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);
      await CAKE.connect(CAKE_whale).transfer(USDT_whale.address, ethers.utils.parseEther('250000'));
      await CAKE.connect(USDT_whale).approve(staking.address, ethers.utils.parseEther('250000'));
      await staking.connect(USDT_whale).deposit(ethers.utils.parseEther('250000'), USDT_whale.address);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(800, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(amount)).add(paymentToTreasury);

      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await belongCheckIn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const USDT_balance_before = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_before = await CAKE.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDT_whale.address);

      const USDT_balance_after = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_after = await CAKE.balanceOf(referral.address);

      expect(USDT_balance_before.sub(willBeTaken)).to.eq(USDT_balance_after);

      expect(CAKE_balance_after).to.be.gt(CAKE_balance_before);

      await expect(tx).to.emit(belongCheckIn, 'VenuePaidDeposit');
      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(belongCheckIn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).remainingCredits).to.eq(0);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.bountyType).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdTokenDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDT_whale.address, await helper.getVenueId(USDT_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDT_whale.address))).to.eq(uri);
      expect(await USDT.balanceOf(belongCheckIn.address)).to.eq(0);
      expect(await USDT.balanceOf(escrow.address)).to.eq(amount);
      expect(await CAKE.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (gold tier stakes)', async () => {
      const {
        belongCheckIn,
        staking,
        escrow,
        venueToken,
        helper,
        admin,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);
      await CAKE.connect(CAKE_whale).transfer(USDT_whale.address, ethers.utils.parseEther('500000'));
      await CAKE.connect(USDT_whale).approve(staking.address, ethers.utils.parseEther('500000'));
      await staking.connect(USDT_whale).deposit(ethers.utils.parseEther('500000'), USDT_whale.address);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(700, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(amount)).add(paymentToTreasury);

      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await belongCheckIn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const USDT_balance_before = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_before = await CAKE.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDT_whale.address);

      const USDT_balance_after = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_after = await CAKE.balanceOf(referral.address);

      expect(USDT_balance_before.sub(willBeTaken)).to.eq(USDT_balance_after);

      expect(CAKE_balance_after).to.be.gt(CAKE_balance_before);

      await expect(tx).to.emit(belongCheckIn, 'VenuePaidDeposit');
      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(belongCheckIn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).remainingCredits).to.eq(0);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.bountyType).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdTokenDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDT_whale.address, await helper.getVenueId(USDT_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDT_whale.address))).to.eq(uri);
      expect(await USDT.balanceOf(belongCheckIn.address)).to.eq(0);
      expect(await USDT.balanceOf(escrow.address)).to.eq(amount);
      expect(await CAKE.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (platinum tier stakes)', async () => {
      const {
        belongCheckIn,
        staking,
        escrow,
        venueToken,
        helper,
        admin,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);
      await CAKE.connect(CAKE_whale).transfer(USDT_whale.address, ethers.utils.parseEther('1000000'));
      await CAKE.connect(USDT_whale).approve(staking.address, ethers.utils.parseEther('1000000'));
      await staking.connect(USDT_whale).deposit(ethers.utils.parseEther('1000000'), USDT_whale.address);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(500, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(amount)).add(paymentToTreasury);

      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await belongCheckIn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const USDT_balance_before = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_before = await CAKE.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDT_whale.address);

      const USDT_balance_after = await USDT.balanceOf(USDT_whale.address);
      const CAKE_balance_after = await CAKE.balanceOf(referral.address);

      expect(USDT_balance_before.sub(willBeTaken)).to.eq(USDT_balance_after);

      expect(CAKE_balance_after).to.be.gt(CAKE_balance_before);

      await expect(tx).to.emit(belongCheckIn, 'VenuePaidDeposit');
      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(belongCheckIn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx).to.emit(escrow, 'VenueDepositsUpdated');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).remainingCredits).to.eq(0);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.bountyType).to.eq(1);
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdTokenDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDT_whale.address, await helper.getVenueId(USDT_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDT_whale.address))).to.eq(uri);
      expect(await USDT.balanceOf(belongCheckIn.address)).to.eq(0);
      expect(await USDT.balanceOf(escrow.address)).to.eq(amount);
      expect(await CAKE.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('updateVenueRules()', async () => {
      const { belongCheckIn, helper, signer, referralCode, USDT, CAKE, USDT_whale } = await loadFixture(fixture);

      const uri = 'uriuri';
      const amount = await u(100, USDT);
      const venue = USDT_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount,
        affiliateReferralCode: referralCode,
        uri,
        signature: signature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(amount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);

      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      await expect(
        belongCheckIn
          .connect(USDT_whale)
          .updateVenueRules({ paymentType: 0, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 }),
      ).to.be.revertedWithCustomError(belongCheckIn, 'WrongPaymentTypeProvided');
      await expect(
        belongCheckIn.updateVenueRules({ paymentType: 1, bountyType: 0, bountyAllocationType: 0, longPaymentType: 0 }),
      ).to.be.revertedWithCustomError(belongCheckIn, 'NotAVenue');

      const tx = await belongCheckIn
        .connect(USDT_whale)
        .updateVenueRules({ paymentType: 2, bountyType: 2, bountyAllocationType: 1, longPaymentType: 0 });

      await expect(tx).to.emit(belongCheckIn, 'VenueRulesSet');
      expect((await belongCheckIn.generalVenueInfo(USDT_whale.address)).rules.paymentType).to.eq(2);
    });
  });

  describe('Customer flow usdToken payment', () => {
    it('payToVenue() (w/o promoter)', async () => {
      const { belongCheckIn, signer, USDT, USDT_whale, CAKE_whale } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);
      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 0, bountyAllocationType: 0, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: ethers.constants.HashZero,
        uri,
        signature: venueSignature,
      };
      const willBeTaken = convenienceFeeAmount.add(venueAmount);
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          0, // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          ethers.constants.HashZero, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: ethers.constants.HashZero,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const customerBalance_before = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_before = await USDT.balanceOf(USDT_whale.address);

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_after = await USDT.balanceOf(USDT_whale.address);

      await expect(tx)
        .to.emit(belongCheckIn, 'CustomerPaid')
        .withArgs(
          CAKE_whale.address,
          USDT_whale.address,
          ethers.constants.AddressZero,
          customerAmount,
          [BigNumber.from(customerInfo.toCustomer.spendBountyPercentage), customerInfo.toCustomer.visitBountyAmount],
          [BigNumber.from(customerInfo.toPromoter.spendBountyPercentage), customerInfo.toPromoter.visitBountyAmount],
        );
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
    });

    it('payToVenue() (both payment) (w/o promoter)', async () => {
      const { belongCheckIn, signer, USDT, CAKE, USDT_whale, CAKE_whale } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);
      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 0, bountyAllocationType: 0, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: ethers.constants.HashZero,
        uri,
        signature: venueSignature,
      };
      const willBeTaken = convenienceFeeAmount.add(venueAmount);
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          0, // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          ethers.constants.HashZero, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: ethers.constants.HashZero,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const customerBalance_before = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_before = await USDT.balanceOf(USDT_whale.address);

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_after = await USDT.balanceOf(USDT_whale.address);

      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
    });

    it('payToVenue() (w/ promoter) (visit bounty)', async () => {
      const {
        belongCheckIn,
        helper,
        signatureVerifier,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };
      const customerInfoFakeMessage1: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: CAKE_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };
      const customerInfoFakeMessage2: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount.add(1),
        signature: customerSignature,
      };

      const customerMessageWrongSpendBountyPercentage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // visitBountyAmount
          10, // spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignatureWrongSpendBountyPercentage = EthCrypto.sign(
        signer.privateKey,
        customerMessageWrongSpendBountyPercentage,
      );
      const customerInfoWrongSpendBountyPercentage: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 10,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignatureWrongSpendBountyPercentage,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const customerBalance_before = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_before = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(
        belongCheckIn.connect(CAKE_whale).payToVenue(customerInfoFakeMessage1),
      ).to.be.revertedWithCustomError(signatureVerifier, 'WrongPaymentType');
      await expect(
        belongCheckIn.connect(CAKE_whale).payToVenue(customerInfoFakeMessage2),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_after = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(await customerInfo.toPromoter.visitBountyAmount)).to.eq(
        venueBalance_venueToken_after,
      );
      expect(promoterBalance_promoterToken_before.add(await customerInfo.toPromoter.visitBountyAmount)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('payToVenue() (w/ promoter) (visit bounty) (not enough funds)', async () => {
      const {
        belongCheckIn,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 1;
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await expect(belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo)).to.be.revertedWithCustomError(
        belongCheckIn,
        'NotEnoughBalance',
      );
    });

    it('payToVenue() (both payment) (w/ promoter) (visit bounty)', async () => {
      const {
        belongCheckIn,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const customerBalance_before = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_before = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_after = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(await customerInfo.toPromoter.visitBountyAmount)).to.eq(
        venueBalance_venueToken_after,
      );
      expect(promoterBalance_promoterToken_before.add(await customerInfo.toPromoter.visitBountyAmount)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('payToVenue() (w/ promoter) (spend bounty)', async () => {
      const {
        belongCheckIn,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 2, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          0, // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      const rewardsToPromoter = await helper.calculateRate(
        customerInfo.toPromoter.spendBountyPercentage,
        customerAmount,
      );

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const customerBalance_before = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_before = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_after = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (both payment) (w/ promoter) (spend bounty)', async () => {
      const {
        belongCheckIn,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 2, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          0, // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      const rewardsToPromoter = await helper.calculateRate(
        customerInfo.toPromoter.spendBountyPercentage,
        customerAmount,
      );

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const customerBalance_before = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_before = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_after = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (w/ promoter) (both bounties)', async () => {
      const {
        belongCheckIn,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      const rewardsToPromoter = (
        await helper.calculateRate(customerInfo.toPromoter.spendBountyPercentage, customerAmount)
      ).add(await customerInfo.toPromoter.visitBountyAmount);

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const customerBalance_before = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_before = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_after = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (both payment) (w/ promoter) (both bounties)', async () => {
      const {
        belongCheckIn,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      const rewardsToPromoter = (
        await helper.calculateRate(customerInfo.toPromoter.spendBountyPercentage, customerAmount)
      ).add(await customerInfo.toPromoter.visitBountyAmount);

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const customerBalance_before = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_before = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDT.balanceOf(CAKE_whale.address);
      const venueBalance_after = await USDT.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });
  });

  describe('Customer flow long payment', () => {
    it('payToVenue() (w/o promoter)', async () => {
      const { belongCheckIn, escrow, helper, signer, USDT, CAKE, USDT_whale, CAKE_whale } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);
      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 2, bountyType: 0, bountyAllocationType: 0, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: ethers.constants.HashZero,
        uri,
        signature: venueSignature,
      };
      const willBeTaken = convenienceFeeAmount.add(venueAmount);
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          false, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          0, // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          ethers.constants.HashZero, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: false,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: ethers.constants.HashZero,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.processingFeePercentage,
        platformSubsidy,
      );
      const buyback = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.buybackBurnPercentage,
        processingFee,
      );
      const feesToCollector = processingFee.sub(buyback);
      const longCustomerDiscount = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      await CAKE.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const escrowBalance_before = await CAKE.balanceOf(escrow.address);
      const customerBalance_before = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_before = await CAKE.balanceOf(USDT_whale.address);

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const escrowBalance_after = await CAKE.balanceOf(escrow.address);
      const customerBalance_after = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_after = await CAKE.balanceOf(USDT_whale.address);

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      await expect(tx)
        .to.emit(belongCheckIn, 'RevenueBuybackBurn')
        .withArgs(CAKE.address, processingFee, buyback, buyback, feesToCollector);
      expect(escrowBalance_before.sub(platformSubsidy)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
    });

    it('payToVenue() (AutoStake) (w/o promoter)', async () => {
      const { belongCheckIn, escrow, staking, helper, signer, USDT, CAKE, USDT_whale, CAKE_whale } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);
      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 2, bountyType: 0, bountyAllocationType: 0, longPaymentType: 1 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: ethers.constants.HashZero,
        uri,
        signature: venueSignature,
      };
      const willBeTaken = convenienceFeeAmount.add(venueAmount);
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          false, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          0, // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          ethers.constants.HashZero, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: false,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: ethers.constants.HashZero,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.processingFeePercentage,
        platformSubsidy,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      await CAKE.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const escrowBalance_before = await CAKE.balanceOf(escrow.address);
      const customerBalance_before = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_before = await staking.balanceOf(USDT_whale.address);

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const escrowBalance_after = await CAKE.balanceOf(escrow.address);
      const customerBalance_after = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_after = await staking.balanceOf(USDT_whale.address);

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      await expect(tx)
        .to.emit(staking, 'Deposit')
        .withArgs(
          belongCheckIn.address,
          USDT_whale.address,
          fromCustomerToVenue.add(fromEscrowToVenue),
          fromCustomerToVenue.add(fromEscrowToVenue),
        );
      expect(escrowBalance_before.sub(platformSubsidy)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromCustomerToVenue.add(fromEscrowToVenue))).to.eq(venueBalance_after);
    });

    it('payToVenue() (AutoConvert) (w/o promoter)', async () => {
      const { belongCheckIn, escrow, staking, helper, signer, USDT, CAKE, USDT_whale, CAKE_whale } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);
      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 2, bountyType: 0, bountyAllocationType: 0, longPaymentType: 2 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: ethers.constants.HashZero,
        uri,
        signature: venueSignature,
      };
      const willBeTaken = convenienceFeeAmount.add(venueAmount);
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          false, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          0, // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          ethers.constants.HashZero, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: false,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: ethers.constants.HashZero,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.processingFeePercentage,
        platformSubsidy,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      await CAKE.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const escrowBalance_before = await CAKE.balanceOf(escrow.address);
      const customerBalance_before = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_before = await USDT.balanceOf(USDT_whale.address);

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const escrowBalance_after = await CAKE.balanceOf(escrow.address);
      const customerBalance_after = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_after = await USDT.balanceOf(USDT_whale.address);

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      expect(escrowBalance_before.sub(platformSubsidy)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_after).to.gt(venueBalance_before);
    });

    it('payToVenue() (both payment) (w/o promoter)', async () => {
      const { belongCheckIn, escrow, helper, signer, USDT, CAKE, USDT_whale, CAKE_whale } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);
      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 0, bountyAllocationType: 0, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: ethers.constants.HashZero,
        uri,
        signature: venueSignature,
      };
      const willBeTaken = convenienceFeeAmount.add(venueAmount);
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          false, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          0, // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          ethers.constants.HashZero, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: false,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: ethers.constants.HashZero,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.processingFeePercentage,
        platformSubsidy,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      await CAKE.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const escrowBalance_before = await CAKE.balanceOf(escrow.address);
      const customerBalance_before = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_before = await CAKE.balanceOf(USDT_whale.address);

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const escrowBalance_after = await CAKE.balanceOf(escrow.address);
      const customerBalance_after = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_after = await CAKE.balanceOf(USDT_whale.address);

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      expect(escrowBalance_before.sub(platformSubsidy)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
    });

    it('payToVenue() (w/ promoter) (visit bounty)', async () => {
      const {
        belongCheckIn,
        escrow,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 2, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          false, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: false,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.processingFeePercentage,
        platformSubsidy,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      await CAKE.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const escrowBalance_before = await CAKE.balanceOf(escrow.address);
      const customerBalance_before = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_before = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const escrowBalance_after = await CAKE.balanceOf(escrow.address);
      const customerBalance_after = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_after = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      expect(escrowBalance_before.sub(platformSubsidy)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(await customerInfo.toPromoter.visitBountyAmount)).to.eq(
        venueBalance_venueToken_after,
      );
      expect(promoterBalance_promoterToken_before.add(await customerInfo.toPromoter.visitBountyAmount)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('payToVenue() (both payment) (w/ promoter) (visit bounty)', async () => {
      const {
        belongCheckIn,
        escrow,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 1, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          false, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          0, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: false,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 0,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.processingFeePercentage,
        platformSubsidy,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      await CAKE.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const escrowBalance_before = await CAKE.balanceOf(escrow.address);
      const customerBalance_before = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_before = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const escrowBalance_after = await CAKE.balanceOf(escrow.address);
      const customerBalance_after = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_after = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx).to.emit(belongCheckIn, 'CustomerPaid');
      expect(escrowBalance_before.sub(platformSubsidy)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(await customerInfo.toPromoter.visitBountyAmount)).to.eq(
        venueBalance_venueToken_after,
      );
      expect(promoterBalance_promoterToken_before.add(await customerInfo.toPromoter.visitBountyAmount)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('payToVenue() (w/ promoter) (spend bounty)', async () => {
      const {
        belongCheckIn,
        escrow,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 2, bountyType: 2, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          false, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          0, // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: false,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.processingFeePercentage,
        platformSubsidy,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      const rewardsToPromoter = await helper.unstandardize(
        USDT.address,
        await helper.calculateRate(
          customerInfo.toPromoter.spendBountyPercentage,
          await helper.getStandardizedPrice(
            CAKE.address,
            (
              await belongCheckIn.belongCheckInStorage()
            ).contracts.longPF,
            customerAmount,
            MAX_PRICEFEED_DELAY,
          ),
        ),
      );
      expect(rewardsToPromoter).to.eq(
        await helper.unstandardize(
          USDT.address,
          await helper.standardize(
            CAKE.address,
            await helper.calculateRate(customerInfo.toPromoter.spendBountyPercentage, customerAmount.div(2)),
          ),
        ),
      );

      await CAKE.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const escrowBalance_before = await CAKE.balanceOf(escrow.address);
      const customerBalance_before = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_before = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const escrowBalance_after = await CAKE.balanceOf(escrow.address);
      const customerBalance_after = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_after = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'CustomerPaid')
        .withArgs(
          CAKE_whale.address,
          USDT_whale.address,
          referral.address,
          customerAmount,
          [
            BigNumber.from(customerInfo.toCustomer.spendBountyPercentage),
            BigNumber.from(customerInfo.toCustomer.visitBountyAmount),
          ],
          [
            BigNumber.from(customerInfo.toPromoter.spendBountyPercentage),
            BigNumber.from(customerInfo.toPromoter.visitBountyAmount),
          ],
        );
      expect(escrowBalance_before.sub(platformSubsidy)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (both payment) (w/ promoter) (spend bounty)', async () => {
      const {
        belongCheckIn,
        escrow,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 2, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          false, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          0, // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: false,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: 0,
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.processingFeePercentage,
        platformSubsidy,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      const rewardsToPromoter = await helper.unstandardize(
        USDT.address,
        await helper.calculateRate(
          customerInfo.toPromoter.spendBountyPercentage,
          await helper.getStandardizedPrice(
            CAKE.address,
            (
              await belongCheckIn.belongCheckInStorage()
            ).contracts.longPF,
            customerAmount,
            MAX_PRICEFEED_DELAY,
          ),
        ),
      );
      expect(rewardsToPromoter).to.eq(
        await helper.unstandardize(
          USDT.address,
          await helper.standardize(
            CAKE.address,
            await helper.calculateRate(customerInfo.toPromoter.spendBountyPercentage, customerAmount.div(2)),
          ),
        ),
      );

      await CAKE.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const escrowBalance_before = await CAKE.balanceOf(escrow.address);
      const customerBalance_before = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_before = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const escrowBalance_after = await CAKE.balanceOf(escrow.address);
      const customerBalance_after = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_after = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'CustomerPaid')
        .withArgs(
          CAKE_whale.address,
          USDT_whale.address,
          referral.address,
          customerAmount,
          [
            BigNumber.from(customerInfo.toCustomer.spendBountyPercentage),
            BigNumber.from(customerInfo.toCustomer.visitBountyAmount),
          ],
          [
            BigNumber.from(customerInfo.toPromoter.spendBountyPercentage),
            BigNumber.from(customerInfo.toPromoter.visitBountyAmount),
          ],
        );
      expect(escrowBalance_before.sub(platformSubsidy)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (w/ promoter) (both bounties)', async () => {
      const {
        belongCheckIn,
        escrow,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 2, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          false, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: false,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.processingFeePercentage,
        platformSubsidy,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      const rewardsToPromoter = await helper.unstandardize(
        USDT.address,
        await helper.calculateRate(
          customerInfo.toPromoter.spendBountyPercentage,
          await helper.getStandardizedPrice(
            CAKE.address,
            (
              await belongCheckIn.belongCheckInStorage()
            ).contracts.longPF,
            customerAmount,
            MAX_PRICEFEED_DELAY,
          ),
        ),
      );
      expect(rewardsToPromoter).to.eq(
        await helper.unstandardize(
          USDT.address,
          await helper.standardize(
            CAKE.address,
            await helper.calculateRate(customerInfo.toPromoter.spendBountyPercentage, customerAmount.div(2)),
          ),
        ),
      );

      await CAKE.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const escrowBalance_before = await CAKE.balanceOf(escrow.address);
      const customerBalance_before = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_before = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const escrowBalance_after = await CAKE.balanceOf(escrow.address);
      const customerBalance_after = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_after = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'CustomerPaid')
        .withArgs(
          CAKE_whale.address,
          USDT_whale.address,
          referral.address,
          customerAmount,
          [
            BigNumber.from(customerInfo.toCustomer.spendBountyPercentage),
            BigNumber.from(customerInfo.toCustomer.visitBountyAmount),
          ],
          [
            BigNumber.from(customerInfo.toPromoter.spendBountyPercentage),
            BigNumber.from(customerInfo.toPromoter.visitBountyAmount),
          ],
        );
      expect(escrowBalance_before.sub(platformSubsidy)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(
        venueBalance_venueToken_before.sub(rewardsToPromoter.add(await customerInfo.toPromoter.visitBountyAmount)),
      ).to.eq(venueBalance_venueToken_after);
      expect(
        promoterBalance_promoterToken_before.add(
          rewardsToPromoter.add(await customerInfo.toPromoter.visitBountyAmount),
        ),
      ).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (both payment) (w/ promoter) (both bounties)', async () => {
      const {
        belongCheckIn,
        escrow,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          false, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: false,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.processingFeePercentage,
        platformSubsidy,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await belongCheckIn.belongCheckInStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      const rewardsToPromoter = await helper.unstandardize(
        USDT.address,
        await helper.calculateRate(
          customerInfo.toPromoter.spendBountyPercentage,
          await helper.getStandardizedPrice(
            CAKE.address,
            (
              await belongCheckIn.belongCheckInStorage()
            ).contracts.longPF,
            customerAmount,
            MAX_PRICEFEED_DELAY,
          ),
        ),
      );
      expect(rewardsToPromoter).to.eq(
        await helper.unstandardize(
          USDT.address,
          await helper.standardize(
            CAKE.address,
            await helper.calculateRate(customerInfo.toPromoter.spendBountyPercentage, customerAmount.div(2)),
          ),
        ),
      );

      await CAKE.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      const escrowBalance_before = await CAKE.balanceOf(escrow.address);
      const customerBalance_before = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_before = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const tx = await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const escrowBalance_after = await CAKE.balanceOf(escrow.address);
      const customerBalance_after = await CAKE.balanceOf(CAKE_whale.address);
      const venueBalance_after = await CAKE.balanceOf(USDT_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'CustomerPaid')
        .withArgs(
          CAKE_whale.address,
          USDT_whale.address,
          referral.address,
          customerAmount,
          [
            BigNumber.from(customerInfo.toCustomer.spendBountyPercentage),
            BigNumber.from(customerInfo.toCustomer.visitBountyAmount),
          ],
          [
            BigNumber.from(customerInfo.toPromoter.spendBountyPercentage),
            BigNumber.from(customerInfo.toPromoter.visitBountyAmount),
          ],
        );
      expect(escrowBalance_before.sub(platformSubsidy)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(
        venueBalance_venueToken_before.sub(rewardsToPromoter.add(await customerInfo.toPromoter.visitBountyAmount)),
      ).to.eq(venueBalance_venueToken_after);
      expect(
        promoterBalance_promoterToken_before.add(
          rewardsToPromoter.add(await customerInfo.toPromoter.visitBountyAmount),
        ),
      ).to.eq(promoterBalance_promoterToken_after);
    });
  });

  describe('Promoter flow usdToken', () => {
    it('distributePromoterPayments() (full amount)', async () => {
      const {
        belongCheckIn,
        helper,
        escrow,
        promoterToken,
        signatureVerifier,
        referral,
        signer,
        treasury,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          referralCode, // promoter referral code
          USDT_whale.address, // venue
          promoterBalance_promoterToken_before, // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDtoken: true,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before,
        signature: promoterSignature,
      };

      const promoterInfoFake: PromoterInfoStruct = {
        paymentInUSDtoken: true,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before.add(1),
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before;
      const platformFees = await helper.calculateRate(1000, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_before = await USDT.balanceOf(treasury.address);
      const promoterBalance_before = await USDT.balanceOf(referral.address);

      await expect(
        belongCheckIn.connect(referral).distributePromoterPayments(promoterInfoFake),
      ).to.be.revertedWithCustomError(signatureVerifier, 'InvalidSignature');
      const tx = await belongCheckIn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_after = await USDT.balanceOf(treasury.address);
      const promoterBalance_after = await USDT.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDT_whale.address, promoterBalance_promoterToken_before, true);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before)).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before.add(platformFees)).to.eq(feeReceiverBalance_after.mul(2));
      expect(promoterBalance_before.add(toPromoter)).to.eq(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('distributePromoterPayments() (more than full amount)', async () => {
      const { belongCheckIn, helper, promoterToken, referral, signer, referralCode, USDT, USDT_whale, CAKE_whale } =
        await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          referralCode, // promoter referral code
          USDT_whale.address, // venue
          promoterBalance_promoterToken_before.add(1), // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDtoken: true,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before.add(1),
        signature: promoterSignature,
      };

      await expect(
        belongCheckIn.connect(referral).distributePromoterPayments(promoterInfo),
      ).to.be.revertedWithCustomError(belongCheckIn, 'NotEnoughBalance');
    });

    it('distributePromoterPayments() (partial amount)', async () => {
      const {
        belongCheckIn,
        helper,
        escrow,
        promoterToken,
        referral,
        signer,
        treasury,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          referralCode, // promoter referral code
          USDT_whale.address, // venue
          promoterBalance_promoterToken_before.div(2), // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDtoken: true,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before.div(2),
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before.div(2);
      const platformFees = await helper.calculateRate(1000, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_before = await USDT.balanceOf(treasury.address);
      const promoterBalance_before = await USDT.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_after = await USDT.balanceOf(treasury.address);
      const promoterBalance_after = await USDT.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDT_whale.address, promoterBalance_promoterToken_before.div(2), true);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before.div(2))).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before.add(platformFees)).to.eq(feeReceiverBalance_after.mul(2));
      expect(promoterBalance_before.add(toPromoter)).to.eq(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before.div(2))).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    // Use .only for test
    it.skip('distributePromoterPayments() (full amount) (no tier)', async () => {
      const {
        belongCheckIn,
        helper,
        escrow,
        promoterToken,
        referral,
        signer,
        treasury,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const stakingRewardsNew: [
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
      ] = [
        {
          venueStakingInfo: {
            depositFeePercentage: 1000,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 800,
            longPercentage: 800,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 900,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 700,
            longPercentage: 700,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 800,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 600,
            longPercentage: 600,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 700,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 500,
            longPercentage: 500,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 500,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 400,
            longPercentage: 400,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
      ];
      await belongCheckIn.setParameters(paymentsInfo, fees, stakingRewardsNew);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          referralCode, // promoter referral code
          USDT_whale.address, // venue
          promoterBalance_promoterToken_before, // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDtoken: true,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before,
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before;
      const platformFees = await helper.calculateRate(800, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_before = await USDT.balanceOf(treasury.address);
      const promoterBalance_before = await USDT.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_after = await USDT.balanceOf(treasury.address);
      const promoterBalance_after = await USDT.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDT_whale.address, promoterBalance_promoterToken_before, true);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before)).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before.add(platformFees)).to.eq(feeReceiverBalance_after);
      expect(promoterBalance_before.add(toPromoter)).to.eq(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    // Use .only for test
    it.skip('distributePromoterPayments() (full amount) (bronze tier)', async () => {
      const {
        belongCheckIn,
        staking,
        helper,
        escrow,
        promoterToken,
        referral,
        signer,
        treasury,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const stakingRewardsNew: [
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
      ] = [
        {
          venueStakingInfo: {
            depositFeePercentage: 1000,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 800,
            longPercentage: 800,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 900,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 700,
            longPercentage: 700,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 800,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 600,
            longPercentage: 600,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 700,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 500,
            longPercentage: 500,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 500,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 400,
            longPercentage: 400,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
      ];
      await belongCheckIn.setParameters(paymentsInfo, fees, stakingRewardsNew);

      await CAKE.connect(CAKE_whale).transfer(referral.address, ethers.utils.parseEther('50000'));
      await CAKE.connect(referral).approve(staking.address, ethers.utils.parseEther('50000'));
      await staking.connect(referral).deposit(ethers.utils.parseEther('50000'), referral.address);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          referralCode, // promoter referral code
          USDT_whale.address, // venue
          promoterBalance_promoterToken_before, // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDtoken: true,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before,
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before;
      const platformFees = await helper.calculateRate(700, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_before = await USDT.balanceOf(treasury.address);
      const promoterBalance_before = await USDT.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_after = await USDT.balanceOf(treasury.address);
      const promoterBalance_after = await USDT.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDT_whale.address, promoterBalance_promoterToken_before, true);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before)).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before.add(platformFees)).to.eq(feeReceiverBalance_after);
      expect(promoterBalance_before.add(toPromoter)).to.eq(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    // Use .only for test
    it.skip('distributePromoterPayments() (full amount) (silver tier)', async () => {
      const {
        belongCheckIn,
        staking,
        helper,
        escrow,
        promoterToken,
        referral,
        signer,
        treasury,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const stakingRewardsNew: [
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
      ] = [
        {
          venueStakingInfo: {
            depositFeePercentage: 1000,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 800,
            longPercentage: 800,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 900,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 700,
            longPercentage: 700,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 800,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 600,
            longPercentage: 600,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 700,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 500,
            longPercentage: 500,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 500,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 400,
            longPercentage: 400,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
      ];
      await belongCheckIn.setParameters(paymentsInfo, fees, stakingRewardsNew);

      await CAKE.connect(CAKE_whale).transfer(referral.address, ethers.utils.parseEther('250000'));
      await CAKE.connect(referral).approve(staking.address, ethers.utils.parseEther('250000'));
      await staking.connect(referral).deposit(ethers.utils.parseEther('250000'), referral.address);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          referralCode, // promoter referral code
          USDT_whale.address, // venue
          promoterBalance_promoterToken_before, // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDtoken: true,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before,
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before;
      const platformFees = await helper.calculateRate(600, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_before = await USDT.balanceOf(treasury.address);
      const promoterBalance_before = await USDT.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_after = await USDT.balanceOf(treasury.address);
      const promoterBalance_after = await USDT.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDT_whale.address, promoterBalance_promoterToken_before, true);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before)).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before.add(platformFees)).to.eq(feeReceiverBalance_after);
      expect(promoterBalance_before.add(toPromoter)).to.eq(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    // Use .only for test
    it.skip('distributePromoterPayments() (full amount) (gold tier)', async () => {
      const {
        belongCheckIn,
        staking,
        helper,
        escrow,
        promoterToken,
        referral,
        signer,
        treasury,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const stakingRewardsNew: [
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
      ] = [
        {
          venueStakingInfo: {
            depositFeePercentage: 1000,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 800,
            longPercentage: 800,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 900,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 700,
            longPercentage: 700,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 800,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 600,
            longPercentage: 600,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 700,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 500,
            longPercentage: 500,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 500,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 400,
            longPercentage: 400,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
      ];
      await belongCheckIn.setParameters(paymentsInfo, fees, stakingRewardsNew);

      await CAKE.connect(CAKE_whale).transfer(referral.address, ethers.utils.parseEther('500000'));
      await CAKE.connect(referral).approve(staking.address, ethers.utils.parseEther('500000'));
      await staking.connect(referral).deposit(ethers.utils.parseEther('500000'), referral.address);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          referralCode, // promoter referral code
          USDT_whale.address, // venue
          promoterBalance_promoterToken_before, // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDtoken: true,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before,
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before;
      const platformFees = await helper.calculateRate(500, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_before = await USDT.balanceOf(treasury.address);
      const promoterBalance_before = await USDT.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_after = await USDT.balanceOf(treasury.address);
      const promoterBalance_after = await USDT.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDT_whale.address, promoterBalance_promoterToken_before, true);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before)).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before.add(platformFees)).to.eq(feeReceiverBalance_after);
      expect(promoterBalance_before.add(toPromoter)).to.eq(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    // Use .only for test
    it.skip('distributePromoterPayments() (full amount) (platinum tier)', async () => {
      const {
        belongCheckIn,
        staking,
        helper,
        escrow,
        promoterToken,
        referral,
        signer,
        treasury,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const stakingRewardsNew: [
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
        BelongCheckIn.RewardsInfoStruct,
      ] = [
        {
          venueStakingInfo: {
            depositFeePercentage: 1000,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 800,
            longPercentage: 800,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 900,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 700,
            longPercentage: 700,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 800,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 600,
            longPercentage: 600,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 700,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 500,
            longPercentage: 500,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 500,
            convenienceFeeAmount,
          } as BelongCheckIn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdTokenPercentage: 400,
            longPercentage: 400,
          } as BelongCheckIn.PromoterStakingRewardInfoStruct,
        } as BelongCheckIn.RewardsInfoStruct,
      ];
      await belongCheckIn.setParameters(paymentsInfo, fees, stakingRewardsNew);

      await CAKE.connect(CAKE_whale).transfer(referral.address, ethers.utils.parseEther('1000000'));
      await CAKE.connect(referral).approve(staking.address, ethers.utils.parseEther('1000000'));
      await staking.connect(referral).deposit(ethers.utils.parseEther('1000000'), referral.address);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          referralCode, // promoter referral code
          USDT_whale.address, // venue
          promoterBalance_promoterToken_before, // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDtoken: true,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before,
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before;
      const platformFees = await helper.calculateRate(400, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_before = await USDT.balanceOf(treasury.address);
      const promoterBalance_before = await USDT.balanceOf(referral.address);

      const tx = await belongCheckIn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_after = await USDT.balanceOf(treasury.address);
      const promoterBalance_after = await USDT.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDT_whale.address, promoterBalance_promoterToken_before, true);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before)).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before.add(platformFees)).to.eq(feeReceiverBalance_after);
      expect(promoterBalance_before.add(toPromoter)).to.eq(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });
  });

  describe('Promoter flow long', () => {
    it('distributePromoterPayments() (full amount)', async () => {
      const {
        belongCheckIn,
        helper,
        escrow,
        promoterToken,
        referral,
        signer,
        treasury,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          referralCode, // promoter referral code
          USDT_whale.address, // venue
          promoterBalance_promoterToken_before, // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDtoken: false,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before,
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before;
      const platformFees = await helper.calculateRate(800, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_before = await CAKE.balanceOf(treasury.address);
      const promoterBalance_before = await CAKE.balanceOf(referral.address);
      const tx = await belongCheckIn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_after = await CAKE.balanceOf(treasury.address);
      const promoterBalance_after = await CAKE.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDT_whale.address, promoterBalance_promoterToken_before, false);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before)).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before).to.be.lt(feeReceiverBalance_after);
      expect(promoterBalance_before).to.be.lt(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('distributePromoterPayments() (partial amount)', async () => {
      const {
        belongCheckIn,
        helper,
        escrow,
        promoterToken,
        referral,
        signer,
        treasury,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['bytes32', 'address', 'uint256', 'uint256'],
        [
          referralCode, // promoter referral code
          USDT_whale.address, // venue
          promoterBalance_promoterToken_before.div(2), // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDtoken: false,
        promoterReferralCode: referralCode,
        venue: USDT_whale.address,
        amountInUSD: promoterBalance_promoterToken_before.div(2),
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before.div(2);
      const platformFees = await helper.calculateRate(800, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_before = await CAKE.balanceOf(treasury.address);
      const promoterBalance_before = await CAKE.balanceOf(referral.address);
      const tx = await belongCheckIn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDT.balanceOf(escrow.address);
      const feeReceiverBalance_after = await CAKE.balanceOf(treasury.address);
      const promoterBalance_after = await CAKE.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDT_whale.address, promoterBalance_promoterToken_before.div(2), false);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before.div(2))).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before).to.be.lt(feeReceiverBalance_after);
      expect(promoterBalance_before).to.be.lt(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before.div(2))).to.eq(
        promoterBalance_promoterToken_after,
      );
    });
  });

  describe('Manager flow', () => {
    it('payToVenue() (both payment) (w/ promoter) (both bounties) then emergencyCancelPayment()', async () => {
      const {
        belongCheckIn,
        helper,
        venueToken,
        promoterToken,
        referral,
        signer,
        referralCode,
        USDT,
        CAKE,
        USDT_whale,
        CAKE_whale,
      } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = await u(100, USDT);
      const venue = USDT_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3, bountyAllocationType: 1, longPaymentType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        affiliateReferralCode: referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(convenienceFeeAmount.add(venueAmount));
      await USDT.connect(USDT_whale).approve(belongCheckIn.address, willBeTaken);
      await belongCheckIn.connect(USDT_whale).venueDeposit(venueInfo);

      const customerAmount = await u(5, USDT);
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint128', 'uint24', 'uint128', 'uint24', 'address', 'address', 'bytes32', 'uint256', 'uint256'],
        [
          true, // paymentInUSDtoken
          0, // toCustomer.visitBountyAmount
          0, // toCustomer.spendBountyPercentage
          await u(1, USDT), // toPromoter.visitBountyAmount
          1000, // toPromoter.spendBountyPercentage
          CAKE_whale.address, // customer
          USDT_whale.address, // venueToPayFor
          referralCode, // promoter referral code
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDtoken: true,
        toCustomer: {
          visitBountyAmount: 0,
          spendBountyPercentage: 0,
        },
        toPromoter: {
          visitBountyAmount: await u(1, USDT),
          spendBountyPercentage: 1000,
        },
        customer: CAKE_whale.address,
        venueToPayFor: USDT_whale.address,
        promoterReferralCode: referralCode,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDT.connect(USDT_whale).transfer(CAKE_whale.address, customerAmount);
      await USDT.connect(CAKE_whale).approve(belongCheckIn.address, customerAmount);

      await belongCheckIn.connect(CAKE_whale).payToVenue(customerInfo);

      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(
        belongCheckIn.connect(USDT_whale).emergencyCancelPayment(USDT_whale.address, referral.address),
      ).to.be.revertedWithCustomError(belongCheckIn, 'Unauthorized');

      const tx = await belongCheckIn.emergencyCancelPayment(USDT_whale.address, referral.address);

      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDT_whale.address,
        await helper.getVenueId(USDT_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDT_whale.address),
      );

      await expect(tx)
        .to.emit(belongCheckIn, 'PromoterPaymentCancelled')
        .withArgs(USDT_whale.address, referral.address, promoterBalance_promoterToken_before);

      expect(venueBalance_venueToken_before.add(promoterBalance_promoterToken_before)).to.eq(
        venueBalance_venueToken_after,
      );
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });
  });
});

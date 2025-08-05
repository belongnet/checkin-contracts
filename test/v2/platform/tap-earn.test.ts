import { ethers } from 'hardhat';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import EthCrypto from 'eth-crypto';
import {
  AccessToken,
  CreditToken,
  Escrow,
  Factory,
  Helper,
  IERC20Metadata,
  MockTransferValidatorV2,
  RoyaltiesReceiverV2,
  SignatureVerifier,
  Staking,
  TapAndEarn,
} from '../../../typechain-types';
import {
  deployCreditTokens,
  deployAccessTokenImplementation,
  deployCreditTokenImplementation,
  deployFactory,
  deployRoyaltiesReceiverV2Implementation,
  deployStaking,
  deployTapAndEarn,
  deployEscrow,
} from '../helpers/deployFixtures';
import { getSignerFromAddress, getToken, startSimulateMainnet, stopSimulateMainnet } from '../helpers/forkHelpers';
import { deployHelper, deploySignatureVerifier } from '../helpers/deployLibraries';
import { deployMockTransferValidatorV2, deployPriceFeeds } from '../helpers/deployMockFixtures';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';

enum StakingTiers {
  NoStakes,
  BronzeTier,
  SilverTier,
  GoldTier,
  PlatinumTier,
}

describe.only('TapAndEarn', () => {
  const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  const USDC_ADDRESS = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
  const ENA_ADDRESS = '0x57e114B691Db790C35207b2e685D4A43181e6061'; //used instead of LONG

  const USDC_WHALE_ADDRESS = '0x28C6c06298d514Db089934071355E5743bf21d60';
  const WETH_WHALE_ADDRESS = '0x57757E3D981446D585Af0D9Ae4d7DF6D64647806';
  const ENA_WHALE_ADDRESS = '0xc4E512313dD1cE0795f88eC5229778eDf1FDF79B';

  const UNISWAP_ROUTER_ADDRESS = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
  const UNISWAP_QUOTER_ADDRESS = '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6';
  const POOL_FEE = 3000;

  const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  const chainId = 31337;

  const paymentsInfo: TapAndEarn.PaymentsInfoStruct = {
    uniswapPoolFees: POOL_FEE,
    uniswapV3Router: UNISWAP_ROUTER_ADDRESS,
    uniswapV3Quoter: UNISWAP_QUOTER_ADDRESS,
    weth: WETH_ADDRESS,
    usdc: USDC_ADDRESS,
    long: ENA_ADDRESS,
  };
  let implementations: Factory.ImplementationsStruct, contracts: TapAndEarn.ContractsStruct;

  let WETH_whale: SignerWithAddress, USDC_whale: SignerWithAddress, ENA_whale: SignerWithAddress;
  let WETH: IERC20Metadata, USDC: IERC20Metadata, ENA: IERC20Metadata;

  before(startSimulateMainnet);

  after(stopSimulateMainnet);

  async function fixture() {
    const [admin, treasury, manager, minter, burner, pauser, referral] = await ethers.getSigners();
    const signer = EthCrypto.createIdentity();

    WETH_whale = await getSignerFromAddress(WETH_WHALE_ADDRESS);
    USDC_whale = await getSignerFromAddress(USDC_WHALE_ADDRESS);
    ENA_whale = await getSignerFromAddress(ENA_WHALE_ADDRESS);

    WETH = await getToken(WETH_ADDRESS);
    USDC = await getToken(USDC_ADDRESS);
    ENA = await getToken(ENA_ADDRESS);

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
      treasury.address,
      signer.address,
      signatureVerifier.address,
      validator.address,
      implementations,
    );

    const helper: Helper = await deployHelper();
    const staking: Staking = await deployStaking(admin.address, treasury.address, ENA_ADDRESS);

    const referralCode = EthCrypto.hash.keccak256([
      { type: 'address', value: referral.address },
      { type: 'address', value: factory.address },
      { type: 'uint256', value: chainId },
    ]);

    await factory.connect(referral).createReferralCode();

    const tapEarn: TapAndEarn = await deployTapAndEarn(
      signatureVerifier.address,
      helper.address,
      admin.address,
      paymentsInfo,
    );

    const escrow: Escrow = await deployEscrow(tapEarn.address);
    const { pf1, pf2, pf3 } = await deployPriceFeeds();
    const { venueToken, promoterToken } = await deployCreditTokens(
      true,
      false,
      factory,
      signer,
      admin,
      manager,
      minter,
      burner,
    );

    contracts = {
      factory: factory.address,
      escrow: escrow.address,
      staking: staking.address,
      venueToken: venueToken.address,
      promoterToken: promoterToken.address,
      longPF: pf1.address,
    };

    await tapEarn.setContracts(contracts);

    return {
      signatureVerifier,
      helper,
      factory,
      staking,
      venueToken,
      promoterToken,
      tapEarn,
      escrow,
      pf1,
      pf2,
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
    };
  }

  describe('Deployment', () => {
    it('Should be deployed correctly', async () => {
      const { tapEarn, escrow, pf1, pf2, pf3, admin } = await loadFixture(fixture);
      expect(tapEarn.address).to.be.properAddress;
      expect(escrow.address).to.be.properAddress;
      expect(pf1.address).to.be.properAddress;
      expect(pf2.address).to.be.properAddress;
      expect(pf3.address).to.be.properAddress;

      expect(await tapEarn.owner()).to.eq(admin.address);

      const tapEarnStorage = await tapEarn.tapEarnStorage();

      // Convert contracts tuple to object
      const contractsFromStorage = {
        factory: tapEarnStorage.contracts.factory,
        escrow: tapEarnStorage.contracts.escrow,
        staking: tapEarnStorage.contracts.staking,
        venueToken: tapEarnStorage.contracts.venueToken,
        promoterToken: tapEarnStorage.contracts.promoterToken,
        longPF: tapEarnStorage.contracts.longPF,
      };
      expect(contractsFromStorage).to.deep.eq(contracts);

      // Convert paymentsInfo tuple to object
      const paymentsInfoFromStorage = {
        uniswapPoolFees: tapEarnStorage.paymentsInfo.uniswapPoolFees,
        uniswapV3Router: tapEarnStorage.paymentsInfo.uniswapV3Router,
        uniswapV3Quoter: tapEarnStorage.paymentsInfo.uniswapV3Quoter,
        weth: tapEarnStorage.paymentsInfo.weth,
        usdc: tapEarnStorage.paymentsInfo.usdc,
        long: tapEarnStorage.paymentsInfo.long,
      };
      expect(paymentsInfoFromStorage).to.deep.eq(paymentsInfo);

      // Convert fees tuple to object
      const feesFromStorage = {
        referralCreditsAmount: tapEarnStorage.fees.referralCreditsAmount,
        affiliatePercentage: tapEarnStorage.fees.affiliatePercentage,
        longCustomerDiscountPercentage: tapEarnStorage.fees.longCustomerDiscountPercentage,
        platformSubsidyPercentage: tapEarnStorage.fees.platformSubsidyPercentage,
        processingFeePercentage: tapEarnStorage.fees.processingFeePercentage,
      };
      expect(feesFromStorage).to.deep.eq({
        referralCreditsAmount: 3,
        affiliatePercentage: 1000,
        longCustomerDiscountPercentage: 300,
        platformSubsidyPercentage: 300,
        processingFeePercentage: 250,
      });

      const convenienceFeeAmount = 5000000;
      const usdcPercentage = 1000;
      const stakingRewardsInfo: [
        TapAndEarn.RewardsInfoStruct,
        TapAndEarn.RewardsInfoStruct,
        TapAndEarn.RewardsInfoStruct,
        TapAndEarn.RewardsInfoStruct,
        TapAndEarn.RewardsInfoStruct,
      ] = [
        {
          venueStakingInfo: {
            depositFeePercentage: 1000,
            convenienceFeeAmount,
          } as TapAndEarn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdcPercentage,
            longPercentage: 800,
          } as TapAndEarn.PromoterStakingRewardInfoStruct,
        } as TapAndEarn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 900,
            convenienceFeeAmount,
          } as TapAndEarn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdcPercentage,
            longPercentage: 700,
          } as TapAndEarn.PromoterStakingRewardInfoStruct,
        } as TapAndEarn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 800,
            convenienceFeeAmount,
          } as TapAndEarn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdcPercentage,
            longPercentage: 600,
          } as TapAndEarn.PromoterStakingRewardInfoStruct,
        } as TapAndEarn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 700,
            convenienceFeeAmount,
          } as TapAndEarn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdcPercentage,
            longPercentage: 500,
          } as TapAndEarn.PromoterStakingRewardInfoStruct,
        } as TapAndEarn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 500,
            convenienceFeeAmount,
          } as TapAndEarn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdcPercentage,
            longPercentage: 400,
          } as TapAndEarn.PromoterStakingRewardInfoStruct,
        } as TapAndEarn.RewardsInfoStruct,
      ];

      for (let tierValue = 0; tierValue < stakingRewardsInfo.length; tierValue++) {
        const result = await tapEarn.stakingRewards(tierValue);
        const resultFromStorage = {
          venueStakingInfo: {
            depositFeePercentage: result.venueStakingInfo.depositFeePercentage,
            convenienceFeeAmount: result.venueStakingInfo.convenienceFeeAmount,
          },
          promoterStakingInfo: {
            usdcPercentage: result.promoterStakingInfo.usdcPercentage,
            longPercentage: result.promoterStakingInfo.longPercentage,
          },
        };
        expect(resultFromStorage).to.deep.eq(stakingRewardsInfo[tierValue]);
      }

      expect(await escrow.tapAndEarn()).to.eq(tapEarn.address);
    });
  });

  describe('Set functions', () => {
    it('setParameters() can be set only by the owner', async () => {
      const { tapEarn, minter } = await loadFixture(fixture);

      const paymentsInfoNew = {
        uniswapPoolFees: 5000,
        uniswapV3Router: UNISWAP_ROUTER_ADDRESS,
        uniswapV3Quoter: UNISWAP_QUOTER_ADDRESS,
        weth: WETH_ADDRESS,
        usdc: USDC_ADDRESS,
        long: ENA_ADDRESS,
      };
      const feesNew = {
        referralCreditsAmount: 1,
        affiliatePercentage: 100,
        longCustomerDiscountPercentage: 100,
        platformSubsidyPercentage: 100,
        processingFeePercentage: 100,
      };
      const convenienceFeeAmountNew = 1000000;
      const usdcPercentageNew = 100;
      const stakingRewardsNew: [
        TapAndEarn.RewardsInfoStruct,
        TapAndEarn.RewardsInfoStruct,
        TapAndEarn.RewardsInfoStruct,
        TapAndEarn.RewardsInfoStruct,
        TapAndEarn.RewardsInfoStruct,
      ] = [
        {
          venueStakingInfo: {
            depositFeePercentage: 1000,
            convenienceFeeAmount: convenienceFeeAmountNew,
          } as TapAndEarn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdcPercentage: usdcPercentageNew,
            longPercentage: 800,
          } as TapAndEarn.PromoterStakingRewardInfoStruct,
        } as TapAndEarn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 900,
            convenienceFeeAmount: convenienceFeeAmountNew,
          } as TapAndEarn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdcPercentage: usdcPercentageNew,
            longPercentage: 700,
          } as TapAndEarn.PromoterStakingRewardInfoStruct,
        } as TapAndEarn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 800,
            convenienceFeeAmount: convenienceFeeAmountNew,
          } as TapAndEarn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdcPercentage: usdcPercentageNew,
            longPercentage: 600,
          } as TapAndEarn.PromoterStakingRewardInfoStruct,
        } as TapAndEarn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 700,
            convenienceFeeAmount: convenienceFeeAmountNew,
          } as TapAndEarn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdcPercentage: usdcPercentageNew,
            longPercentage: 500,
          } as TapAndEarn.PromoterStakingRewardInfoStruct,
        } as TapAndEarn.RewardsInfoStruct,
        {
          venueStakingInfo: {
            depositFeePercentage: 500,
            convenienceFeeAmount: convenienceFeeAmountNew,
          } as TapAndEarn.VenueStakingRewardInfoStruct,
          promoterStakingInfo: {
            usdcPercentage: usdcPercentageNew,
            longPercentage: 400,
          } as TapAndEarn.PromoterStakingRewardInfoStruct,
        } as TapAndEarn.RewardsInfoStruct,
      ];

      await expect(
        tapEarn.connect(minter).setParameters(paymentsInfoNew, feesNew, stakingRewardsNew),
      ).to.be.revertedWithCustomError(tapEarn, 'Unauthorized');
      const tx = await tapEarn.setParameters(paymentsInfoNew, feesNew, stakingRewardsNew);
      await expect(tx).to.emit(tapEarn, 'ParametersSet');

      const tapEarnStorage = await tapEarn.tapEarnStorage();
      // Convert paymentsInfo tuple to object
      expect({
        uniswapPoolFees: tapEarnStorage.paymentsInfo.uniswapPoolFees,
        uniswapV3Router: tapEarnStorage.paymentsInfo.uniswapV3Router,
        uniswapV3Quoter: tapEarnStorage.paymentsInfo.uniswapV3Quoter,
        weth: tapEarnStorage.paymentsInfo.weth,
        usdc: tapEarnStorage.paymentsInfo.usdc,
        long: tapEarnStorage.paymentsInfo.long,
      }).to.deep.eq(paymentsInfoNew);
      // Convert fees tuple to object
      expect({
        referralCreditsAmount: tapEarnStorage.fees.referralCreditsAmount,
        affiliatePercentage: tapEarnStorage.fees.affiliatePercentage,
        longCustomerDiscountPercentage: tapEarnStorage.fees.longCustomerDiscountPercentage,
        platformSubsidyPercentage: tapEarnStorage.fees.platformSubsidyPercentage,
        processingFeePercentage: tapEarnStorage.fees.processingFeePercentage,
      }).to.deep.eq(feesNew);
      // Convert stakingRewards tuple to object for each tier
      for (let tierValue = 0; tierValue < stakingRewardsNew.length; tierValue++) {
        const result = await tapEarn.stakingRewards(tierValue);
        const resultFromStorage = {
          venueStakingInfo: {
            depositFeePercentage: result.venueStakingInfo.depositFeePercentage,
            convenienceFeeAmount: result.venueStakingInfo.convenienceFeeAmount,
          },
          promoterStakingInfo: {
            usdcPercentage: result.promoterStakingInfo.usdcPercentage,
            longPercentage: result.promoterStakingInfo.longPercentage,
          },
        };
        expect(resultFromStorage).to.deep.eq(stakingRewardsNew[tierValue]);
      }
    });

    it('setContracts() can be set only by the owner', async () => {
      const { tapEarn, minter } = await loadFixture(fixture);

      const contractsNew = {
        factory: tapEarn.address,
        escrow: tapEarn.address,
        staking: tapEarn.address,
        venueToken: tapEarn.address,
        promoterToken: tapEarn.address,
        longPF: tapEarn.address,
      };

      await expect(tapEarn.connect(minter).setContracts(contractsNew)).to.be.revertedWithCustomError(
        tapEarn,
        'Unauthorized',
      );
      const tx = await tapEarn.setContracts(contractsNew);
      await expect(tx).to.emit(tapEarn, 'ContractsSet');

      const tapEarnStorage = await tapEarn.tapEarnStorage();
      // Convert contracts tuple to object
      const contractsFromStorage = {
        factory: tapEarnStorage.contracts.factory,
        escrow: tapEarnStorage.contracts.escrow,
        staking: tapEarnStorage.contracts.staking,
        venueToken: tapEarnStorage.contracts.venueToken,
        promoterToken: tapEarnStorage.contracts.promoterToken,
        longPF: tapEarnStorage.contracts.longPF,
      };
      expect(contractsFromStorage).to.deep.eq(contractsNew);
    });
  });
});

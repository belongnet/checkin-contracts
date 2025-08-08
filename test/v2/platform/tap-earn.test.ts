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
import {
  CustomerInfoStruct,
  PromoterInfoStruct,
  VenueInfoStruct,
  VenueRulesStruct,
} from '../../../typechain-types/contracts/v2/platform/TapAndEarn';

describe('TapAndEarn', () => {
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
  const usdcPercentage = 1000;
  const convenienceFeeAmount = 5000000;
  const stakingRewards: [
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
  const fees: TapAndEarn.FeesStruct = {
    referralCreditsAmount: 3,
    affiliatePercentage: 1000,
    longCustomerDiscountPercentage: 300,
    platformSubsidyPercentage: 300,
    processingFeePercentage: 250,
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
      manager.address,
      tapEarn.address,
      tapEarn.address,
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
      expect(feesFromStorage).to.deep.eq(fees);

      for (let tierValue = 0; tierValue < stakingRewards.length; tierValue++) {
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
        expect(resultFromStorage).to.deep.eq(stakingRewards[tierValue]);
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

  describe('Venue flow', () => {
    it('venueDeposit() (first deposit) (w/o referral) (no stakes)', async () => {
      const { tapEarn, escrow, venueToken, helper, treasury, signer } = await loadFixture(fixture);

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode: ethers.constants.HashZero,
        uri,
        signature: signature,
      };

      const willBeTaken = amount + convenienceFeeAmount;

      const USDC_balance_before = await USDC.balanceOf(USDC_whale.address);

      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      const tx = await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDC_whale.address);

      await expect(tx).to.emit(tapEarn, 'VenuePaidDeposit');
      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(tapEarn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx)
        .to.emit(escrow, 'VenueDepositsUpdated')
        .withArgs(USDC_whale.address, amount, escrowDeposit.longDeposits);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).remainingCredits).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.bountyType).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdcDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDC_whale.address, await helper.getVenueId(USDC_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDC_whale.address))).to.eq(uri);
      expect(await USDC.balanceOf(tapEarn.address)).to.eq(0);
      expect(await USDC.balanceOf(escrow.address)).to.eq(amount);
      expect(await ENA.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
      expect(await USDC.balanceOf(treasury.address)).to.eq(0);

      const USDC_balance_after = await USDC.balanceOf(USDC_whale.address);
      expect(USDC_balance_before.sub(willBeTaken)).to.eq(USDC_balance_after);
    });

    it('venueDeposit() (free deposits exceed) (w/o referral) (no stakes)', async () => {
      const { tapEarn, escrow, venueToken, helper, admin, treasury, signer } = await loadFixture(fixture);

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode: ethers.constants.HashZero,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(1000, amount);
      const willBeTaken = paymentToTreasury.add(amount + convenienceFeeAmount);

      const USDC_balance_before = await USDC.balanceOf(USDC_whale.address);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await tapEarn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const tx = await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDC_whale.address);

      const USDC_balance_after = await USDC.balanceOf(USDC_whale.address);
      expect(USDC_balance_before.sub(willBeTaken)).to.eq(USDC_balance_after);

      expect(await USDC.balanceOf(treasury.address)).to.eq(paymentToTreasury);

      await expect(tx).to.emit(tapEarn, 'VenuePaidDeposit');
      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(tapEarn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx)
        .to.emit(escrow, 'VenueDepositsUpdated')
        .withArgs(USDC_whale.address, amount, escrowDeposit.longDeposits);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).remainingCredits).to.eq(0);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.bountyType).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdcDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDC_whale.address, await helper.getVenueId(USDC_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDC_whale.address))).to.eq(uri);
      expect(await USDC.balanceOf(tapEarn.address)).to.eq(0);
      expect(await USDC.balanceOf(escrow.address)).to.eq(amount);
      expect(await ENA.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (first deposit) (w/ referral) (no stakes)', async () => {
      const { tapEarn, escrow, venueToken, helper, referral, treasury, signer, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
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
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode: referralCodeWrong,
        uri,
        signature: signatureCodeWrong,
      };

      let venueInfoWrongPaymentType: VenueInfoStruct = {
        rules: { paymentType: 0, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
        uri,
        signature: signature,
      };

      let venueInfoWrongBountyType: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 0 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
        uri,
        signature: signature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(amount + convenienceFeeAmount);

      const USDC_balance_before = await USDC.balanceOf(USDC_whale.address);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      await expect(tapEarn.connect(USDC_whale).venueDeposit(venueInfoWrongCode))
        .to.be.revertedWithCustomError(tapEarn, 'WrongReferralCode')
        .withArgs(venueInfoWrongCode.referralCode);
      await expect(tapEarn.connect(USDC_whale).venueDeposit(venueInfoWrongPaymentType)).to.be.revertedWithCustomError(
        tapEarn,
        'WrongPaymentTypeProvided',
      );

      const tx = await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDC_whale.address);

      const USDC_balance_after = await USDC.balanceOf(USDC_whale.address);
      expect(USDC_balance_before.sub(willBeTaken)).to.eq(USDC_balance_after);

      expect(await ENA.balanceOf(referral.address)).to.gt(amount);

      await expect(tx).to.emit(tapEarn, 'VenuePaidDeposit');
      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(tapEarn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx)
        .to.emit(escrow, 'VenueDepositsUpdated')
        .withArgs(USDC_whale.address, amount, escrowDeposit.longDeposits);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).remainingCredits).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.bountyType).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdcDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDC_whale.address, await helper.getVenueId(USDC_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDC_whale.address))).to.eq(uri);
      expect(await USDC.balanceOf(tapEarn.address)).to.eq(0);
      expect(await USDC.balanceOf(escrow.address)).to.eq(amount);
      expect(await USDC.balanceOf(treasury.address)).to.eq(0);
      expect(await ENA.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (first deposit) (w/ referral) (no stakes)', async () => {
      const { tapEarn, escrow, venueToken, helper, referral, treasury, signer, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
        uri,
        signature: signature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(amount + convenienceFeeAmount);

      const USDC_balance_before = await USDC.balanceOf(USDC_whale.address);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      const tx = await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDC_whale.address);

      const USDC_balance_after = await USDC.balanceOf(USDC_whale.address);
      expect(USDC_balance_before.sub(willBeTaken)).to.eq(USDC_balance_after);

      expect(await ENA.balanceOf(referral.address)).to.gt(amount);

      await expect(tx).to.emit(tapEarn, 'VenuePaidDeposit');
      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(tapEarn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx)
        .to.emit(escrow, 'VenueDepositsUpdated')
        .withArgs(USDC_whale.address, amount, escrowDeposit.longDeposits);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).remainingCredits).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.bountyType).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdcDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDC_whale.address, await helper.getVenueId(USDC_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDC_whale.address))).to.eq(uri);
      expect(await USDC.balanceOf(tapEarn.address)).to.eq(0);
      expect(await USDC.balanceOf(escrow.address)).to.eq(amount);
      expect(await USDC.balanceOf(treasury.address)).to.eq(0);
      expect(await ENA.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (no stakes)', async () => {
      const { tapEarn, escrow, venueToken, helper, admin, referral, treasury, signer, referralCode } =
        await loadFixture(fixture);

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(1000, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(amount + convenienceFeeAmount).add(paymentToTreasury);

      const USDC_balance_before = await USDC.balanceOf(USDC_whale.address);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await tapEarn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const tx = await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDC_whale.address);

      const USDC_balance_after = await USDC.balanceOf(USDC_whale.address);
      expect(USDC_balance_before.sub(willBeTaken)).to.eq(USDC_balance_after);

      expect(await USDC.balanceOf(treasury.address)).to.eq(paymentToTreasury);
      expect(await ENA.balanceOf(referral.address)).to.gt(amount);

      await expect(tx).to.emit(tapEarn, 'VenuePaidDeposit');
      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(tapEarn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx)
        .to.emit(escrow, 'VenueDepositsUpdated')
        .withArgs(USDC_whale.address, amount, escrowDeposit.longDeposits);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).remainingCredits).to.eq(0);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.bountyType).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdcDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDC_whale.address, await helper.getVenueId(USDC_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDC_whale.address))).to.eq(uri);
      expect(await USDC.balanceOf(tapEarn.address)).to.eq(0);
      expect(await USDC.balanceOf(escrow.address)).to.eq(amount);
      expect(await ENA.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (bronze tier stakes)', async () => {
      const { tapEarn, staking, escrow, venueToken, helper, admin, referral, treasury, signer, referralCode } =
        await loadFixture(fixture);
      // console.log(await ENA.balanceOf(ENA_whale.address));
      // await ENA.connect(ENA_whale).transfer(USDC_whale.address, ethers.utils.parseEther('50000'));
      // console.log(await ENA.balanceOf(USDC_whale.address));
      await ENA.connect(USDC_whale).approve(staking.address, ethers.utils.parseEther('50000'));
      await staking.connect(USDC_whale).deposit(ethers.utils.parseEther('50000'), USDC_whale.address);

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(900, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(amount + convenienceFeeAmount).add(paymentToTreasury);

      const USDC_balance_before = await USDC.balanceOf(USDC_whale.address);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await tapEarn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const tx = await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDC_whale.address);

      const USDC_balance_after = await USDC.balanceOf(USDC_whale.address);
      expect(USDC_balance_before.sub(willBeTaken)).to.eq(USDC_balance_after);

      expect(await USDC.balanceOf(treasury.address)).to.eq(paymentToTreasury);
      expect(await ENA.balanceOf(referral.address)).to.gt(amount);

      await expect(tx).to.emit(tapEarn, 'VenuePaidDeposit');
      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(tapEarn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx)
        .to.emit(escrow, 'VenueDepositsUpdated')
        .withArgs(USDC_whale.address, amount, escrowDeposit.longDeposits);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).remainingCredits).to.eq(0);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.bountyType).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdcDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDC_whale.address, await helper.getVenueId(USDC_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDC_whale.address))).to.eq(uri);
      expect(await USDC.balanceOf(tapEarn.address)).to.eq(0);
      expect(await USDC.balanceOf(escrow.address)).to.eq(amount);
      expect(await ENA.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (bronze tier stakes)', async () => {
      const { tapEarn, staking, escrow, venueToken, helper, admin, referral, treasury, signer, referralCode } =
        await loadFixture(fixture);
      // console.log(await ENA.balanceOf(ENA_whale.address));
      // await ENA.connect(ENA_whale).transfer(USDC_whale.address, ethers.utils.parseEther('50000'));
      // console.log(await ENA.balanceOf(USDC_whale.address));
      await ENA.connect(USDC_whale).approve(staking.address, ethers.utils.parseEther('249999'));
      await staking.connect(USDC_whale).deposit(ethers.utils.parseEther('249999'), USDC_whale.address);

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(900, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(amount + convenienceFeeAmount).add(paymentToTreasury);

      const USDC_balance_before = await USDC.balanceOf(USDC_whale.address);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await tapEarn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const tx = await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDC_whale.address);

      const USDC_balance_after = await USDC.balanceOf(USDC_whale.address);
      expect(USDC_balance_before.sub(willBeTaken)).to.eq(USDC_balance_after);

      expect(await USDC.balanceOf(treasury.address)).to.eq(paymentToTreasury);
      expect(await ENA.balanceOf(referral.address)).to.gt(amount);

      await expect(tx).to.emit(tapEarn, 'VenuePaidDeposit');
      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(tapEarn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx)
        .to.emit(escrow, 'VenueDepositsUpdated')
        .withArgs(USDC_whale.address, amount, escrowDeposit.longDeposits);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).remainingCredits).to.eq(0);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.bountyType).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdcDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDC_whale.address, await helper.getVenueId(USDC_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDC_whale.address))).to.eq(uri);
      expect(await USDC.balanceOf(tapEarn.address)).to.eq(0);
      expect(await USDC.balanceOf(escrow.address)).to.eq(amount);
      expect(await ENA.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (silver tier stakes)', async () => {
      const { tapEarn, staking, escrow, venueToken, helper, admin, referral, treasury, signer, referralCode } =
        await loadFixture(fixture);
      // console.log(await ENA.balanceOf(ENA_whale.address));
      // await ENA.connect(ENA_whale).transfer(USDC_whale.address, ethers.utils.parseEther('50000'));
      // console.log(await ENA.balanceOf(USDC_whale.address));
      await ENA.connect(USDC_whale).approve(staking.address, ethers.utils.parseEther('250000'));
      await staking.connect(USDC_whale).deposit(ethers.utils.parseEther('250000'), USDC_whale.address);

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(800, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(amount + convenienceFeeAmount).add(paymentToTreasury);

      const USDC_balance_before = await USDC.balanceOf(USDC_whale.address);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await tapEarn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const tx = await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDC_whale.address);

      const USDC_balance_after = await USDC.balanceOf(USDC_whale.address);
      expect(USDC_balance_before.sub(willBeTaken)).to.eq(USDC_balance_after);

      expect(await USDC.balanceOf(treasury.address)).to.eq(paymentToTreasury);
      expect(await ENA.balanceOf(referral.address)).to.gt(amount);

      await expect(tx).to.emit(tapEarn, 'VenuePaidDeposit');
      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(tapEarn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx)
        .to.emit(escrow, 'VenueDepositsUpdated')
        .withArgs(USDC_whale.address, amount, escrowDeposit.longDeposits);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).remainingCredits).to.eq(0);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.bountyType).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdcDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDC_whale.address, await helper.getVenueId(USDC_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDC_whale.address))).to.eq(uri);
      expect(await USDC.balanceOf(tapEarn.address)).to.eq(0);
      expect(await USDC.balanceOf(escrow.address)).to.eq(amount);
      expect(await ENA.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (gold tier stakes)', async () => {
      const { tapEarn, staking, escrow, venueToken, helper, admin, referral, treasury, signer, referralCode } =
        await loadFixture(fixture);
      // console.log(await ENA.balanceOf(ENA_whale.address));
      // await ENA.connect(ENA_whale).transfer(USDC_whale.address, ethers.utils.parseEther('50000'));
      // console.log(await ENA.balanceOf(USDC_whale.address));
      await ENA.connect(USDC_whale).approve(staking.address, ethers.utils.parseEther('500000'));
      await staking.connect(USDC_whale).deposit(ethers.utils.parseEther('500000'), USDC_whale.address);

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(700, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(amount + convenienceFeeAmount).add(paymentToTreasury);

      const USDC_balance_before = await USDC.balanceOf(USDC_whale.address);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await tapEarn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const tx = await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDC_whale.address);

      const USDC_balance_after = await USDC.balanceOf(USDC_whale.address);
      expect(USDC_balance_before.sub(willBeTaken)).to.eq(USDC_balance_after);

      expect(await USDC.balanceOf(treasury.address)).to.eq(paymentToTreasury);
      expect(await ENA.balanceOf(referral.address)).to.gt(amount);

      await expect(tx).to.emit(tapEarn, 'VenuePaidDeposit');
      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(tapEarn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx)
        .to.emit(escrow, 'VenueDepositsUpdated')
        .withArgs(USDC_whale.address, amount, escrowDeposit.longDeposits);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).remainingCredits).to.eq(0);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.bountyType).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdcDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDC_whale.address, await helper.getVenueId(USDC_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDC_whale.address))).to.eq(uri);
      expect(await USDC.balanceOf(tapEarn.address)).to.eq(0);
      expect(await USDC.balanceOf(escrow.address)).to.eq(amount);
      expect(await ENA.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('venueDeposit() (free deposits exceed) (w/ referral) (platinum tier stakes)', async () => {
      const { tapEarn, staking, escrow, venueToken, helper, admin, referral, treasury, signer, referralCode } =
        await loadFixture(fixture);
      // console.log(await ENA.balanceOf(ENA_whale.address));
      // await ENA.connect(ENA_whale).transfer(USDC_whale.address, ethers.utils.parseEther('50000'));
      // console.log(await ENA.balanceOf(USDC_whale.address));
      await ENA.connect(USDC_whale).approve(staking.address, ethers.utils.parseEther('1000000'));
      await staking.connect(USDC_whale).deposit(ethers.utils.parseEther('1000000'), USDC_whale.address);

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
        uri,
        signature: signature,
      };

      const paymentToTreasury = await helper.calculateRate(500, amount);
      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(amount + convenienceFeeAmount).add(paymentToTreasury);

      const USDC_balance_before = await USDC.balanceOf(USDC_whale.address);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      fees.referralCreditsAmount = 0;
      await tapEarn.connect(admin).setParameters(paymentsInfo, fees, stakingRewards);

      const tx = await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const escrowDeposit = await escrow.venueDeposits(USDC_whale.address);

      const USDC_balance_after = await USDC.balanceOf(USDC_whale.address);
      expect(USDC_balance_before.sub(willBeTaken)).to.eq(USDC_balance_after);

      expect(await USDC.balanceOf(treasury.address)).to.eq(paymentToTreasury);
      expect(await ENA.balanceOf(referral.address)).to.gt(amount);

      await expect(tx).to.emit(tapEarn, 'VenuePaidDeposit');
      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      await expect(tx)
        .to.emit(tapEarn, 'Swapped')
        .withArgs(escrow.address, convenienceFeeAmount, escrowDeposit.longDeposits);
      await expect(tx)
        .to.emit(escrow, 'VenueDepositsUpdated')
        .withArgs(USDC_whale.address, amount, escrowDeposit.longDeposits);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).remainingCredits).to.eq(0);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.bountyType).to.eq(1);
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(1);
      expect(escrowDeposit.usdcDeposits).to.eq(amount);
      expect(await venueToken.balanceOf(USDC_whale.address, await helper.getVenueId(USDC_whale.address))).to.eq(amount);
      expect(await venueToken['uri(uint256)'](await helper.getVenueId(USDC_whale.address))).to.eq(uri);
      expect(await USDC.balanceOf(tapEarn.address)).to.eq(0);
      expect(await USDC.balanceOf(escrow.address)).to.eq(amount);
      expect(await ENA.balanceOf(escrow.address)).to.eq(escrowDeposit.longDeposits);
    });

    it('updateVenueRules()', async () => {
      const { tapEarn, helper, signer, referralCode } = await loadFixture(fixture);

      const uri = 'uriuri';
      const amount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const message = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const signature = EthCrypto.sign(signer.privateKey, message);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount,
        referralCode,
        uri,
        signature: signature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, amount);
      const willBeTaken = paymentToAffiliate.add(amount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);

      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      await expect(
        tapEarn.connect(USDC_whale).updateVenueRules({ paymentType: 0, bountyType: 1 }),
      ).to.be.revertedWithCustomError(tapEarn, 'WrongPaymentTypeProvided');
      await expect(tapEarn.updateVenueRules({ paymentType: 1, bountyType: 0 })).to.be.revertedWithCustomError(
        tapEarn,
        'NotAVenue',
      );

      const tx = await tapEarn.connect(USDC_whale).updateVenueRules({ paymentType: 2, bountyType: 2 });

      await expect(tx).to.emit(tapEarn, 'VenueRulesSet');
      expect((await tapEarn.generalVenueInfo(USDC_whale.address)).rules.paymentType).to.eq(2);
    });
  });

  describe('Customer flow usdc payment', () => {
    it('payToVenue() (w/o promoter)', async () => {
      const { tapEarn, signer } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);
      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode: ethers.constants.HashZero,
        uri,
        signature: venueSignature,
      };
      const willBeTaken = venueAmount + convenienceFeeAmount;
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          0, // visitBountyAmount (uint24, adjust to uint256 if needed)
          0, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          ethers.constants.AddressZero, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 0,
        spendBountyPercentage: 0,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: ethers.constants.AddressZero,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const customerBalance_before = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_before = await USDC.balanceOf(USDC_whale.address);

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_after = await USDC.balanceOf(USDC_whale.address);

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          ethers.constants.AddressZero,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
    });

    it('payToVenue() (both payment) (w/o promoter)', async () => {
      const { tapEarn, signer } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);
      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode: ethers.constants.HashZero,
        uri,
        signature: venueSignature,
      };
      const willBeTaken = venueAmount + convenienceFeeAmount;
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          0, // visitBountyAmount (uint24, adjust to uint256 if needed)
          0, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          ethers.constants.AddressZero, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 0,
        spendBountyPercentage: 0,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: ethers.constants.AddressZero,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const customerBalance_before = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_before = await USDC.balanceOf(USDC_whale.address);

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_after = await USDC.balanceOf(USDC_whale.address);

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          ethers.constants.AddressZero,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
    });

    it('payToVenue() (w/ promoter) (visit bounty)', async () => {
      const { tapEarn, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          0, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 0,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const customerBalance_before = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_before = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_after = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(await customerInfo.visitBountyAmount)).to.eq(
        venueBalance_venueToken_after,
      );
      expect(promoterBalance_promoterToken_before.add(await customerInfo.visitBountyAmount)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('payToVenue() (both payment) (w/ promoter) (visit bounty)', async () => {
      const { tapEarn, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          0, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 0,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const customerBalance_before = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_before = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_after = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(await customerInfo.visitBountyAmount)).to.eq(
        venueBalance_venueToken_after,
      );
      expect(promoterBalance_promoterToken_before.add(await customerInfo.visitBountyAmount)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('payToVenue() (w/ promoter) (spend bounty)', async () => {
      const { tapEarn, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 2 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          0, // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 0,
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      const rewardsToPromoter = await helper.calculateRate(customerInfo.spendBountyPercentage, customerAmount);

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const customerBalance_before = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_before = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_after = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (both payment) (w/ promoter) (spend bounty)', async () => {
      const { tapEarn, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 2 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          0, // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 0,
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      const rewardsToPromoter = await helper.calculateRate(customerInfo.spendBountyPercentage, customerAmount);

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const customerBalance_before = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_before = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_after = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (w/ promoter) (both bounties)', async () => {
      const { tapEarn, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 1, bountyType: 3 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      const rewardsToPromoter = (await helper.calculateRate(customerInfo.spendBountyPercentage, customerAmount)).add(
        await customerInfo.visitBountyAmount,
      );

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const customerBalance_before = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_before = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_after = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (both payment) (w/ promoter) (both bounties)', async () => {
      const { tapEarn, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      const rewardsToPromoter = (await helper.calculateRate(customerInfo.spendBountyPercentage, customerAmount)).add(
        await customerInfo.visitBountyAmount,
      );

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const customerBalance_before = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_before = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const customerBalance_after = await USDC.balanceOf(ENA_whale.address);
      const venueBalance_after = await USDC.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(customerBalance_before.sub(customerAmount)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(customerAmount)).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });
  });

  describe('Customer flow long payment', () => {
    it('payToVenue() (w/o promoter)', async () => {
      const { tapEarn, escrow, helper, signer } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);
      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 2, bountyType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode: ethers.constants.HashZero,
        uri,
        signature: venueSignature,
      };
      const willBeTaken = venueAmount + convenienceFeeAmount;
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          false, // paymentInUSDC
          0, // visitBountyAmount (uint24, adjust to uint256 if needed)
          0, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          ethers.constants.AddressZero, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: false,
        visitBountyAmount: 0,
        spendBountyPercentage: 0,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: ethers.constants.AddressZero,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.processingFeePercentage,
        customerAmount,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      await ENA.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const escrowBalance_before = await ENA.balanceOf(escrow.address);
      const customerBalance_before = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_before = await ENA.balanceOf(USDC_whale.address);

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const escrowBalance_after = await ENA.balanceOf(escrow.address);
      const customerBalance_after = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_after = await ENA.balanceOf(USDC_whale.address);

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          ethers.constants.AddressZero,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(escrowBalance_before.sub(fromEscrowToVenue)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
    });

    it('payToVenue() (both payment) (w/o promoter)', async () => {
      const { tapEarn, escrow, helper, signer } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, ethers.constants.HashZero, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);
      const venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 0 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode: ethers.constants.HashZero,
        uri,
        signature: venueSignature,
      };
      const willBeTaken = venueAmount + convenienceFeeAmount;
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          false, // paymentInUSDC
          0, // visitBountyAmount (uint24, adjust to uint256 if needed)
          0, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          ethers.constants.AddressZero, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: false,
        visitBountyAmount: 0,
        spendBountyPercentage: 0,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: ethers.constants.AddressZero,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.processingFeePercentage,
        customerAmount,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      await ENA.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const escrowBalance_before = await ENA.balanceOf(escrow.address);
      const customerBalance_before = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_before = await ENA.balanceOf(USDC_whale.address);

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const escrowBalance_after = await ENA.balanceOf(escrow.address);
      const customerBalance_after = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_after = await ENA.balanceOf(USDC_whale.address);

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          ethers.constants.AddressZero,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(escrowBalance_before.sub(fromEscrowToVenue)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
    });

    it('payToVenue() (w/ promoter) (visit bounty)', async () => {
      const { tapEarn, escrow, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 2, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          false, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          0, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: false,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 0,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.processingFeePercentage,
        customerAmount,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      await ENA.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const escrowBalance_before = await ENA.balanceOf(escrow.address);
      const customerBalance_before = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_before = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const escrowBalance_after = await ENA.balanceOf(escrow.address);
      const customerBalance_after = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_after = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(escrowBalance_before.sub(fromEscrowToVenue)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(await customerInfo.visitBountyAmount)).to.eq(
        venueBalance_venueToken_after,
      );
      expect(promoterBalance_promoterToken_before.add(await customerInfo.visitBountyAmount)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('payToVenue() (both payment) (w/ promoter) (visit bounty)', async () => {
      const { tapEarn, escrow, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 1 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          false, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          0, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: false,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 0,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.processingFeePercentage,
        customerAmount,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      await ENA.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const escrowBalance_before = await ENA.balanceOf(escrow.address);
      const customerBalance_before = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_before = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const escrowBalance_after = await ENA.balanceOf(escrow.address);
      const customerBalance_after = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_after = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(escrowBalance_before.sub(fromEscrowToVenue)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(await customerInfo.visitBountyAmount)).to.eq(
        venueBalance_venueToken_after,
      );
      expect(promoterBalance_promoterToken_before.add(await customerInfo.visitBountyAmount)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('payToVenue() (w/ promoter) (spend bounty)', async () => {
      const { tapEarn, escrow, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 2, bountyType: 2 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          false, // paymentInUSDC
          0, // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: false,
        visitBountyAmount: 0,
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.processingFeePercentage,
        customerAmount,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      const rewardsToPromoter = await helper.unstandardize(
        USDC.address,
        await helper.calculateRate(
          customerInfo.spendBountyPercentage,
          await helper.getStandardizedPrice(
            ENA.address,
            (
              await tapEarn.tapEarnStorage()
            ).contracts.longPF,
            customerAmount,
          ),
        ),
      );
      expect(rewardsToPromoter).to.eq(
        await helper.unstandardize(
          USDC.address,
          await helper.standardize(
            ENA.address,
            await helper.calculateRate(customerInfo.spendBountyPercentage, customerAmount.div(2)),
          ),
        ),
      );

      await ENA.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const escrowBalance_before = await ENA.balanceOf(escrow.address);
      const customerBalance_before = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_before = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const escrowBalance_after = await ENA.balanceOf(escrow.address);
      const customerBalance_after = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_after = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(escrowBalance_before.sub(fromEscrowToVenue)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (both payment) (w/ promoter) (spend bounty)', async () => {
      const { tapEarn, escrow, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 2 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          false, // paymentInUSDC
          0, // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: false,
        visitBountyAmount: 0,
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.processingFeePercentage,
        customerAmount,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      const rewardsToPromoter = await helper.unstandardize(
        USDC.address,
        await helper.calculateRate(
          customerInfo.spendBountyPercentage,
          await helper.getStandardizedPrice(
            ENA.address,
            (
              await tapEarn.tapEarnStorage()
            ).contracts.longPF,
            customerAmount,
          ),
        ),
      );
      expect(rewardsToPromoter).to.eq(
        await helper.unstandardize(
          USDC.address,
          await helper.standardize(
            ENA.address,
            await helper.calculateRate(customerInfo.spendBountyPercentage, customerAmount.div(2)),
          ),
        ),
      );

      await ENA.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const escrowBalance_before = await ENA.balanceOf(escrow.address);
      const customerBalance_before = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_before = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const escrowBalance_after = await ENA.balanceOf(escrow.address);
      const customerBalance_after = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_after = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(escrowBalance_before.sub(fromEscrowToVenue)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter)).to.eq(venueBalance_venueToken_after);
      expect(promoterBalance_promoterToken_before.add(rewardsToPromoter)).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (w/ promoter) (both bounties)', async () => {
      const { tapEarn, escrow, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 2, bountyType: 3 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          false, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: false,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.processingFeePercentage,
        customerAmount,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      const rewardsToPromoter = await helper.unstandardize(
        USDC.address,
        await helper.calculateRate(
          customerInfo.spendBountyPercentage,
          await helper.getStandardizedPrice(
            ENA.address,
            (
              await tapEarn.tapEarnStorage()
            ).contracts.longPF,
            customerAmount,
          ),
        ),
      );
      expect(rewardsToPromoter).to.eq(
        await helper.unstandardize(
          USDC.address,
          await helper.standardize(
            ENA.address,
            await helper.calculateRate(customerInfo.spendBountyPercentage, customerAmount.div(2)),
          ),
        ),
      );

      await ENA.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const escrowBalance_before = await ENA.balanceOf(escrow.address);
      const customerBalance_before = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_before = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const escrowBalance_after = await ENA.balanceOf(escrow.address);
      const customerBalance_after = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_after = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(escrowBalance_before.sub(fromEscrowToVenue)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter.add(await customerInfo.visitBountyAmount))).to.eq(
        venueBalance_venueToken_after,
      );
      expect(
        promoterBalance_promoterToken_before.add(rewardsToPromoter.add(await customerInfo.visitBountyAmount)),
      ).to.eq(promoterBalance_promoterToken_after);
    });

    it('payToVenue() (both payment) (w/ promoter) (both bounties)', async () => {
      const { tapEarn, escrow, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = ethers.utils.parseEther('5');
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          false, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: false,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      const platformSubsidy = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.platformSubsidyPercentage,
        customerAmount,
      );
      const processingFee = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.processingFeePercentage,
        customerAmount,
      );
      const longCustomerDiscount = await helper.calculateRate(
        (
          await tapEarn.tapEarnStorage()
        ).fees.longCustomerDiscountPercentage,
        customerAmount,
      );
      const fromEscrowToVenue = platformSubsidy.sub(processingFee);
      const fromCustomerToVenue = BigNumber.from(customerAmount).sub(longCustomerDiscount);

      const rewardsToPromoter = await helper.unstandardize(
        USDC.address,
        await helper.calculateRate(
          customerInfo.spendBountyPercentage,
          await helper.getStandardizedPrice(
            ENA.address,
            (
              await tapEarn.tapEarnStorage()
            ).contracts.longPF,
            customerAmount,
          ),
        ),
      );
      expect(rewardsToPromoter).to.eq(
        await helper.unstandardize(
          USDC.address,
          await helper.standardize(
            ENA.address,
            await helper.calculateRate(customerInfo.spendBountyPercentage, customerAmount.div(2)),
          ),
        ),
      );

      await ENA.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      const escrowBalance_before = await ENA.balanceOf(escrow.address);
      const customerBalance_before = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_before = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const escrowBalance_after = await ENA.balanceOf(escrow.address);
      const customerBalance_after = await ENA.balanceOf(ENA_whale.address);
      const venueBalance_after = await ENA.balanceOf(USDC_whale.address);
      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'CustomerPaid')
        .withArgs(
          ENA_whale.address,
          USDC_whale.address,
          referral.address,
          customerAmount,
          customerInfo.visitBountyAmount,
          customerInfo.spendBountyPercentage,
        );
      expect(escrowBalance_before.sub(fromEscrowToVenue)).to.eq(escrowBalance_after);
      expect(customerBalance_before.sub(fromCustomerToVenue)).to.eq(customerBalance_after);
      expect(venueBalance_before.add(fromEscrowToVenue.add(fromCustomerToVenue))).to.eq(venueBalance_after);
      expect(venueBalance_venueToken_before.sub(rewardsToPromoter.add(await customerInfo.visitBountyAmount))).to.eq(
        venueBalance_venueToken_after,
      );
      expect(
        promoterBalance_promoterToken_before.add(rewardsToPromoter.add(await customerInfo.visitBountyAmount)),
      ).to.eq(promoterBalance_promoterToken_after);
    });
  });

  describe('Promoter flow usdc', () => {
    it('distributePromoterPayments() (full amount)', async () => {
      const { tapEarn, helper, escrow, promoterToken, referral, signer, treasury, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['address', 'address', 'uint256', 'uint256'],
        [
          referral.address, // promoter
          USDC_whale.address, // venue
          promoterBalance_promoterToken_before, // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDC: true,
        promoter: referral.address,
        venue: USDC_whale.address,
        amountInUSD: promoterBalance_promoterToken_before,
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before;
      const platformFees = await helper.calculateRate(1000, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDC.balanceOf(escrow.address);
      const feeReceiverBalance_before = await USDC.balanceOf(treasury.address);
      const promoterBalance_before = await USDC.balanceOf(referral.address);

      const tx = await tapEarn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDC.balanceOf(escrow.address);
      const feeReceiverBalance_after = await USDC.balanceOf(treasury.address);
      const promoterBalance_after = await USDC.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDC_whale.address, promoterBalance_promoterToken_before, true);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before)).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before.add(platformFees)).to.eq(feeReceiverBalance_after);
      expect(promoterBalance_before.add(toPromoter)).to.eq(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('distributePromoterPayments() (partial amount)', async () => {
      const { tapEarn, helper, escrow, promoterToken, referral, signer, treasury, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['address', 'address', 'uint256', 'uint256'],
        [
          referral.address, // promoter
          USDC_whale.address, // venue
          promoterBalance_promoterToken_before.div(2), // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDC: true,
        promoter: referral.address,
        venue: USDC_whale.address,
        amountInUSD: promoterBalance_promoterToken_before.div(2),
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before.div(2);
      const platformFees = await helper.calculateRate(1000, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDC.balanceOf(escrow.address);
      const feeReceiverBalance_before = await USDC.balanceOf(treasury.address);
      const promoterBalance_before = await USDC.balanceOf(referral.address);

      const tx = await tapEarn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDC.balanceOf(escrow.address);
      const feeReceiverBalance_after = await USDC.balanceOf(treasury.address);
      const promoterBalance_after = await USDC.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDC_whale.address, promoterBalance_promoterToken_before.div(2), true);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before.div(2))).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before.add(platformFees)).to.eq(feeReceiverBalance_after);
      expect(promoterBalance_before.add(toPromoter)).to.eq(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before.div(2))).to.eq(
        promoterBalance_promoterToken_after,
      );
    });
  });

  describe('Promoter flow long', () => {
    it('distributePromoterPayments() (full amount)', async () => {
      const { tapEarn, helper, escrow, promoterToken, referral, signer, treasury, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['address', 'address', 'uint256', 'uint256'],
        [
          referral.address, // promoter
          USDC_whale.address, // venue
          promoterBalance_promoterToken_before, // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDC: false,
        promoter: referral.address,
        venue: USDC_whale.address,
        amountInUSD: promoterBalance_promoterToken_before,
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before;
      const platformFees = await helper.calculateRate(800, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDC.balanceOf(escrow.address);
      const feeReceiverBalance_before = await ENA.balanceOf(treasury.address);
      const promoterBalance_before = await ENA.balanceOf(referral.address);
      console.log(feeReceiverBalance_before);
      console.log(promoterBalance_before);
      const tx = await tapEarn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDC.balanceOf(escrow.address);
      const feeReceiverBalance_after = await ENA.balanceOf(treasury.address);
      const promoterBalance_after = await ENA.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );
      console.log(feeReceiverBalance_after);
      console.log(promoterBalance_after);

      await expect(tx)
        .to.emit(tapEarn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDC_whale.address, promoterBalance_promoterToken_before, false);

      expect(escrowBalance_before.sub(promoterBalance_promoterToken_before)).to.eq(escrowBalance_after);
      expect(feeReceiverBalance_before).to.be.lt(feeReceiverBalance_after);
      expect(promoterBalance_before).to.be.lt(promoterBalance_after);
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });

    it('distributePromoterPayments() (partial amount)', async () => {
      const { tapEarn, helper, escrow, promoterToken, referral, signer, treasury, referralCode } = await loadFixture(
        fixture,
      );

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const promoterMessage = ethers.utils.solidityKeccak256(
        ['address', 'address', 'uint256', 'uint256'],
        [
          referral.address, // promoter
          USDC_whale.address, // venue
          promoterBalance_promoterToken_before.div(2), // amountInUSD
          chainId, // block.chainid
        ],
      );
      const promoterSignature = EthCrypto.sign(signer.privateKey, promoterMessage);
      const promoterInfo: PromoterInfoStruct = {
        paymentInUSDC: false,
        promoter: referral.address,
        venue: USDC_whale.address,
        amountInUSD: promoterBalance_promoterToken_before.div(2),
        signature: promoterSignature,
      };

      let toPromoter = promoterBalance_promoterToken_before.div(2);
      const platformFees = await helper.calculateRate(800, toPromoter);
      toPromoter = toPromoter.sub(platformFees);

      const escrowBalance_before = await USDC.balanceOf(escrow.address);
      const feeReceiverBalance_before = await ENA.balanceOf(treasury.address);
      const promoterBalance_before = await ENA.balanceOf(referral.address);
      console.log(feeReceiverBalance_before);
      console.log(promoterBalance_before);
      const tx = await tapEarn.connect(referral).distributePromoterPayments(promoterInfo);

      const escrowBalance_after = await USDC.balanceOf(escrow.address);
      const feeReceiverBalance_after = await ENA.balanceOf(treasury.address);
      const promoterBalance_after = await ENA.balanceOf(referral.address);
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );
      console.log(feeReceiverBalance_after);
      console.log(promoterBalance_after);

      await expect(tx)
        .to.emit(tapEarn, 'PromoterPaymentsDistributed')
        .withArgs(referral.address, USDC_whale.address, promoterBalance_promoterToken_before.div(2), false);

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
      const { tapEarn, helper, venueToken, promoterToken, referral, signer, referralCode } = await loadFixture(fixture);

      const uri = 'uriuri';
      const venueAmount = 100 * 10 ** (await USDC.decimals());
      const venue = USDC_whale.address;
      const venueMessage = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'string', 'uint256'],
        [venue, referralCode, uri, chainId],
      );
      const venueSignature = EthCrypto.sign(signer.privateKey, venueMessage);

      let venueInfo: VenueInfoStruct = {
        rules: { paymentType: 3, bountyType: 3 } as VenueRulesStruct,
        venue,
        amount: venueAmount,
        referralCode,
        uri,
        signature: venueSignature,
      };

      const paymentToAffiliate = await helper.calculateRate(fees.affiliatePercentage, venueAmount);
      const willBeTaken = paymentToAffiliate.add(venueAmount + convenienceFeeAmount);
      await USDC.connect(USDC_whale).approve(tapEarn.address, willBeTaken);
      await tapEarn.connect(USDC_whale).venueDeposit(venueInfo);

      const customerAmount = 5 * 10 ** (await USDC.decimals());
      const customerMessage = ethers.utils.solidityKeccak256(
        ['bool', 'uint24', 'uint24', 'address', 'address', 'address', 'uint256', 'uint256'],
        [
          true, // paymentInUSDC
          1 * 10 ** (await USDC.decimals()), // visitBountyAmount (uint24, adjust to uint256 if needed)
          1000, // spendBountyPercentage (uint24, adjust to uint256 if needed)
          ENA_whale.address, // customer
          USDC_whale.address, // venueToPayFor
          referral.address, // promoter
          customerAmount, // amount
          chainId, // block.chainid
        ],
      );
      const customerSignature = EthCrypto.sign(signer.privateKey, customerMessage);
      const customerInfo: CustomerInfoStruct = {
        paymentInUSDC: true,
        visitBountyAmount: 1 * 10 ** (await USDC.decimals()),
        spendBountyPercentage: 1000,
        customer: ENA_whale.address,
        venueToPayFor: USDC_whale.address,
        promoter: referral.address,
        amount: customerAmount,
        signature: customerSignature,
      };

      await USDC.connect(USDC_whale).transfer(ENA_whale.address, customerAmount);
      await USDC.connect(ENA_whale).approve(tapEarn.address, customerAmount);

      await tapEarn.connect(ENA_whale).payToVenue(customerInfo);

      const venueBalance_venueToken_before = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_before = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      const tx = await tapEarn.emergencyCancelPayment(USDC_whale.address, referral.address);

      const venueBalance_venueToken_after = await venueToken.balanceOf(
        USDC_whale.address,
        await helper.getVenueId(USDC_whale.address),
      );
      const promoterBalance_promoterToken_after = await promoterToken.balanceOf(
        referral.address,
        await helper.getVenueId(USDC_whale.address),
      );

      await expect(tx)
        .to.emit(tapEarn, 'PromoterPaymentCancelled')
        .withArgs(USDC_whale.address, referral.address, promoterBalance_promoterToken_before);

      expect(venueBalance_venueToken_before.add(promoterBalance_promoterToken_before)).to.eq(
        venueBalance_venueToken_after,
      );
      expect(promoterBalance_promoterToken_before.sub(promoterBalance_promoterToken_before)).to.eq(
        promoterBalance_promoterToken_after,
      );
    });
  });
});

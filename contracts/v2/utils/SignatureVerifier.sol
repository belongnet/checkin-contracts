// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {
    AccessTokenInfo,
    ERC1155Info,
    VestingWalletInfo,
    VenueInfo,
    VenueRules,
    CustomerInfo,
    PromoterInfo,
    StaticPriceParameters,
    DynamicPriceParameters,
    Bounties,
    PaymentTypes,
    BountyTypes,
    BountyAllocationTypes
} from "../Structures.sol";

/// @title SignatureVerifier
/// @notice Stateless helpers to verify backend-signed payloads for collection creation,
///         credit token creation, vesting wallet deployment, venue/customer/promoter actions,
///         and mint parameter checks.
/// @dev
/// - Uses `SignatureCheckerLib.isValidSignatureNow` for EOA or ERC1271 signatures.
/// - All hashes include `block.chainid` to bind signatures to a specific chain.
/// - Reverts with explicit errors on invalid signatures or rule mismatches.
library SignatureVerifier {
    using SignatureCheckerLib for address;

    // ============================== Errors ==============================

    /// @notice Thrown when a signature does not match the expected signer/payload.
    error InvalidSignature();

    /// @notice Thrown when collection metadata (name/symbol) is empty.
    /// @param name The provided collection name.
    /// @param symbol The provided collection symbol.
    error EmptyMetadata(string name, string symbol);

    /// @notice Thrown when the customer's requested payment type conflicts with venue rules.
    error WrongPaymentType();

    /// @notice Thrown when the bounty type derived from customer payload conflicts with venue rules.
    error WrongBountyType();

    error NoBountiesRelated();
    error NoBountyAllocationTypeSpecified();
    error WrongCustomerBountyType();

    // ============================== Verifiers ==============================

    /// @notice Verifies AccessToken collection creation payload.
    /// @dev Hash covers: `name`, `symbol`, `contractURI`, `feeNumerator`, and `chainId`.
    /// @param signer Authorized signer address.
    /// @param accessTokenInfo Payload to verify. Only the fields listed above are signed.
    function checkAccessTokenInfo(address signer, AccessTokenInfo memory accessTokenInfo) external view {
        require(
            bytes(accessTokenInfo.metadata.name).length > 0 && bytes(accessTokenInfo.metadata.symbol).length > 0,
            EmptyMetadata(accessTokenInfo.metadata.name, accessTokenInfo.metadata.symbol)
        );

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        accessTokenInfo.metadata.name,
                        accessTokenInfo.metadata.symbol,
                        accessTokenInfo.contractURI,
                        accessTokenInfo.feeNumerator,
                        block.chainid
                    )
                ),
                accessTokenInfo.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies CreditToken (ERC1155) collection creation payload.
    /// @dev Hash covers: `name`, `symbol`, `uri`, and `chainId`.
    /// @param signer Authorized signer address.
    /// @param signature Detached signature validating `creditTokenInfo`.
    /// @param creditTokenInfo Payload. Only the fields listed above are signed.
    function checkCreditTokenInfo(address signer, bytes calldata signature, ERC1155Info calldata creditTokenInfo)
        external
        view
    {
        require(
            bytes(creditTokenInfo.name).length > 0 && bytes(creditTokenInfo.symbol).length > 0,
            EmptyMetadata(creditTokenInfo.name, creditTokenInfo.symbol)
        );

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(creditTokenInfo.name, creditTokenInfo.symbol, creditTokenInfo.uri, block.chainid)
                ),
                signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies VestingWallet deployment payload including owner and schedule parameters.
    /// @dev Hash covers: `owner`, `startTimestamp`, `cliffDurationSeconds`, `durationSeconds`,
    ///      `token`, `beneficiary`, `totalAllocation`, `tgeAmount`, `linearAllocation`, `description`, and `chainId`.
    /// @param signer Authorized signer address.
    /// @param signature Detached signature validating `vestingWalletInfo` and `_owner`.
    /// @param owner Owner address for the vesting wallet proxy.
    /// @param vestingWalletInfo Full vesting schedule configuration and metadata.
    function checkVestingWalletInfo(
        address signer,
        bytes calldata signature,
        address owner,
        VestingWalletInfo calldata vestingWalletInfo
    ) external view {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        owner,
                        vestingWalletInfo.startTimestamp,
                        vestingWalletInfo.cliffDurationSeconds,
                        vestingWalletInfo.durationSeconds,
                        vestingWalletInfo.token,
                        vestingWalletInfo.beneficiary,
                        vestingWalletInfo.totalAllocation,
                        vestingWalletInfo.tgeAmount,
                        vestingWalletInfo.linearAllocation,
                        vestingWalletInfo.description,
                        block.chainid
                    )
                ),
                signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies venue deposit intent and metadata.
    /// @dev Hash covers: `venue`, `referralCode`, `uri`, and `chainId`.
    /// @param signer Authorized signer address.
    /// @param venueInfo Venue payload. Only the fields listed above are signed.
    function checkVenueInfo(address signer, VenueInfo calldata venueInfo) external view {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(venueInfo.venue, venueInfo.affiliateReferralCode, venueInfo.uri, block.chainid)
                ),
                venueInfo.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies customer payment payload and enforces venue rule compatibility.
    /// @dev Hash covers: `paymentInUSDtoken`, `visitBountyAmount`, `spendBountyPercentage`,
    ///      `customer`, `venueToPayFor`, `promoter`, `amount`, and `chainId`.
    /// @param signer Authorized signer address.
    /// @param customerInfo Customer payment data. Only the fields listed above are signed.
    /// @param rules Venue rules against which to validate payment and bounty types.
    function checkCustomerInfo(address signer, CustomerInfo calldata customerInfo, VenueRules memory rules)
        external
        view
    {
        PaymentTypes paymentType = customerInfo.paymentInUSDtoken ? PaymentTypes.USDtoken : PaymentTypes.LONG;
        require(
            rules.paymentType != PaymentTypes.NoType
                && (rules.paymentType == PaymentTypes.Both || rules.paymentType == paymentType),
            WrongPaymentType()
        );

        if (rules.bountyAllocationType == BountyAllocationTypes.NoType) {
            revert NoBountyAllocationTypeSpecified();
        } else {
            if (rules.bountyAllocationType == BountyAllocationTypes.ToCustomer) {
                _checkBounties(customerInfo.toPromoter);
            } else if (rules.bountyAllocationType == BountyAllocationTypes.ToPromoter) {
                _checkBounties(customerInfo.toCustomer);
            }

            _checkBountiesPayment(customerInfo.toCustomer, rules);

            if (customerInfo.promoterReferralCode != bytes32(0)) {
                _checkBountiesPayment(customerInfo.toPromoter, rules);
            }
        }

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        customerInfo.paymentInUSDtoken,
                        customerInfo.toCustomer.spendBountyPercentage,
                        customerInfo.toCustomer.visitBountyAmount,
                        customerInfo.toPromoter.spendBountyPercentage,
                        customerInfo.toPromoter.visitBountyAmount,
                        customerInfo.customer,
                        customerInfo.venueToPayFor,
                        customerInfo.promoterReferralCode,
                        customerInfo.amount,
                        block.chainid
                    )
                ),
                customerInfo.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies promoter payout distribution payload.
    /// @dev Hash covers: `promoter`, `venue`, `amountInUSD`, and `chainId`.
    /// @param signer Authorized signer address.
    /// @param promoterInfo Payout details. Only the fields listed above are signed.
    function checkPromoterPaymentDistribution(address signer, PromoterInfo memory promoterInfo) external view {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        promoterInfo.promoterReferralCode, promoterInfo.venue, promoterInfo.amountInUSD, block.chainid
                    )
                ),
                promoterInfo.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies dynamic price mint parameters for a given receiver.
    /// @dev Hash covers: `receiver`, `tokenId`, `tokenUri`, `price`, and `chainId`.
    /// @param signer Authorized signer address.
    /// @param receiver Address that will receive the minted token(s).
    /// @param params Dynamic price payload.
    function checkDynamicPriceParameters(address signer, address receiver, DynamicPriceParameters calldata params)
        external
        view
    {
        require(
            signer.isValidSignatureNow(
                keccak256(abi.encodePacked(receiver, params.tokenId, params.tokenUri, params.price, block.chainid)),
                params.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies static price mint parameters for a given receiver.
    /// @dev Hash covers: `receiver`, `tokenId`, `tokenUri`, `whitelisted`, and `chainId`.
    /// @param signer Authorized signer address.
    /// @param receiver Address that will receive the minted token(s).
    /// @param params Static price payload.
    function checkStaticPriceParameters(address signer, address receiver, StaticPriceParameters calldata params)
        external
        view
    {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(receiver, params.tokenId, params.tokenUri, params.whitelisted, block.chainid)
                ),
                params.signature
            ),
            InvalidSignature()
        );
    }

    function _checkBounties(Bounties calldata bounties) internal pure {
        require(bounties.spendBountyPercentage == 0 && bounties.visitBountyAmount == 0, NoBountiesRelated());
    }

    function _checkBountiesPayment(Bounties calldata bounties, VenueRules memory rules) internal pure {
        BountyTypes bountyType = bounties.visitBountyAmount > 0 && bounties.spendBountyPercentage > 0
            ? BountyTypes.Both
            : bounties.visitBountyAmount > 0 && bounties.spendBountyPercentage == 0
                ? BountyTypes.VisitBounty
                : bounties.visitBountyAmount == 0 && bounties.spendBountyPercentage > 0
                    ? BountyTypes.SpendBounty
                    : BountyTypes.NoType;

        require(rules.bountyType == bountyType && bountyType != BountyTypes.NoType, WrongCustomerBountyType());
    }
}

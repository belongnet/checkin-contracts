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
/// - Uses `abi.encode` (not `abi.encodePacked`) for collision-safe hashing of multiple dynamic fields.
/// - Mint digests are bound to the specific verifying contract, include `nonce` and `deadline`,
///   and hash dynamic strings with `keccak256(bytes(...))` to avoid ambiguity.
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
    error EmptyReferralCode();

    error NoBountiesRelated();
    error NoBountyAllocationTypeSpecified();
    error WrongCustomerBountyType();

    /// @notice Thrown when a signed payload is past its deadline.
    error SignatureExpired();

    // ============================== Verifiers ==============================

    /// @notice Verifies AccessToken collection creation payload.
    /// @dev Hash covers: `name`, `symbol`, `contractURI`, `feeNumerator`, and `chainId`.
    ///      Uses `abi.encode` to prevent collisions on multiple dynamic fields.
    /// @param signer Authorized signer address.
    /// @param accessTokenInfo Payload to verify. Only the fields listed above are signed.
    function checkAccessTokenInfo(
        address signer,
        address verifyingContract,
        AccessTokenInfo memory accessTokenInfo,
        uint256 nonce,
        uint256 deadline
    ) external view {
        require(deadline >= block.timestamp, SignatureExpired());

        require(
            bytes(accessTokenInfo.metadata.name).length > 0 && bytes(accessTokenInfo.metadata.symbol).length > 0,
            EmptyMetadata(accessTokenInfo.metadata.name, accessTokenInfo.metadata.symbol)
        );

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        verifyingContract,
                        accessTokenInfo.metadata.name,
                        accessTokenInfo.metadata.symbol,
                        accessTokenInfo.contractURI,
                        accessTokenInfo.feeNumerator,
                        nonce,
                        deadline,
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
    ///      Uses `abi.encode` to avoid packed collisions.
    /// @param signer Authorized signer address.
    /// @param signature Detached signature validating `creditTokenInfo`.
    /// @param creditTokenInfo Payload. Only the fields listed above are signed.
    function checkCreditTokenInfo(
        address signer,
        address verifyingContract,
        ERC1155Info calldata creditTokenInfo,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external view {
        require(deadline >= block.timestamp, SignatureExpired());

        require(
            bytes(creditTokenInfo.name).length > 0 && bytes(creditTokenInfo.symbol).length > 0,
            EmptyMetadata(creditTokenInfo.name, creditTokenInfo.symbol)
        );

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        creditTokenInfo.name,
                        creditTokenInfo.symbol,
                        creditTokenInfo.uri,
                        nonce,
                        deadline,
                        block.chainid
                    )
                ),
                signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies VestingWallet deployment payload including owner and schedule parameters.
    /// @dev Hash covers: `owner`, `startTimestamp`, `cliffDurationSeconds`, `durationSeconds`,
    ///      `token`, `beneficiary`, `totalAllocation`, `tgeAmount`, `linearAllocation`, `description`, and `chainId`.
    ///      Uses `abi.encode` (not packed).
    /// @param signer Authorized signer address.
    /// @param vestingWalletInfo Full vesting schedule configuration and metadata.
    function checkVestingWalletInfo(
        address signer,
        address verifyingContract,
        address owner,
        VestingWalletInfo calldata vestingWalletInfo,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external view {
        require(deadline >= block.timestamp, SignatureExpired());

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        owner,
                        vestingWalletInfo.startTimestamp,
                        vestingWalletInfo.cliffDurationSeconds,
                        vestingWalletInfo.durationSeconds,
                        vestingWalletInfo.token,
                        vestingWalletInfo.beneficiary,
                        vestingWalletInfo.totalAllocation,
                        vestingWalletInfo.tgeAmount,
                        vestingWalletInfo.linearAllocation,
                        nonce,
                        deadline,
                        block.chainid
                    )
                ),
                signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies venue deposit intent and metadata.
    /// @dev Hash covers: `venue`, `referralCode`, `uri`, and `chainId`. Uses `abi.encode`.
    /// @param signer Authorized signer address.
    /// @param venueInfo Venue payload. Only the fields listed above are signed.
    function checkVenueInfo(address signer, address verifyingContract, VenueInfo calldata venueInfo) external view {
        require(venueInfo.deadline >= block.timestamp, SignatureExpired());

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        venueInfo.venue,
                        venueInfo.affiliateReferralCode,
                        venueInfo.uri,
                        venueInfo.nonce,
                        venueInfo.deadline,
                        block.chainid
                    )
                ),
                venueInfo.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies customer payment payload and enforces venue rule compatibility.
    /// @dev Hash covers: `paymentInUSDtoken`, `visitBountyAmount`, `spendBountyPercentage`,
    ///      `customer`, `venueToPayFor`, `promoter`, `amount`, and `chainId`. Uses `abi.encode`.
    /// @param signer Authorized signer address.
    /// @param customerInfo Customer payment data. Only the fields listed above are signed.
    /// @param rules Venue rules against which to validate payment and bounty types.
    function checkCustomerInfo(
        address signer,
        address verifyingContract,
        CustomerInfo calldata customerInfo,
        VenueRules memory rules
    ) external view {
        require(customerInfo.deadline >= block.timestamp, SignatureExpired());

        PaymentTypes paymentType = customerInfo.paymentInUSDtoken ? PaymentTypes.USDtoken : PaymentTypes.LONG;
        require(
            rules.paymentType != PaymentTypes.NoType
                && (rules.paymentType == PaymentTypes.Both || rules.paymentType == paymentType),
            WrongPaymentType()
        );
        if (rules.bountyType != BountyTypes.NoType) {
            if (rules.bountyAllocationType == BountyAllocationTypes.NoType) {
                revert NoBountyAllocationTypeSpecified();
            } else {
                if (
                    rules.bountyAllocationType == BountyAllocationTypes.ToCustomer
                        || rules.bountyAllocationType == BountyAllocationTypes.Both
                ) {
                    _checkBountiesPayment(customerInfo.toCustomer, rules);
                } else if (
                    rules.bountyAllocationType == BountyAllocationTypes.ToPromoter
                        || rules.bountyAllocationType == BountyAllocationTypes.Both
                ) {
                    require(customerInfo.promoterReferralCode != bytes32(0), EmptyReferralCode());

                    _checkBountiesPayment(customerInfo.toPromoter, rules);
                }
            }
        }

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        customerInfo.paymentInUSDtoken,
                        customerInfo.toCustomer.visitBountyAmount,
                        customerInfo.toCustomer.spendBountyPercentage,
                        customerInfo.toPromoter.visitBountyAmount,
                        customerInfo.toPromoter.spendBountyPercentage,
                        customerInfo.customer,
                        customerInfo.venueToPayFor,
                        customerInfo.promoterReferralCode,
                        customerInfo.amount,
                        customerInfo.nonce,
                        customerInfo.deadline,
                        block.chainid
                    )
                ),
                customerInfo.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies promoter payout distribution payload.
    /// @dev Hash covers: `promoter`, `venue`, `amountInUSD`, and `chainId`. Uses `abi.encode`.
    /// @param signer Authorized signer address.
    /// @param promoterInfo Payout details. Only the fields listed above are signed.
    function checkPromoterPaymentDistribution(
        address signer,
        address verifyingContract,
        PromoterInfo memory promoterInfo
    ) external view {
        require(promoterInfo.deadline >= block.timestamp, SignatureExpired());

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        promoterInfo.promoterReferralCode,
                        promoterInfo.venue,
                        promoterInfo.amountInUSD,
                        promoterInfo.nonce,
                        promoterInfo.deadline,
                        block.chainid
                    )
                ),
                promoterInfo.signature
            ),
            InvalidSignature()
        );
    }

    // ====================== Mints (Bound to verifying contract) ======================

    /// @notice Verifies dynamic price mint parameters for a given receiver.
    /// @dev Requires `block.timestamp <= params.deadline`.
    /// @param signer Authorized signer address.
    /// @param verifyingContract The contract address the signature is bound to (typically `address(this)`).
    /// @param receiver Address that will receive the minted token(s).
    /// @param params Dynamic price payload.
    function checkDynamicPriceParameters(
        address signer,
        address verifyingContract,
        address receiver,
        DynamicPriceParameters calldata params
    ) external view {
        require(params.deadline >= block.timestamp, SignatureExpired());

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        receiver,
                        params.tokenId,
                        params.tokenUri,
                        params.price,
                        params.nonce,
                        params.deadline,
                        block.chainid
                    )
                ),
                params.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies static price mint parameters for a given receiver.
    /// @dev Requires `block.timestamp <= params.deadline`.
    /// @param signer Authorized signer address.
    /// @param verifyingContract The contract address the signature is bound to (typically `address(this)`).
    /// @param receiver Address that will receive the minted token(s).
    /// @param params Static price payload.
    function checkStaticPriceParameters(
        address signer,
        address verifyingContract,
        address receiver,
        StaticPriceParameters calldata params
    ) external view {
        require(params.deadline >= block.timestamp, SignatureExpired());

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        receiver,
                        params.tokenId,
                        params.tokenUri,
                        params.whitelisted,
                        params.nonce,
                        params.deadline,
                        block.chainid
                    )
                ),
                params.signature
            ),
            InvalidSignature()
        );
    }

    // ============================== Helpers ==============================

    function _checkBountiesPayment(Bounties calldata bounties, VenueRules memory rules)
        internal
        pure
        returns (BountyTypes bountyType)
    {
        bountyType = bounties.visitBountyAmount > 0 && bounties.spendBountyPercentage > 0
            ? BountyTypes.Both
            : bounties.visitBountyAmount > 0 && bounties.spendBountyPercentage == 0
                ? BountyTypes.VisitBounty
                : bounties.visitBountyAmount == 0 && bounties.spendBountyPercentage > 0
                    ? BountyTypes.SpendBounty
                    : BountyTypes.NoType;

        require(rules.bountyType == bountyType, WrongCustomerBountyType());
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {AccessTokenInfo, ERC1155Info, VenueInfo, VenueRules, CustomerInfo, PromoterInfo, StaticPriceParameters, DynamicPriceParameters, PaymentTypes, BountyTypes} from "../Structures.sol";

/// @title SignatureVerifier
/// @notice Stateless helpers to verify backend-signed payloads for collection creation,
///         credit token creation, venue/customer/promoter actions, and mint parameter checks.
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

    // ============================== Verifiers ==============================

    /// @notice Verifies AccessToken collection creation payload.
    /// @param signer Authorized signer address.
    /// @param accessTokenInfo Payload to verify (name, symbol, contractURI, feeNumerator, signature).
    function checkAccessTokenInfo(
        address signer,
        AccessTokenInfo memory accessTokenInfo
    ) external view {
        require(
            bytes(accessTokenInfo.metadata.name).length > 0 &&
                bytes(accessTokenInfo.metadata.symbol).length > 0,
            EmptyMetadata(
                accessTokenInfo.metadata.name,
                accessTokenInfo.metadata.symbol
            )
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
    /// @param signer Authorized signer address.
    /// @param signature Detached signature validating `creditTokenInfo`.
    /// @param creditTokenInfo Payload (name, symbol, uri, roles).
    function checkCreditTokenInfo(
        address signer,
        bytes calldata signature,
        ERC1155Info calldata creditTokenInfo
    ) external view {
        require(
            bytes(creditTokenInfo.name).length > 0 &&
                bytes(creditTokenInfo.symbol).length > 0,
            EmptyMetadata(creditTokenInfo.name, creditTokenInfo.symbol)
        );

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        creditTokenInfo.name,
                        creditTokenInfo.symbol,
                        creditTokenInfo.uri,
                        block.chainid
                    )
                ),
                signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies venue deposit intent and parameters.
    /// @param signer Authorized signer address.
    /// @param venueInfo Venue payload (venue, referral, uri).
    function checkVenueInfo(
        address signer,
        VenueInfo calldata venueInfo
    ) external view {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        venueInfo.venue,
                        venueInfo.referralCode,
                        venueInfo.uri,
                        block.chainid
                    )
                ),
                venueInfo.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies customer payment payload and enforces venue rule compatibility.
    /// @param signer Authorized signer address.
    /// @param customerInfo Customer payment data (currency flags, bounties, actors, amount).
    /// @param rules Venue rules against which to validate payment/bounty types.
    function checkCustomerInfo(
        address signer,
        CustomerInfo calldata customerInfo,
        VenueRules memory rules
    ) external view {
        PaymentTypes paymentType = customerInfo.paymentInUSDC
            ? PaymentTypes.USDC
            : PaymentTypes.LONG;
        require(
            rules.paymentType != PaymentTypes.NoType &&
                (rules.paymentType == PaymentTypes.Both ||
                    rules.paymentType == paymentType),
            WrongPaymentType()
        );

        if (customerInfo.promoter != address(0)) {
            BountyTypes bountyType = customerInfo.visitBountyAmount > 0 &&
                customerInfo.spendBountyPercentage > 0
                ? BountyTypes.Both
                : customerInfo.visitBountyAmount > 0 &&
                    customerInfo.spendBountyPercentage == 0
                    ? BountyTypes.VisitBounty
                    : customerInfo.visitBountyAmount == 0 &&
                        customerInfo.spendBountyPercentage > 0
                        ? BountyTypes.SpendBounty
                        : BountyTypes.NoType;

            require(
                rules.bountyType == bountyType &&
                    bountyType != BountyTypes.NoType,
                WrongBountyType()
            );
        }

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        customerInfo.paymentInUSDC,
                        customerInfo.visitBountyAmount,
                        customerInfo.spendBountyPercentage,
                        customerInfo.customer,
                        customerInfo.venueToPayFor,
                        customerInfo.promoter,
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
    /// @param signer Authorized signer address.
    /// @param promoterInfo Payout details to be validated.
    function checkPromoterPaymentDistribution(
        address signer,
        PromoterInfo memory promoterInfo
    ) external view {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        promoterInfo.promoter,
                        promoterInfo.venue,
                        promoterInfo.amountInUSD,
                        block.chainid
                    )
                ),
                promoterInfo.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies dynamic price mint parameters for a given receiver.
    /// @param signer Authorized signer address.
    /// @param receiver Address that will receive the minted token(s).
    /// @param params Dynamic price payload (id, uri, price, signature).
    function checkDynamicPriceParameters(
        address signer,
        address receiver,
        DynamicPriceParameters calldata params
    ) external view {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        receiver,
                        params.tokenId,
                        params.tokenUri,
                        params.price,
                        block.chainid
                    )
                ),
                params.signature
            ),
            InvalidSignature()
        );
    }

    /// @notice Verifies static price mint parameters for a given receiver.
    /// @param signer Authorized signer address.
    /// @param receiver Address that will receive the minted token(s).
    /// @param params Static price payload (id, uri, whitelist flag, signature).
    function checkStaticPriceParameters(
        address signer,
        address receiver,
        StaticPriceParameters calldata params
    ) external view {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        receiver,
                        params.tokenId,
                        params.tokenUri,
                        params.whitelisted,
                        block.chainid
                    )
                ),
                params.signature
            ),
            InvalidSignature()
        );
    }
}

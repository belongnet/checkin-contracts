// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {AccessTokenInfo, ERC1155Info, VenueInfo, VenueRules, CustomerInfo, PromoterInfo, StaticPriceParameters, DynamicPriceParameters, PaymentTypes, BountyTypes} from "../Structures.sol";

// ========== Errors ==========

/// @notice Error thrown when the signature provided is invalid.
error InvalidSignature();

error EmptyMetadata(string name, string symbol);

error WrongPaymentType();

error WrongBountyType();

// ========== Library ==========

/// @title AddressHelper Library
/// @notice Provides helper functions to validate signatures for dynamic and static price parameters in NFT minting.
/// @dev This library relies on SignatureCheckerLib to verify the validity of a signature for provided parameters.
library SignatureVerifier {
    using SignatureCheckerLib for address;

    function checkAccessTokenInfo(
        address signer,
        AccessTokenInfo memory accessTokenInfo
    ) internal view {
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

    function checkCreditTokenInfo(
        address signer,
        bytes calldata signature,
        ERC1155Info calldata creditTokenInfo
    ) internal view {
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

    function checkVenueInfo(
        address signer,
        VenueInfo calldata venueInfo
    ) internal view {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        venueInfo.venue,
                        venueInfo.uri,
                        block.chainid
                    )
                ),
                venueInfo.signature
            ),
            InvalidSignature()
        );
    }

    function checkCustomerInfo(
        address signer,
        CustomerInfo calldata customerInfo,
        VenueRules memory rules
    ) internal view {
        // require(rules.paymentType != PaymentTypes.NoType && rules.bountyType != BountyTypes.NoType, NoTypesProvided());

        PaymentTypes paymentType = customerInfo.paymentInUSDC
            ? PaymentTypes.USDC
            : PaymentTypes.LONG;
        require(
            rules.paymentType != PaymentTypes.NoType &&
                (rules.paymentType == PaymentTypes.Both ||
                    rules.paymentType == paymentType),
            WrongPaymentType()
        );

        BountyTypes bountyType = customerInfo.visitBountyAmount > 0 &&
            customerInfo.spendBountyPercentage > 0
            ? BountyTypes.Both
            : customerInfo.visitBountyAmount > 0
                ? BountyTypes.VisitBounty
                : customerInfo.spendBountyPercentage > 0
                    ? BountyTypes.SpendBounty
                    : BountyTypes.NoType;
        require(rules.bountyType == bountyType, WrongBountyType());

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

    function checkPromoterPaymentDistribution(
        address signer,
        PromoterInfo memory promoterInfo
    ) internal view {
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

    /**
     * @notice Verifies the validity of a signature for dynamic price minting parameters.
     * @dev Encodes and hashes the dynamic price parameters, then verifies the signature against the expected signer.
     * @param signer The address expected to have signed the provided parameters.
     * @param params A struct containing parameters for dynamic price minting, including receiver, tokenId, tokenUri, price, and signature.
     * @custom:error InvalidSignature Thrown when the signature does not match the expected signer or encoded data.
     */
    function checkDynamicPriceParameters(
        address signer,
        address receiver,
        DynamicPriceParameters calldata params
    ) internal view {
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

    /**
     * @notice Verifies the validity of a signature for static price minting parameters.
     * @dev Encodes and hashes the static price parameters, then verifies the signature against the expected signer.
     * @param signer The address expected to have signed the provided parameters.
     * @param params A struct containing parameters for static price minting, including receiver, tokenId, tokenUri, whitelisted status, and signature.
     * @custom:error InvalidSignature Thrown when the signature does not match the expected signer or encoded data.
     */
    function checkStaticPriceParameters(
        address signer,
        address receiver,
        StaticPriceParameters calldata params
    ) internal view {
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

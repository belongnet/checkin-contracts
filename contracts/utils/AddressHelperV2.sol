// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {InstanceInfo, StaticPriceParameters, DynamicPriceParameters} from "../StructuresV2.sol";

// ========== Errors ==========

/// @notice Error thrown when the signature provided is invalid.
error InvalidSignature();

// ========== Library ==========

/// @title AddressHelper Library
/// @notice Provides helper functions to validate signatures for dynamic and static price parameters in NFT minting.
/// @dev This library relies on SignatureCheckerLib to verify the validity of a signature for provided parameters.
library AddressHelperV2 {
    using SignatureCheckerLib for address;

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

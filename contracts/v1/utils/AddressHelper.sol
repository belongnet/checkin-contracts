// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {InstanceInfo, StaticPriceParameters, DynamicPriceParameters} from "../Structures.sol";

// ========== Errors ==========

/// @notice Error thrown when the signature provided is invalid.
error InvalidSignature();

// ========== Library ==========

/// @title AddressHelper Library
/// @notice Provides helper functions to validate signatures for dynamic and static price parameters in NFT minting.
/// @dev This library relies on SignatureCheckerLib to verify the validity of a signature for provided parameters.
library AddressHelper {
    using SignatureCheckerLib for address;

    /**
     * @notice Verifies the validity of a signature for dynamic price minting parameters.
     * @dev Encodes and hashes the dynamic price parameters with the `receiver`, then verifies the signature.
     * @param signer The address expected to have signed the provided parameters.
     * @param receiver Address that will receive the minted token(s).
     * @param params Dynamic price parameters (tokenId, tokenUri, price, signature).
     * @custom:error InvalidSignature Thrown when the signature does not match the expected signer or encoded data.
     */
    function checkDynamicPriceParameters(address signer, address receiver, DynamicPriceParameters calldata params)
        internal
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

    /**
     * @notice Verifies the validity of a signature for static price minting parameters.
     * @dev Encodes and hashes the static price parameters with the `receiver`, then verifies the signature.
     * @param signer The address expected to have signed the provided parameters.
     * @param receiver Address that will receive the minted token(s).
     * @param params Static price parameters (tokenId, tokenUri, whitelisted, signature).
     * @custom:error InvalidSignature Thrown when the signature does not match the expected signer or encoded data.
     */
    function checkStaticPriceParameters(address signer, address receiver, StaticPriceParameters calldata params)
        internal
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
}

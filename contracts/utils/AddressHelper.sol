// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {InstanceInfo, StaticPriceParameters, DynamicPriceParameters} from "../Structures.sol";

/// @notice Error thrown when the signature provided is invalid.
error InvalidSignature();

library AddressHelper {
    using SignatureCheckerLib for address;

    function checkDynamicPriceParameters(
        address signer,
        DynamicPriceParameters calldata params
    ) internal {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        params.receiver,
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

    function checkStaticPriceParameters(
        address signer,
        StaticPriceParameters calldata params
    ) internal {
        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        params.receiver,
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

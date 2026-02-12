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
/// - Uses `abi.encode` for collision-safe hashing of multiple dynamic fields.
/// - Mint digests are bound to the specific verifying contract, include `nonce` and `deadline`,
///   and hash dynamic strings with `keccak256(bytes(...))` to avoid ambiguity.
/// - `nonce` is part of the signed digest, but this library does not store/consume nonces;
///   replay protection must be enforced by the integrating contract and/or backend policy.
library SignatureVerifier {
    using SignatureCheckerLib for address;

    struct SignatureProtection {
        /// @notice Arbitrary nonce included into the signed digest.
        /// @dev This value is not consumed or tracked by this library.
        uint256 nonce;
        /// @notice Signature validity deadline (unix timestamp, seconds).
        uint256 deadline;
        /// @notice ECDSA / ERC1271-compatible signature bytes.
        bytes signature;
    }

    uint256 private constant _SECP256K1N_HALF = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;
    bytes32 private constant _EIP2098_S_MASK = 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    // ============================== Errors ==============================

    /// @notice Thrown when a signature does not match the expected signer/payload.
    error InvalidSignature(bytes signature);

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
        SignatureProtection calldata protection,
        AccessTokenInfo calldata accessTokenInfo
    ) external view {
        _validateProtection(protection);

        require(
            bytes(accessTokenInfo.metadata.name).length > 0 && bytes(accessTokenInfo.metadata.symbol).length > 0,
            EmptyMetadata(accessTokenInfo.metadata.name, accessTokenInfo.metadata.symbol)
        );

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        protection.nonce,
                        protection.deadline,
                        block.chainid,
                        accessTokenInfo.creator,
                        accessTokenInfo.metadata.name,
                        accessTokenInfo.metadata.symbol,
                        accessTokenInfo.contractURI,
                        accessTokenInfo.feeNumerator
                    )
                ),
                protection.signature
            ),
            InvalidSignature(protection.signature)
        );
    }

    /// @notice Verifies CreditToken (ERC1155) collection creation payload.
    /// @dev Hash covers: `name`, `symbol`, `uri`, and `chainId`.
    ///      Uses `abi.encode` to avoid packed collisions.
    /// @param signer Authorized signer address.
    /// @param creditTokenInfo Payload. Only the fields listed above are signed.
    function checkCreditTokenInfo(
        address signer,
        address verifyingContract,
        SignatureProtection calldata protection,
        ERC1155Info calldata creditTokenInfo
    ) external view {
        _validateProtection(protection);

        require(
            bytes(creditTokenInfo.name).length > 0 && bytes(creditTokenInfo.symbol).length > 0,
            EmptyMetadata(creditTokenInfo.name, creditTokenInfo.symbol)
        );

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        protection.nonce,
                        protection.deadline,
                        block.chainid,
                        creditTokenInfo.name,
                        creditTokenInfo.symbol,
                        creditTokenInfo.uri
                    )
                ),
                protection.signature
            ),
            InvalidSignature(protection.signature)
        );
    }

    /// @notice Verifies VestingWallet deployment payload including owner and schedule parameters.
    /// @dev Hash covers: `owner`, `startTimestamp`, `cliffDurationSeconds`, `durationSeconds`,
    ///      `token`, `beneficiary`, `totalAllocation`, `tgeAmount`, `linearAllocation`, and `chainId`.
    ///      Uses `abi.encode` (not packed).
    ///      `vestingWalletInfo.description` is intentionally not part of the signed digest.
    /// @param signer Authorized signer address.
    /// @param verifyingContract Address expected in the signed payload.
    /// @param protection Signature payload with `nonce`, `deadline`, and signer signature.
    /// @param owner Intended vesting wallet owner.
    /// @param vestingWalletInfo Full vesting schedule configuration and metadata.
    function checkVestingWalletInfo(
        address signer,
        address verifyingContract,
        SignatureProtection calldata protection,
        address owner,
        VestingWalletInfo calldata vestingWalletInfo
    ) external view {
        _validateProtection(protection);

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        protection.nonce,
                        protection.deadline,
                        block.chainid,
                        owner,
                        vestingWalletInfo.startTimestamp,
                        vestingWalletInfo.cliffDurationSeconds,
                        vestingWalletInfo.durationSeconds,
                        vestingWalletInfo.token,
                        vestingWalletInfo.beneficiary,
                        vestingWalletInfo.totalAllocation,
                        vestingWalletInfo.tgeAmount,
                        vestingWalletInfo.linearAllocation
                    )
                ),
                protection.signature
            ),
            InvalidSignature(protection.signature)
        );
    }

    /// @notice Verifies venue deposit intent and metadata.
    /// @dev Hash covers: `venue`, `referralCode`, `uri`, and `chainId`. Uses `abi.encode`.
    /// @param signer Authorized signer address.
    /// @param venueInfo Venue payload. Only the fields listed above are signed.
    function checkVenueInfo(
        address signer,
        address verifyingContract,
        SignatureProtection calldata protection,
        VenueInfo calldata venueInfo
    ) external view {
        _validateProtection(protection);

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        protection.nonce,
                        protection.deadline,
                        block.chainid,
                        venueInfo.venue,
                        venueInfo.affiliateReferralCode,
                        venueInfo.uri
                    )
                ),
                protection.signature
            ),
            InvalidSignature(protection.signature)
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
        SignatureProtection calldata protection,
        CustomerInfo calldata customerInfo,
        VenueRules calldata rules
    ) external view {
        _validateProtection(protection);

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
                        protection.nonce,
                        protection.deadline,
                        block.chainid,
                        rules.bountyType,
                        rules.bountyAllocationType,
                        customerInfo.paymentInUSDtoken,
                        _encodeBounties(customerInfo.toCustomer),
                        _encodeBounties(customerInfo.toPromoter),
                        customerInfo.customer,
                        customerInfo.venueToPayFor,
                        customerInfo.promoterReferralCode,
                        customerInfo.amount
                    )
                ),
                protection.signature
            ),
            InvalidSignature(protection.signature)
        );
    }

    function _encodeBounties(Bounties calldata bounties) internal view returns (bytes memory) {
        return abi.encode(bounties.visitBountyAmount, bounties.spendBountyPercentage);
    }

    /// @notice Verifies promoter payout distribution payload.
    /// @dev Hash covers: `promoter`, `venue`, `amountInUSD`, and `chainId`. Uses `abi.encode`.
    /// @param signer Authorized signer address.
    /// @param promoterInfo Payout details. Only the fields listed above are signed.
    function checkPromoterPaymentDistribution(
        address signer,
        address verifyingContract,
        SignatureProtection calldata protection,
        PromoterInfo calldata promoterInfo
    ) external view {
        _validateProtection(protection);

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        protection.nonce,
                        protection.deadline,
                        block.chainid,
                        promoterInfo.promoterReferralCode,
                        promoterInfo.venue,
                        promoterInfo.amountInUSD
                    )
                ),
                protection.signature
            ),
            InvalidSignature(protection.signature)
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
        SignatureProtection calldata protection,
        address receiver,
        DynamicPriceParameters calldata params
    ) external view {
        _validateProtection(protection);

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        protection.nonce,
                        protection.deadline,
                        block.chainid,
                        receiver,
                        params.tokenId,
                        params.tokenUri,
                        params.price
                    )
                ),
                protection.signature
            ),
            InvalidSignature(protection.signature)
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
        SignatureProtection calldata protection,
        address receiver,
        StaticPriceParameters calldata params
    ) internal view {
        _validateProtection(protection);

        require(
            signer.isValidSignatureNow(
                keccak256(
                    abi.encode(
                        verifyingContract,
                        protection.nonce,
                        protection.deadline,
                        block.chainid,
                        receiver,
                        params.tokenId,
                        params.tokenUri,
                        params.whitelisted
                    )
                ),
                protection.signature
            ),
            InvalidSignature(protection.signature)
        );
    }

    // ============================== Helpers ==============================

    function _checkBountiesPayment(Bounties calldata bounties, VenueRules calldata rules)
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

    function _validateProtection(SignatureProtection calldata protection) private view {
        if (protection.deadline < block.timestamp) {
            revert SignatureExpired();
        }
        _enforceCanonicalSignature(protection.signature);
    }

    function _enforceCanonicalSignature(bytes memory signature) private pure {
        uint256 signatureLength = signature.length;
        if (signatureLength != 64 && signatureLength != 65) {
            revert InvalidSignature(signature);
        }
        if (signatureLength == 65) {
            bytes32 s;
            uint8 v;
            assembly {
                s := mload(add(signature, 0x40))
                v := byte(0, mload(add(signature, 0x60)))
            }

            if (uint256(s) > _SECP256K1N_HALF || (v != 27 && v != 28)) {
                revert InvalidSignature(signature);
            }
        } else if (signatureLength == 64) {
            bytes32 vs;
            assembly {
                vs := mload(add(signature, 0x40))
            }

            uint256 s = uint256(vs & _EIP2098_S_MASK);
            if (s > _SECP256K1N_HALF) {
                revert InvalidSignature(signature);
            }

            uint256 vBit = uint256(vs >> 255);
            if (vBit > 1) {
                revert InvalidSignature(signature);
            }
        }
        // For ERC1271 signatures (arbitrary length), defer validity checks to the target contract.
    }
}

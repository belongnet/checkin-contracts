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
/// - Every digest starts with a message-kind type hash, so a signature issued for one kind of action
///   can never be accepted for another (for example a static-price mint as a dynamic-price mint).
/// - Every digest is bound to the verifying contract and includes `nonce` and `deadline`.
/// - Payload structs are encoded whole (`abi.encode(struct)`), so every field of the payload is signed.
/// - This library is stateless. The Factory and BelongCheckIn verifiers return the verified digest so that
///   the integrating contract can record it and reject a second use (`usedSignatures`).
library SignatureVerifier {
    using SignatureCheckerLib for address;

    struct SignatureProtection {
        /// @notice Arbitrary nonce included into the signed digest.
        /// @dev Not tracked by this library; it makes otherwise identical payloads produce distinct digests.
        uint256 nonce;
        /// @notice Signature validity deadline (unix timestamp, seconds).
        uint256 deadline;
        /// @notice ECDSA / ERC1271-compatible signature bytes.
        bytes signature;
    }

    uint256 private constant _SECP256K1N_HALF = 0x7fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a0;
    bytes32 private constant _EIP2098_S_MASK = 0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff;

    // ============================== Message kinds ==============================

    /// @notice First word of an AccessToken creation digest.
    bytes32 internal constant ACCESS_TOKEN_INFO_TYPEHASH = keccak256("Belong.SignatureVerifier.v2.AccessTokenInfo");
    /// @notice First word of a CreditToken creation digest.
    bytes32 internal constant CREDIT_TOKEN_INFO_TYPEHASH = keccak256("Belong.SignatureVerifier.v2.CreditTokenInfo");
    /// @notice First word of a VestingWallet deployment digest.
    bytes32 internal constant VESTING_WALLET_INFO_TYPEHASH =
        keccak256("Belong.SignatureVerifier.v2.VestingWalletInfo");
    /// @notice First word of a venue deposit digest.
    bytes32 internal constant VENUE_INFO_TYPEHASH = keccak256("Belong.SignatureVerifier.v2.VenueInfo");
    /// @notice First word of a customer payment digest.
    bytes32 internal constant CUSTOMER_INFO_TYPEHASH = keccak256("Belong.SignatureVerifier.v2.CustomerInfo");
    /// @notice First word of a promoter payout digest.
    bytes32 internal constant PROMOTER_INFO_TYPEHASH = keccak256("Belong.SignatureVerifier.v2.PromoterInfo");
    /// @notice First word of a static-price mint digest.
    bytes32 internal constant STATIC_PRICE_MINT_TYPEHASH = keccak256("Belong.SignatureVerifier.v2.StaticPriceMint");
    /// @notice First word of a dynamic-price mint digest.
    bytes32 internal constant DYNAMIC_PRICE_MINT_TYPEHASH =
        keccak256("Belong.SignatureVerifier.v2.DynamicPriceMint");

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

    /// @notice Verifies an AccessToken collection creation payload.
    /// @dev Signed digest:
    ///      `keccak256(abi.encode(ACCESS_TOKEN_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
    ///      accessTokenInfo, referralCode))`.
    ///      The whole `AccessTokenInfo` struct is encoded, so the creator, payment token, royalty, transferability,
    ///      supply cap, prices, metadata and contract URI are all bound, together with the referral code.
    /// @param signer Authorized signer address.
    /// @param verifyingContract The contract address the signature is bound to (typically `address(this)`).
    /// @param protection Signature payload with `nonce`, `deadline`, and signer signature.
    /// @param accessTokenInfo Payload to verify, exactly as supplied by the caller.
    /// @param referralCode Referral code the collection is created with (zero when none).
    /// @return digest The verified digest, so the caller can record it as used.
    function checkAccessTokenInfo(
        address signer,
        address verifyingContract,
        SignatureProtection calldata protection,
        AccessTokenInfo calldata accessTokenInfo,
        bytes32 referralCode
    ) external view returns (bytes32 digest) {
        _validateProtection(protection);

        require(
            bytes(accessTokenInfo.metadata.name).length > 0 && bytes(accessTokenInfo.metadata.symbol).length > 0,
            EmptyMetadata(accessTokenInfo.metadata.name, accessTokenInfo.metadata.symbol)
        );

        digest = keccak256(
            abi.encode(
                ACCESS_TOKEN_INFO_TYPEHASH,
                verifyingContract,
                protection.nonce,
                protection.deadline,
                block.chainid,
                accessTokenInfo,
                referralCode
            )
        );
        _requireValidSignature(signer, digest, protection.signature);
    }

    /// @notice Verifies a CreditToken (ERC1155) collection creation payload.
    /// @dev Signed digest:
    ///      `keccak256(abi.encode(CREDIT_TOKEN_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
    ///      creditTokenInfo))`.
    ///      The whole `ERC1155Info` struct is encoded, so the admin, manager, minter and burner addresses and the
    ///      transferability flag are bound together with the name, symbol and URI.
    /// @param signer Authorized signer address.
    /// @param verifyingContract The contract address the signature is bound to (typically `address(this)`).
    /// @param protection Signature payload with `nonce`, `deadline`, and signer signature.
    /// @param creditTokenInfo Payload to verify, exactly as supplied by the caller.
    /// @return digest The verified digest, so the caller can record it as used.
    function checkCreditTokenInfo(
        address signer,
        address verifyingContract,
        SignatureProtection calldata protection,
        ERC1155Info calldata creditTokenInfo
    ) external view returns (bytes32 digest) {
        _validateProtection(protection);

        require(
            bytes(creditTokenInfo.name).length > 0 && bytes(creditTokenInfo.symbol).length > 0,
            EmptyMetadata(creditTokenInfo.name, creditTokenInfo.symbol)
        );

        digest = keccak256(
            abi.encode(
                CREDIT_TOKEN_INFO_TYPEHASH,
                verifyingContract,
                protection.nonce,
                protection.deadline,
                block.chainid,
                creditTokenInfo
            )
        );
        _requireValidSignature(signer, digest, protection.signature);
    }

    /// @notice Verifies a VestingWallet deployment payload including owner, schedule and initial funding.
    /// @dev Signed digest:
    ///      `keccak256(abi.encode(VESTING_WALLET_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
    ///      owner, vestingWalletInfo, initialFunding))`.
    ///      The whole `VestingWalletInfo` struct is encoded (description included), together with the amount the
    ///      caller funds the wallet with on deployment. A signature therefore authorizes one exact deployment and
    ///      cannot be spent by a third party on an unfunded or relabelled wallet.
    /// @param signer Authorized signer address.
    /// @param verifyingContract The contract address the signature is bound to (typically `address(this)`).
    /// @param protection Signature payload with `nonce`, `deadline`, and signer signature.
    /// @param owner Intended vesting wallet owner.
    /// @param vestingWalletInfo Full vesting schedule configuration and metadata, exactly as supplied by the caller.
    /// @param initialFunding Amount transferred from the caller to the wallet on deployment.
    /// @return digest The verified digest, so the caller can record it as used.
    function checkVestingWalletInfo(
        address signer,
        address verifyingContract,
        SignatureProtection calldata protection,
        address owner,
        VestingWalletInfo calldata vestingWalletInfo,
        uint256 initialFunding
    ) external view returns (bytes32 digest) {
        _validateProtection(protection);

        digest = keccak256(
            abi.encode(
                VESTING_WALLET_INFO_TYPEHASH,
                verifyingContract,
                protection.nonce,
                protection.deadline,
                block.chainid,
                owner,
                vestingWalletInfo,
                initialFunding
            )
        );
        _requireValidSignature(signer, digest, protection.signature);
    }

    /// @notice Verifies a venue deposit payload.
    /// @dev Signed digest:
    ///      `keccak256(abi.encode(VENUE_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid, venueInfo))`.
    ///      The whole `VenueInfo` struct is encoded, so the venue, deposit amount, venue rules, affiliate referral
    ///      code and URI are all bound.
    /// @param signer Authorized signer address.
    /// @param verifyingContract The contract address the signature is bound to (typically `address(this)`).
    /// @param protection Signature payload with `nonce`, `deadline`, and signer signature.
    /// @param venueInfo Venue payload, exactly as supplied by the caller.
    /// @return digest The verified digest, so the caller can record it as used.
    function checkVenueInfo(
        address signer,
        address verifyingContract,
        SignatureProtection calldata protection,
        VenueInfo calldata venueInfo
    ) external view returns (bytes32 digest) {
        _validateProtection(protection);

        digest = keccak256(
            abi.encode(
                VENUE_INFO_TYPEHASH, verifyingContract, protection.nonce, protection.deadline, block.chainid, venueInfo
            )
        );
        _requireValidSignature(signer, digest, protection.signature);
    }

    /// @notice Verifies a customer payment payload and enforces venue rule compatibility.
    /// @dev Signed digest:
    ///      `keccak256(abi.encode(CUSTOMER_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
    ///      rules.bountyType, rules.bountyAllocationType, customerInfo))`.
    ///      The whole `CustomerInfo` struct is encoded, and the venue's current bounty rules are bound as well, so a
    ///      signature stops being valid when the venue changes those rules.
    /// @param signer Authorized signer address.
    /// @param verifyingContract The contract address the signature is bound to (typically `address(this)`).
    /// @param protection Signature payload with `nonce`, `deadline`, and signer signature.
    /// @param customerInfo Customer payment data, exactly as supplied by the caller.
    /// @param rules Venue rules against which to validate payment and bounty types.
    /// @return digest The verified digest, so the caller can record it as used.
    function checkCustomerInfo(
        address signer,
        address verifyingContract,
        SignatureProtection calldata protection,
        CustomerInfo calldata customerInfo,
        VenueRules calldata rules
    ) external view returns (bytes32 digest) {
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

        digest = keccak256(
            abi.encode(
                CUSTOMER_INFO_TYPEHASH,
                verifyingContract,
                protection.nonce,
                protection.deadline,
                block.chainid,
                rules.bountyType,
                rules.bountyAllocationType,
                customerInfo
            )
        );
        _requireValidSignature(signer, digest, protection.signature);
    }

    /// @notice Verifies a promoter payout distribution payload.
    /// @dev Signed digest:
    ///      `keccak256(abi.encode(PROMOTER_INFO_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
    ///      promoterInfo))`.
    ///      The whole `PromoterInfo` struct is encoded, so the payout currency flag is bound together with the
    ///      promoter referral code, venue and amount.
    /// @param signer Authorized signer address.
    /// @param verifyingContract The contract address the signature is bound to (typically `address(this)`).
    /// @param protection Signature payload with `nonce`, `deadline`, and signer signature.
    /// @param promoterInfo Payout details, exactly as supplied by the caller.
    /// @return digest The verified digest, so the caller can record it as used.
    function checkPromoterPaymentDistribution(
        address signer,
        address verifyingContract,
        SignatureProtection calldata protection,
        PromoterInfo calldata promoterInfo
    ) external view returns (bytes32 digest) {
        _validateProtection(protection);

        digest = keccak256(
            abi.encode(
                PROMOTER_INFO_TYPEHASH,
                verifyingContract,
                protection.nonce,
                protection.deadline,
                block.chainid,
                promoterInfo
            )
        );
        _requireValidSignature(signer, digest, protection.signature);
    }

    // ====================== Mints (Bound to verifying contract) ======================

    /// @notice Verifies dynamic price mint parameters for a given receiver.
    /// @dev Signed digest:
    ///      `keccak256(abi.encode(DYNAMIC_PRICE_MINT_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
    ///      receiver, tokenId, tokenUri, price))`.
    ///      The type hash keeps this digest distinct from a static-price mint digest, whose last word is a boolean.
    /// @param signer Authorized signer address.
    /// @param verifyingContract The contract address the signature is bound to (typically `address(this)`).
    /// @param protection Signature payload with `nonce`, `deadline`, and signer signature.
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

        _requireValidSignature(
            signer,
            keccak256(
                abi.encode(
                    DYNAMIC_PRICE_MINT_TYPEHASH,
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
        );
    }

    /// @notice Verifies static price mint parameters for a given receiver.
    /// @dev Signed digest:
    ///      `keccak256(abi.encode(STATIC_PRICE_MINT_TYPEHASH, verifyingContract, nonce, deadline, block.chainid,
    ///      receiver, tokenId, tokenUri, whitelisted))`.
    /// @param signer Authorized signer address.
    /// @param verifyingContract The contract address the signature is bound to (typically `address(this)`).
    /// @param protection Signature payload with `nonce`, `deadline`, and signer signature.
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

        _requireValidSignature(
            signer,
            keccak256(
                abi.encode(
                    STATIC_PRICE_MINT_TYPEHASH,
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

    /// @dev Reverts with `InvalidSignature` unless `signature` is `signer`'s signature over `digest`.
    function _requireValidSignature(address signer, bytes32 digest, bytes calldata signature) private view {
        require(signer.isValidSignatureNow(digest, signature), InvalidSignature(signature));
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

// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

/**
 * @title Referral System Contract
 * @notice Provides referral system functionality, including creating referral codes, setting users, and managing referral percentages.
 * @dev This abstract contract allows contracts that inherit it to implement referral code-based rewards and tracking.
 */
abstract contract ReferralSystemV2 {
    // ========== Errors ==========

    /// @notice Error thrown when a referral code already exists for the creator.
    /// @param referralCreator The address of the creator who already has a referral code.
    /// @param hashedCode The existing referral code.
    error ReferralCodeExists(address referralCreator, bytes32 hashedCode);

    /// @notice Error thrown when a user tries to add themselves as their own referrer, or
    /// thrown when a referral code is used that does not have an owner.
    error ReferralCreatorNotExists();
    error ReferralUserIsReferralCreator();

    /// @notice Error thrown when a user attempts to get a referral rate for a code they haven't used.
    /// @param referralUser The address of the user who did not use the code.
    /// @param code The referral code the user has not used.
    error ReferralCodeNotUsedByUser(address referralUser, bytes32 code);

    error PercentageExceedsMax(uint16 percentage);

    // ========== Events ==========

    /// @notice Emitted when referral percentages are set.
    /// @param percentages The new referral percentages.
    event ReferralParametersSet(uint16[5] percentages);

    /// @notice Emitted when a new referral code is created.
    /// @param createdBy The address that created the referral code.
    /// @param code The created referral code.
    event ReferralCodeCreated(address indexed createdBy, bytes32 indexed code);

    /// @notice Emitted when a referral code is used.
    /// @param code The referral code that was used.
    /// @param usedBy The address that used the referral code.
    event ReferralCodeUsed(bytes32 indexed code, address indexed usedBy);

    /// @notice Struct for managing a referral code and its users.
    struct ReferralCode {
        /// @notice The creator of the referral code.
        address creator;
        /// @notice The list of users who have used the referral code.
        address[] referralUsers;
    }

    // ========== Constants ==========

    /// @notice The scaling factor for referral percentages.
    uint16 public constant SCALING_FACTOR = 10000;
    uint8 public constant MAX_TIER_INDEX = 4; // tiers: 0..4

    // ========== State Variables ==========

    /// @notice Maps the number of times a referral code was used to the corresponding percentage.
    uint16[5] public usedToPercentage;

    /// @notice Maps referral codes to their respective details (creator and users).
    mapping(bytes32 code => ReferralCode referralCode) internal referrals;

    /// @notice Maps referral users to their respective used codes and counts the number of times the code was used.
    mapping(address referralUser => mapping(bytes32 code => uint8 timesUsed)) public usedCode;

    // ========== Functions ==========

    /**
     * @notice Creates a new referral code for the caller.
     * @dev The referral code is a hash of the caller's address.
     * @return hashedCode The created referral code.
     */
    function createReferralCode() external returns (bytes32 hashedCode) {
        hashedCode = keccak256(abi.encodePacked(msg.sender, address(this), block.chainid));

        ReferralCode storage referral = referrals[hashedCode];
        require(referral.creator == address(0), ReferralCodeExists(msg.sender, hashedCode));

        referral.creator = msg.sender;

        emit ReferralCodeCreated(msg.sender, hashedCode);
    }

    /**
     * @notice Returns the referral rate for a user and code, based on the number of times the code was used.
     */
    function getReferralRate(address referralUser, bytes32 code, uint256 amount) public view returns (uint256 rate) {
        uint8 used = usedCode[referralUser][code];
        require(used > 0, ReferralCodeNotUsedByUser(referralUser, code));

        return calculateRate(amount, usedToPercentage[used]);
    }

    /// @notice Calculates `percentage` of `amount` using BPS scaling (10_000 == 100%).
    /// @param amount Base amount.
    /// @param percentage Percentage in BPS.
    /// @return rate Calculated portion of the amount.
    function calculateRate(uint256 amount, uint256 percentage) public pure returns (uint256 rate) {
        rate = (amount * percentage) / SCALING_FACTOR;
    }

    /// @notice Computes the deterministic referral code for a creator address.
    /// @param creator Creator address.
    /// @return The keccak256 hash used as a referral code.
    function getReferralCodeByCreator(address creator) public view returns (bytes32) {
        return keccak256(abi.encodePacked(creator, address(this), block.chainid));
    }

    /**
     * @notice Returns the creator of a given referral code.
     * @param code The referral code to get the creator for.
     * @return The address of the creator associated with the referral code.
     */
    function getReferralCreator(bytes32 code) public view returns (address) {
        return referrals[code].creator;
    }

    /**
     * @notice Returns the list of users who used a given referral code.
     * @param code The referral code to get the users for.
     * @return An array of addresses that used the referral code.
     */
    function getReferralUsers(bytes32 code) external view returns (address[] memory) {
        return referrals[code].referralUsers;
    }

    /**
     * @notice Sets a referral user for a given referral code.
     * @dev Internal function that tracks how many times the user has used the code.
     * @param hashedCode The referral code.
     * @param referralUser The address of the user being referred.
     */
    function _setReferralUser(bytes32 hashedCode, address referralUser) internal {
        if (hashedCode == bytes32(0)) return;
        ReferralCode storage referral = referrals[hashedCode];
        address creator = referral.creator;

        require(creator != address(0), ReferralCreatorNotExists());
        require(referralUser != creator, ReferralUserIsReferralCreator());

        // Check if the user is already in the array
        address[] storage users = referral.referralUsers;

        bool inArray;
        uint256 len = users.length;
        for (uint256 i; i < len; ++i) {
            if (users[i] == referralUser) {
                // User already added; no need to add again
                inArray = true;
                break;
            }
        }
        if (!inArray) users.push(referralUser);

        uint8 used = usedCode[referralUser][hashedCode];
        if (used < MAX_TIER_INDEX) {
            unchecked {
                usedCode[referralUser][hashedCode] = used + 1;
            }
        }

        emit ReferralCodeUsed(hashedCode, referralUser);
    }

    function _setReferralParameters(uint16[5] calldata percentages) internal {
        for (uint256 i; i < percentages.length; ++i) {
            require(percentages[i] <= SCALING_FACTOR, PercentageExceedsMax(percentages[i]));
            usedToPercentage[i] = percentages[i];
        }

        emit ReferralParametersSet(percentages);
    }

    // ========== Reserved Storage Space ==========

    /// @dev Reserved storage space to allow for layout changes in the future.
    uint256[50] private __gap;
}

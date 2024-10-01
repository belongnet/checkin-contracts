// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ReferralPercentages, ReferralCode} from "../Structures.sol";

error ReferralCodeExists(address referralcreator, bytes32 hashedCode);
error ReferralCodeUserExists(address referralUser);
error ReferralCodeOwnerNotExist();
error CanNotAddAsReferrerOurself();

abstract contract ReferralSystem {
    event PercentagesSet(ReferralPercentages percentages);
    event ReferralCodeCreated(address indexed createdBy, bytes32 indexed code);
    event ReferreralCodeUsed(bytes32 indexed code, address indexed usedBy);

    uint256 public constant SCALING_FACTOR = 10000;

    mapping(uint256 timesUsed => uint256 percentage) public usedToPercentage;

    mapping(bytes32 code => ReferralCode referralCode) public referrals;

    mapping(address referralUser => mapping(bytes32 code => uint256 timesUsed))
        public usedCode;

    function createReferralCode() public returns (bytes32 hashedCode) {
        hashedCode = keccak256(abi.encodePacked(msg.sender));

        require(
            referrals[hashedCode].creator == address(0),
            ReferralCodeExists(msg.sender, hashedCode)
        );

        referrals[hashedCode].creator = msg.sender;

        emit ReferralCodeCreated(msg.sender, hashedCode);
    }

    function _setReferralUser(
        bytes32 hashedCode,
        address referralUser
    ) internal {
        if (hashedCode == bytes32(0)) {
            return;
        }

        require(
            referralUser != referrals[hashedCode].creator,
            CanNotAddAsReferrerOurself()
        );

        if (usedCode[referralUser][hashedCode] < 3) {
            ++usedCode[referralUser][hashedCode];
        } else {
            usedCode[referralUser][hashedCode] = 4;
        }

        referrals[hashedCode].referralUsers.push(referralUser);

        emit ReferreralCodeUsed(hashedCode, referralUser);
    }

    function _setReferralPercentages(
        ReferralPercentages memory percentages
    ) internal {
        usedToPercentage[1] = percentages.initial;
        usedToPercentage[2] = percentages.second;
        usedToPercentage[3] = percentages.third;
        usedToPercentage[4] = percentages.byDefault;

        emit PercentagesSet(percentages);
    }

    function _checkReferralCode(bytes32 hashedCode) internal view {
        if (hashedCode == bytes32(0)) {
            return;
        }

        require(
            referrals[hashedCode].creator != address(0),
            ReferralCodeOwnerNotExist()
        );
    }

    function getReferralRate(
        address referralUser,
        bytes32 code,
        uint256 amount
    ) external view returns (uint256) {
        return
            (amount * usedToPercentage[usedCode[referralUser][code]]) /
            SCALING_FACTOR;
    }

    function getReferralCreator(bytes32 code) external view returns (address) {
        return referrals[code].creator;
    }

    function getReferralUsers(
        bytes32 code
    ) external view returns (address[] memory) {
        return referrals[code].referralUsers;
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private __gap;
}

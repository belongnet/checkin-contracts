// SPDX-License-Identifier: MIT
pragma solidity 0.8.27;

import {ReferralPercentages} from "../Structures.sol";

error ReferralCodeExists(address referralCodeCreator, bytes32 hashedCode);
error ReferralCodeUserExists(address referralUser);
error ReferralCodeUserAddressZero();
error ReferralCodeOwnerNotExist();
error CanNotAddAsReferrerOurself();

abstract contract ReferralSystem {
    event PercentagesSet(ReferralPercentages percentages);
    event ReferralCodeCreated(address indexed createdBy, bytes32 indexed code);
    event ReferreralCodeUsed(bytes32 indexed code, address indexed usedBy);

    uint256 public constant SCALING_FACTOR = 10000;

    mapping(uint256 timesUsed => uint256 percentage) public usedToPercentage;

    mapping(bytes32 code => address codeCreator) public referralCreators;
    mapping(bytes32 code => address[] referralUser) public referralUsers;

    mapping(address referralUser => mapping(bytes32 code => uint256 timesUsed))
        public usedCode;

    function _createReferralCode() internal returns (bytes32 hashedCode) {
        hashedCode = keccak256(abi.encodePacked(msg.sender));
        address codeCreator = referralCreators[hashedCode];

        require(
            codeCreator == address(0),
            ReferralCodeExists(msg.sender, hashedCode)
        );

        referralCreators[hashedCode] = msg.sender;

        emit ReferralCodeCreated(msg.sender, hashedCode);
    }

    function _setReferral(bytes32 hashedCode, address referralUser) internal {
        if (hashedCode == bytes32(0)) {
            return;
        }

        require(referralUser != address(0), ReferralCodeUserAddressZero());

        require(
            referralUser != referralCreators[hashedCode],
            CanNotAddAsReferrerOurself()
        );

        if (usedCode[referralUser][hashedCode] < 3) {
            ++usedCode[referralUser][hashedCode];
        } else {
            usedCode[referralUser][hashedCode] = 0;
        }

        referralUsers[hashedCode].push(referralUser);

        emit ReferreralCodeUsed(hashedCode, referralUser);
    }

    function _setReferralPercentages(
        ReferralPercentages memory percentages
    ) internal {
        usedToPercentage[1] = percentages.initial;
        usedToPercentage[2] = percentages.second;
        usedToPercentage[3] = percentages.third;
        usedToPercentage[0] = percentages.byDefault;

        emit PercentagesSet(percentages);
    }

    function _checkReferralCode(bytes32 hashedCode) internal view {
        if (hashedCode == bytes32(0)) {
            return;
        }

        require(
            referralCreators[hashedCode] != address(0),
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

    function getReferralReceiver(bytes32 code) external view returns (address) {
        return referralCreators[code];
    }

    // Reserved storage space to allow for layout changes in the future.
    uint256[50] private __gap;
}

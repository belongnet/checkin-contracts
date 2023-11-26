
pragma solidity ^0.8.0;

contract ReferralManager {
    mapping(address => address) public referrers;

    event ReferrerAssigned(address indexed organizer, address indexed referrer);

    function setReferrer(address organizer, address referrer) external {
        require(referrers[organizer] == address(0), "Organizer already has a referrer");
        referrers[organizer] = referrer;
        emit ReferrerAssigned(organizer, referrer);
    }

    function getReferrer(address organizer) external view returns (address) {
        return referrers[organizer];
    }
}

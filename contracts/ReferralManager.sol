// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title ReferralManager
 * @dev Manages referral relationships between organizers and referrers.
 */
contract ReferralManager {
    mapping(address => address) public referrers;
    address private platformAdmin; // This address represents the platform admin authorized to set referrers.

    event ReferrerAssigned(address indexed organizer, address indexed referrer);

    constructor(address _platformAdmin) {
        require(_platformAdmin != address(0), "Platform admin address cannot be the zero address");
        platformAdmin = _platformAdmin;
    }

    modifier onlyPlatformAdmin() {
        require(msg.sender == platformAdmin, "Only the platform admin can perform this action");
        _;
    }

    /**
     * @dev Sets a referrer for an organizer. Only the platform admin can set a referrer.
     * @param organizer The address of the organizer.
     * @param referrer The address of the referrer.
     */
    function setReferrer(address organizer, address referrer) external onlyPlatformAdmin {
        require(organizer != referrer, "Organizer cannot refer themselves");
        require(referrers[organizer] == address(0), "Organizer already has a referrer");
        referrers[organizer] = referrer;
        emit ReferrerAssigned(organizer, referrer);
    }

    /**
     * @dev Retrieves the referrer for an organizer.
     * @param organizer The address of the organizer.
     * @return The address of the referrer.
     */
    function getReferrer(address organizer) external view returns (address) {
        return referrers[organizer];
```diff
@@ -37,10 +37,6 @@
     }
 
     /**
-     * @dev Retrieves the referrer for an organizer.
-     * @param organizer The address of the organizer.
-     * @return The address of the referrer.
-     */
-    function getReferrer(address organizer) external view returns (address) {
-        return referrers[organizer];
-    }
+    // Removed getReferrer function as the referrers mapping already provides a getter.
 }
}

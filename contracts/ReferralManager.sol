
pragma solidity ^0.8.0;

contract ReferralManager {
@@ -14,5 +14,0 @@
-    function getReferrer(address organizer) external view returns (address) {
-        return referrers[organizer];
-    }
-}

    event ReferrerAssigned(address indexed organizer, address indexed referrer);

    function setReferrer(address organizer, address referrer) external {
       require(organizer != referrer, "Organizer cannot refer themselves");
        require(referrers[organizer] == address(0), "Organizer already has a referrer");
        referrers[organizer] = referrer;
```diff
@@ -1,5 +1,11 @@
 pragma solidity ^0.8.0;

+address private admin;
+
+constructor() {
+    admin = msg.sender;
+}
+
 contract ReferralManager {
     mapping(address => address) private referrers;

@@ -10,6 +16,11 @@
     event ReferrerAssigned(address indexed organizer, address indexed referrer);

+    modifier onlyAdmin() {
+        require(msg.sender == admin, "Only admin can perform this action");
+        _;
+    }
+
     function setReferrer(address organizer, address referrer) external onlyAdmin {
        require(organizer != referrer, "Organizer cannot refer themselves");
         require(referrers[organizer] == address(0), "Organizer already has a referrer");
    }

    function getReferrer(address organizer) external view returns (address) {
-    function getReferrer(address organizer) external view returns (address) {
-        return referrers[organizer];
-    }
-}
@@ -20,5 +20,0 @@
-    function getReferrer(address organizer) external view returns (address) {
-        return referrers[organizer];
-    }
-}
}

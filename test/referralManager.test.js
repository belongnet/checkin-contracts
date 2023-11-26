
const { expect } = require("chai");

describe("ReferralManager", function() {
  it("should allow setting a referrer for an organizer", async function() {
    const ReferralManager = await ethers.getContractFactory("ReferralManager");
    const referralManager = await ReferralManager.deploy();
    await referralManager.deployed();

    const [organizer, referrer] = await ethers.getSigners();
    await referralManager.setReferrer(organizer.address, referrer.address);

    expect(await referralManager.referrers(organizer.address)).to.equal(referrer.address);
  });

  it("should not allow setting multiple referrers for the same organizer", async function() {
    const ReferralManager = await ethers.getContractFactory("ReferralManager");
    const referralManager = await ReferralManager.deploy();
    await referralManager.deployed();

    const [organizer, referrer1, referrer2] = await ethers.getSigners();
    await referralManager.setReferrer(organizer.address, referrer1.address);

    await expect(referralManager.setReferrer(organizer.address, referrer2.address))
      .to.be.revertedWith("Organizer already has a referrer");
 describe("ReferralManager", function() {
+  let ReferralManager;
+  let referralManager;
+  let organizer;
+  let referrer1;
+  let referrer2;
+
+  beforeEach(async function() {
+    ReferralManager = await ethers.getContractFactory("ReferralManager");
+    referralManager = await ReferralManager.deploy();
+    await referralManager.deployed();
+    [organizer, referrer1, referrer2] = await ethers.getSigners();
+  });

   it("should allow setting a referrer for an organizer", async function() {
-    const ReferralManager = await ethers.getContractFactory("ReferralManager");
-    const referralManager = await ReferralManager.deploy();
-    await referralManager.deployed();
-
-    const [organizer, referrer] = await ethers.getSigners();
-    await referralManager.setReferrer(organizer.address, referrer.address);
+    await referralManager.setReferrer(organizer.address, referrer1.address);
-    expect(await referralManager.referrers(organizer.address)).to.equal(referrer.address);
+    expect(await referralManager.referrers(organizer.address)).to.equal(referrer1.address);
   });

   it("should not allow setting multiple referrers for the same organizer", async function() {
-    const ReferralManager = await ethers.getContractFactory("ReferralManager");
-    const referralManager = await ReferralManager.deploy();
-    await referralManager.deployed();
-
-    const [organizer, referrer1, referrer2] = await ethers.getSigners();
     await referralManager.setReferrer(organizer.address, referrer1.address);
     await expect(referralManager.setReferrer(organizer.address, referrer2.address))
       .to.be.revertedWith("Organizer already has a referrer");
   });
 });
});

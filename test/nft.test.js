const { solidity } = require("ethereum-waffle");
const { BigNumber } = require("ethers");
const chai = require("chai");
chai.use(solidity);
chai.use(require("chai-bignumber")());
const { expect } = chai;

const EthCrypto = require("eth-crypto");

const chainid = 31337;

describe("NFT tests", () => {
  let nft;
  let factory;
  let storage;
  let erc20Example;
  let validator;
  let signer;
  let instanceAddress;
  let instanceInfoToken;
  let instanceInfoETH;

  let owner, alice, bob, charlie;

  const PLATFORM_COMISSION = "100"; // 1%
  const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

  beforeEach(async () => {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    const Storage = await ethers.getContractFactory("StorageContract");
    storage = await Storage.deploy();
    await storage.deployed();

    const NFTFactory = await ethers.getContractFactory("NFTFactory");
    factory = await NFTFactory.deploy();
    await factory.deployed();

    const Erc20Example = await ethers.getContractFactory("erc20Example");
    erc20Example = await Erc20Example.deploy();
    await erc20Example.deployed();

    const Validator = await ethers.getContractFactory("MockTransferValidator");
    validator = await Validator.deploy();
    await validator.deployed();
    await validator.setSwitcher(true);

    await storage.connect(owner).setFactory(factory.address);

    signer = EthCrypto.createIdentity();

    await factory
      .connect(owner)
      .initialize(
        signer.address,
        owner.address,
        PLATFORM_COMISSION,
        storage.address
      );

    const nftName = "InstanceName";
    const nftSymbol = "INNME";
    const contractURI = "ipfs://tbd";
    const price = ethers.utils.parseEther("0.03");

    const message = EthCrypto.hash.keccak256([
      { type: "string", value: nftName },
      { type: "string", value: nftSymbol },
      { type: "string", value: contractURI },
      { type: "uint96", value: BigNumber.from("600") },
      { type: "address", value: owner.address },
      { type: "uint256", value: chainid },
    ]);

    const signature = EthCrypto.sign(signer.privateKey, message);

    instanceInfoETH = [
      nftName,
      nftSymbol,
      contractURI,
      ETH_ADDRESS,
      price,
      price,
      true,
      10,
      BigNumber.from("600"),
      owner.address,
      BigNumber.from("86400"),
      signature,
    ];

    instanceInfoToken = [
      nftName,
      nftSymbol,
      contractURI,
      erc20Example.address,
      100,
      100,
      true,
      10,
      BigNumber.from("600"),
      owner.address,
      BigNumber.from("86400"),
      signature,
    ];

    await factory.connect(alice).produce(instanceInfoETH, validator.address);

    const hash = EthCrypto.hash.keccak256([
      { type: "string", value: nftName },
      { type: "string", value: nftSymbol },
    ]);
    instanceAddress = await storage.instancesByName(hash);
    const NFT = await ethers.getContractFactory("NFT");
    nft = await NFT.attach(instanceAddress);
  });

  describe("Deploy", async () => {
    it("Should deploy correctly", async () => {
      const nft = await ethers.getContractAt("NFT", instanceAddress);
      const [, info] = await nft.parameters();
      expect(info.payingToken).to.be.equal(ETH_ADDRESS);
    });

    it("Shouldn't deploy with incorrect params", async () => {
      const nftName = "Name 1";
      const nftSymbol = "S1";
      const contractURI = "contractURI/123";

      const NFT = await ethers.getContractFactory("NFT");
      const nft = await NFT.deploy();
      await expect(
        nft.initialize(
          [
            storage.address,
            ETH_ADDRESS,
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("0.5"),
            contractURI,
            nftName,
            nftSymbol,
            true,
            10,
            owner.address,
            1000,
            1000000,
            ZERO_ADDRESS,
          ],
          validator.address
        )
      ).to.be.reverted;

      await expect(
        nft.initialize(
          [
            ZERO_ADDRESS,
            ETH_ADDRESS,
            ethers.utils.parseEther("1"),
            ethers.utils.parseEther("0.5"),
            contractURI,
            nftName,
            nftSymbol,
            true,
            10,
            owner.address,
            1000,
            1000000,
            alice.address,
          ],
          validator.address
        )
      ).to.be.reverted;
    });
  });
  describe("Mint tests", async () => {
    it("Should mint correctly", async () => {
      const NFT_721_BASE_URI = "test.com/";

      let message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);

      await expect(
        nft
          .connect(alice)
          .mint(alice.address, NFT_721_BASE_URI, false, signature, {
            value: ethers.utils.parseEther("0.02"),
          })
      ).to.be.reverted;

      await nft
        .connect(alice)
        .mint(alice.address, NFT_721_BASE_URI, false, signature, {
          value: ethers.utils.parseEther("0.03"),
        });

      const salePrice = 1000;
      const feeNumerator = 600;
      const feeDenominator = 10000;
      const expectedResult = (salePrice * feeNumerator) / feeDenominator;

      const [receiver, realResult] = await nft.royaltyInfo(0, salePrice);
      expect(expectedResult).to.be.equal(realResult);
      expect(receiver).to.be.equal(owner.address);

      for (let i = 1; i < 10; i++) {
        const message = EthCrypto.hash.keccak256([
          { type: "address", value: alice.address },
          { type: "uint256", value: i },
          { type: "string", value: NFT_721_BASE_URI },
          { type: "bool", value: false },
          { type: "uint256", value: chainid },
        ]);

        const signature = EthCrypto.sign(signer.privateKey, message);
        await nft
          .connect(alice)
          .mint(alice.address, NFT_721_BASE_URI, false, signature, {
            value: ethers.utils.parseEther("0.03"),
          });
      }

      message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 10 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      signature = EthCrypto.sign(signer.privateKey, message);
      await expect(
        nft
          .connect(alice)
          .mint(alice.address, NFT_721_BASE_URI, false, signature, {
            value: ethers.utils.parseEther("0.03"),
          })
      ).to.be.reverted;
    });

    it("Should correct set new values", async () => {
      const newPrice = ethers.utils.parseEther("1");
      const newWLPrice = ethers.utils.parseEther("0.1");
      const newPayingToken = bob.address;

      await expect(
        nft.connect(owner).setPayingToken(newPayingToken, newPrice, newWLPrice)
      ).to.be.reverted;

      await expect(
        nft.connect(alice).setPayingToken(ZERO_ADDRESS, newPrice, newWLPrice)
      ).to.be.reverted;

      await nft
        .connect(alice)
        .setPayingToken(newPayingToken, newPrice, newWLPrice);

      const [, info] = await nft.parameters();

      expect(info.payingToken).to.be.equal(newPayingToken);
      expect(info.mintPrice).to.be.equal(newPrice);
      expect(info.whitelistMintPrice).to.be.equal(newWLPrice);
    });

    it("Should mint correctly with erc20 token", async () => {
      const NFT_721_BASE_URI = "test.com/";
      const Nft = await ethers.getContractFactory("NFT");
      nft = await Nft.deploy();

      await nft
        .connect(owner)
        .initialize(
          [storage.address, instanceInfoToken, alice.address],
          validator.address
        ); // 100 - very small amount in wei!

      // mint test tokens
      await erc20Example.connect(alice).mint(alice.address, 10000);
      // allow spender(our nft contract) to get our tokens
      await erc20Example
        .connect(alice)
        .approve(nft.address, ethers.constants.MaxUint256);

      const message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await nft
        .connect(alice)
        .mint(alice.address, NFT_721_BASE_URI, false, signature);
      expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);
    });

    it("Should mint correctly with erc20 token without fee", async () => {
      await factory.connect(owner).setPlatformCommission(0);

      const NFT_721_BASE_URI = "test.com/";
      const Nft = await ethers.getContractFactory("NFT");
      nft = await Nft.deploy();
      await nft
        .connect(owner)
        .initialize(
          [storage.address, instanceInfoToken, alice.address],
          validator.address
        ); // 100 - very small amount in wei!

      // mint test tokens
      await erc20Example.connect(alice).mint(alice.address, 10000);
      // allow spender(our nft contract) to get our tokens
      await erc20Example.connect(alice).approve(nft.address, 99999999999999);

      const message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await nft
        .connect(alice)
        .mint(alice.address, NFT_721_BASE_URI, false, signature);
      expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);
      expect(await erc20Example.balanceOf(alice.address)).to.be.deep.equal(
        10000
      );
    });

    it("Should transfer if transferrable", async () => {
      await factory.connect(owner).setPlatformCommission(0);

      const NFT_721_BASE_URI = "test.com/";
      const Nft = await ethers.getContractFactory("NFT");
      nft = await Nft.deploy();
      await nft
        .connect(owner)
        .initialize(
          [storage.address, instanceInfoToken, alice.address],
          validator.address
        ); // 100 - very small amount in wei!

      // mint test tokens
      await erc20Example.connect(alice).mint(alice.address, 10000);
      // allow spender(our nft contract) to get our tokens
      await erc20Example.connect(alice).approve(nft.address, 99999999999999);

      const message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await nft
        .connect(alice)
        .mint(alice.address, NFT_721_BASE_URI, false, signature);
      expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);

      await nft.connect(alice).transferFrom(alice.address, bob.address, 0);

      expect(await nft.balanceOf(bob.address)).to.be.deep.equal(1);
    });

    it("Shouldn't transfer if not transferrable", async () => {
      await factory.connect(owner).setPlatformCommission(0);

      const NFT_721_BASE_URI = "test.com/";
      const Nft = await ethers.getContractFactory("NFT");
      nft = await Nft.deploy();
      await nft
        .connect(owner)
        .initialize(
          [
            storage.address,
            [
              "InstanceName",
              "INNME",
              "ipfs://tbd",
              erc20Example.address,
              100,
              100,
              false,
              BigNumber.from("1000"),
              BigNumber.from("600"),
              nft.address,
              BigNumber.from("86400"),
              "0x00",
            ],
            alice.address,
          ],
          validator.address
        ); // 100 - very small amount in wei!

      // mint test tokens
      await erc20Example.connect(alice).mint(alice.address, 10000);
      // allow spender(our nft contract) to get our tokens
      await erc20Example.connect(alice).approve(nft.address, 99999999999999);

      const message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await nft
        .connect(alice)
        .mint(alice.address, NFT_721_BASE_URI, false, signature);
      expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);

      await expect(
        nft.connect(alice).transferFrom(alice.address, bob.address, 1)
      ).to.be.reverted;
    });

    it("Should mint correctly with erc20 token if user in the WL", async () => {
      const NFT_721_BASE_URI = "test.com/";
      const Nft = await ethers.getContractFactory("NFT");
      nft = await Nft.deploy();
      await nft
        .connect(owner)
        .initialize(
          [
            storage.address,
            [
              "InstanceName",
              "INNME",
              "ipfs://tbd",
              erc20Example.address,
              ethers.utils.parseEther("100"),
              ethers.utils.parseEther("50"),
              true,
              BigNumber.from("1000"),
              BigNumber.from("600"),
              nft.address,
              BigNumber.from("86400"),
              "0x00",
            ],
            bob.address,
          ],
          validator.address
        ); // 100 - very small amount in wei!

      // mint test tokens
      await erc20Example
        .connect(alice)
        .mint(alice.address, ethers.utils.parseEther("100"));
      // allow spender(our nft contract) to get our tokens
      await erc20Example
        .connect(alice)
        .approve(nft.address, ethers.utils.parseEther("999999"));

      const message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: true },
        { type: "uint256", value: chainid },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);
      const aliceBalanceBefore = await erc20Example.balanceOf(alice.address);
      const bobBalanceBefore = await erc20Example.balanceOf(bob.address);
      await nft
        .connect(alice)
        .mint(alice.address, NFT_721_BASE_URI, true, signature);
      const aliceBalanceAfter = await erc20Example.balanceOf(alice.address);
      const bobBalanceAfter = await erc20Example.balanceOf(bob.address);

      expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);

      expect(aliceBalanceBefore.sub(aliceBalanceAfter)).to.be.equal(
        ethers.utils.parseEther("50")
      );
      expect(bobBalanceAfter.sub(bobBalanceBefore)).to.be.equal(
        ethers.utils
          .parseEther("50")
          .mul(BigNumber.from("9900"))
          .div(BigNumber.from("10000"))
      );
    });

    it("Should fail with wrong signer", async () => {
      const NFT_721_BASE_URI = "test.com/";

      const bad_message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 1 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);
      const bad_signature = alice.signMessage(bad_message);

      await expect(
        nft.connect(alice).mint(
          alice.address,

          NFT_721_BASE_URI,
          false,
          bad_signature,

          {
            value: ethers.utils.parseEther("0.03"),
          }
        )
      ).to.be.reverted;
    });
    it("Should fail with wrong mint price", async () => {
      const NFT_721_BASE_URI = "test.com/";

      const message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await expect(
        nft
          .connect(alice)
          .mint(alice.address, NFT_721_BASE_URI, false, signature, {
            value: ethers.utils.parseEther("0.02"),
          })
      ).to.be.reverted;
      await expect(
        nft
          .connect(alice)
          .mint(alice.address, NFT_721_BASE_URI, false, signature)
      ).to.be.reverted;
    });

    it("Should fail with 0 acc balance erc20", async () => {
      const NFT_721_BASE_URI = "test.com/";
      const Nft = await ethers.getContractFactory("NFT");
      nft = await Nft.deploy();
      await nft
        .connect(owner)
        .initialize(
          [storage.address, instanceInfoToken, alice.address],
          validator.address
        ); // 100 - very small amount in wei!

      await erc20Example.connect(alice).approve(nft.address, 99999999999999);

      const message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 1 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await expect(
        nft
          .connect(alice)
          .mint(alice.address, NFT_721_BASE_URI, false, signature)
      ).to.be.reverted;
    });
  });
  describe("TokenURI test", async () => {
    it("Should return correct metadataUri after mint", async () => {
      const NFT_721_BASE_URI = "test.com/1";

      const message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      await nft
        .connect(alice)
        .mint(alice.address, NFT_721_BASE_URI, false, signature, {
          value: ethers.utils.parseEther("0.03"),
        });
      expect(await nft.tokenURI(0)).to.be.deep.equal(NFT_721_BASE_URI);
    });
  });
  describe("Withdraw test", async () => {
    it("Should withdraw all funds when contract has 0 comission", async () => {
      const Nft = await ethers.getContractFactory("NFT");
      nft = await Nft.deploy();
      await factory.connect(owner).setPlatformCommission("0");
      await nft
        .connect(owner)
        .initialize(
          [storage.address, instanceInfoETH, alice.address],
          validator.address
        );
      const NFT_721_BASE_URI = "test.com/";

      const message = EthCrypto.hash.keccak256([
        { type: "address", value: alice.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);

      let provider = waffle.provider;
      let startBalance = await provider.getBalance(owner.address);

      await nft
        .connect(alice)
        .mint(alice.address, NFT_721_BASE_URI, false, signature, {
          value: ethers.utils.parseEther("0.03"),
        });

      let endBalance = await provider.getBalance(owner.address);
      expect(endBalance - startBalance == ethers.utils.parseEther("0.03"));
    });
    it("Should withdraw all funds without 10% (comission)", async () => {
      const Nft = await ethers.getContractFactory("NFT");
      nft = await Nft.deploy();
      await nft
        .connect(owner)
        .initialize(
          [storage.address, instanceInfoETH, alice.address],
          validator.address
        );
      const NFT_721_BASE_URI = "test.com/";

      const message = EthCrypto.hash.keccak256([
        { type: "address", value: bob.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      const signature = EthCrypto.sign(signer.privateKey, message);
      let provider = waffle.provider;

      let startBalanceOwner = await provider.getBalance(owner.address);
      let startBalanceAlice = await provider.getBalance(alice.address);

      await nft
        .connect(bob)
        .mint(bob.address, NFT_721_BASE_URI, false, signature, {
          value: ethers.utils.parseEther("0.03"),
        });
      expect(await factory.platformAddress()).to.be.equal(owner.address);
      let endBalanceOwner = await provider.getBalance(owner.address);
      let endBalanceAlice = await provider.getBalance(alice.address);

      expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(
        ethers.utils.parseEther("0.03").div(BigNumber.from("100"))
      );
      expect(endBalanceAlice.sub(startBalanceAlice)).to.be.equal(
        ethers.utils
          .parseEther("0.03")
          .mul(BigNumber.from("99"))
          .div(BigNumber.from("100"))
      );
    });

    it("Should correct distribute royalties", async () => {
      const Nft = await ethers.getContractFactory("NFT");
      const RoyaltiesReceiver =
        await ethers.getContractFactory("RoyaltiesReceiver");

      nft = await Nft.deploy();
      receiver = await RoyaltiesReceiver.deploy();
      await receiver.initialize(
        [await factory.platformAddress(), alice.address],
        [1, 5]
      );

      await nft
        .connect(owner)
        .initialize(
          [storage.address, instanceInfoETH, alice.address],
          validator.address
        );

      expect(await nft.owner()).to.be.equal(alice.address);

      const NFT_721_BASE_URI = "test.com/";

      let message = EthCrypto.hash.keccak256([
        { type: "address", value: bob.address },
        { type: "uint256", value: 0 },
        { type: "string", value: NFT_721_BASE_URI },
        { type: "bool", value: false },
        { type: "uint256", value: chainid },
      ]);

      let signature = EthCrypto.sign(signer.privateKey, message);
      let provider = waffle.provider;

      let startBalanceOwner = await provider.getBalance(owner.address);
      let startBalanceAlice = await provider.getBalance(alice.address);

      await nft
        .connect(bob)
        .mint(bob.address, NFT_721_BASE_URI, false, signature, {
          value: ethers.utils.parseEther("0.03"),
        });

      let endBalanceOwner = await provider.getBalance(owner.address);
      let endBalanceAlice = await provider.getBalance(alice.address);

      expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(
        ethers.utils.parseEther("0.03").div(BigNumber.from("100"))
      );
      expect(endBalanceAlice.sub(startBalanceAlice)).to.be.equal(
        ethers.utils
          .parseEther("0.03")
          .mul(BigNumber.from("99"))
          .div(BigNumber.from("100"))
      );

      // NFT was sold for ETH

      let tx = {
        from: owner.address,
        to: receiver.address,
        value: ethers.utils.parseEther("1"),
        gasLimit: 1000000,
      };

      const platformAddress = await factory.platformAddress();

      await owner.sendTransaction(tx);

      creatorBalanceBefore = await provider.getBalance(alice.address);
      platformBalanceBefore = await provider.getBalance(platformAddress);

      await receiver.connect(bob)["releaseAll()"]();

      creatorBalanceAfter = await provider.getBalance(alice.address);
      platformBalanceAfter = await provider.getBalance(platformAddress);

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
        ethers.utils
          .parseEther("1")
          .mul(BigNumber.from("5"))
          .div(BigNumber.from("6"))
      );
      expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
        ethers.utils.parseEther("1").div(BigNumber.from("6"))
      );

      // NFT was sold for ERC20

      creatorBalanceBefore = await erc20Example.balanceOf(alice.address);
      platformBalanceBefore = await erc20Example.balanceOf(platformAddress);

      await erc20Example
        .connect(owner)
        .mint(receiver.address, ethers.utils.parseEther("1"));

      await receiver.connect(bob)["releaseAll(address)"](erc20Example.address);

      creatorBalanceAfter = await erc20Example.balanceOf(alice.address);
      platformBalanceAfter = await erc20Example.balanceOf(platformAddress);

      expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(
        ethers.utils
          .parseEther("1")
          .mul(BigNumber.from("5"))
          .div(BigNumber.from("6"))
      );
      expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(
        ethers.utils.parseEther("1").div(BigNumber.from("6"))
      );
    });
  });
});

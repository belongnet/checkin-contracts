const { solidity } = require("ethereum-waffle");
const { BigNumber } = require("ethers");
const chai = require("chai");
chai.use(solidity);
chai.use(require("chai-bignumber")());
const { expect } = chai;

const EthCrypto = require("eth-crypto");

const PLATFORM_COMISSION = "10";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const chainid = 31337;

describe("NFTFactory tests", () => {
  let factory;
  let storage;
  let signer;
  let validator;

  let owner, alice, bob, charlie;
  beforeEach(async () => {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    const Storage = await ethers.getContractFactory("StorageContract", owner);
    storage = await Storage.deploy();
    await storage.deployed();

    const NFTFactory = await ethers.getContractFactory("NFTFactory", owner);
    factory = await NFTFactory.deploy();
    await factory.deployed();

    const Validator = await ethers.getContractFactory("MockTransferValidator");
    validator = await Validator.deploy(true);
    await validator.deployed();

    await storage.connect(owner).setFactory(factory.address);

    signer = EthCrypto.createIdentity();

    await factory
      .connect(owner)
      .initialize(
        signer.address,
        owner.address,
        PLATFORM_COMISSION,
        storage.address,
        validator.address
      );
  });

  it("should correct initialize", async () => {
    expect(await factory.platformAddress()).to.be.equal(owner.address);
    expect(await factory.storageContract()).to.be.equal(storage.address);
    expect(await factory.platformCommission()).to.be.equal(+PLATFORM_COMISSION);
    expect(await factory.signerAddress()).to.be.equal(signer.address);
  });

  it("shouldn't initialize with incorrect params", async () => {
    const NFTFactory = await ethers.getContractFactory("NFTFactory");

    let factory = await NFTFactory.deploy();

    await expect(
      factory
        .connect(owner)
        .initialize(
          ZERO_ADDRESS,
          owner.address,
          PLATFORM_COMISSION,
          storage.address
        )
    ).to.be.reverted;

    await expect(
      factory
        .connect(owner)
        .initialize(
          signer.address,
          ZERO_ADDRESS,
          PLATFORM_COMISSION,
          storage.address
        )
    ).to.be.reverted;

    await expect(
      factory
        .connect(owner)
        .initialize(
          signer.address,
          owner.address,
          PLATFORM_COMISSION,
          ZERO_ADDRESS
        )
    ).to.be.reverted;
  });

  it("should correct deploy NFT instance", async () => {
    const nftName = "Name 1";
    const nftSymbol = "S1";
    const contractURI = "contractURI/123";
    const price = ethers.utils.parseEther("0.05");

    const message = EthCrypto.hash.keccak256([
      { type: "string", value: nftName },
      { type: "string", value: nftSymbol },
      { type: "string", value: contractURI },
      { type: "uint96", value: BigNumber.from("500") },
      { type: "address", value: owner.address },
      { type: "uint256", value: chainid },
    ]);

    const signature = EthCrypto.sign(signer.privateKey, message);

    const badMessage = EthCrypto.hash.keccak256([
      { type: "string", value: nftName },
      { type: "string", value: nftSymbol },
      { type: "string", value: contractURI },
      { type: "uint96", value: BigNumber.from("500") },
      { type: "address", value: ZERO_ADDRESS },
      { type: "uint256", value: chainid },
    ]);

    const badSignature = EthCrypto.sign(signer.privateKey, badMessage);

    await expect(
      factory
        .connect(alice)
        .produce([
          nftName,
          nftSymbol,
          contractURI,
          ZERO_ADDRESS,
          price,
          price,
          true,
          BigNumber.from("1000"),
          BigNumber.from("500"),
          owner.address,
          BigNumber.from("86400"),
          signature,
        ])
    ).to.be.reverted;

    await expect(
      factory
        .connect(alice)
        .produce([
          nftName,
          nftSymbol,
          contractURI,
          ETH_ADDRESS,
          price,
          price,
          true,
          BigNumber.from("1000"),
          BigNumber.from("500"),
          ZERO_ADDRESS,
          BigNumber.from("86400"),
          badSignature,
        ])
    ).to.be.reverted;

    await expect(
      factory
        .connect(alice)
        .produce([
          nftName,
          nftSymbol,
          contractURI,
          ETH_ADDRESS,
          price,
          price,
          true,
          BigNumber.from("1000"),
          BigNumber.from("500"),
          ZERO_ADDRESS,
          BigNumber.from("86400"),
          signature,
        ])
    ).to.be.reverted;

    const emptyNameMessage = EthCrypto.hash.keccak256([
      { type: "string", value: "" },
      { type: "string", value: nftSymbol },
      { type: "string", value: contractURI },
      { type: "uint96", value: BigNumber.from("500") },
      { type: "address", value: owner.address },
      { type: "uint256", value: chainid },
    ]);

    const emptyNameSignature = EthCrypto.sign(
      signer.privateKey,
      emptyNameMessage
    );

    await expect(
      factory
        .connect(alice)
        .produce([
          "",
          nftSymbol,
          contractURI,
          ETH_ADDRESS,
          price,
          price,
          true,
          BigNumber.from("1000"),
          BigNumber.from("500"),
          owner.address,
          BigNumber.from("86400"),
          emptyNameSignature,
        ])
    ).to.be.reverted;

    const emptySymbolMessage = EthCrypto.hash.keccak256([
      { type: "string", value: nftName },
      { type: "string", value: "" },
      { type: "string", value: contractURI },
      { type: "uint96", value: BigNumber.from("500") },
      { type: "address", value: owner.address },
      { type: "uint256", value: chainid },
    ]);

    const emptySymbolSignature = EthCrypto.sign(
      signer.privateKey,
      emptySymbolMessage
    );

    await expect(
      factory
        .connect(alice)
        .produce([
          nftName,
          "",
          contractURI,
          ETH_ADDRESS,
          price,
          price,
          true,
          BigNumber.from("1000"),
          BigNumber.from("500"),
          owner.address,
          BigNumber.from("86400"),
          emptySymbolSignature,
        ])
    ).to.be.reverted;

    const infoParam = [
      nftName,
      nftSymbol,
      contractURI,
      ETH_ADDRESS,
      price,
      price,
      true,
      BigNumber.from("1000"),
      BigNumber.from("500"),
      owner.address,
      BigNumber.from("86400"),
      signature,
    ];

    await factory.connect(alice).produce(infoParam);

    const hash = EthCrypto.hash.keccak256([
      { type: "string", value: nftName },
      { type: "string", value: nftSymbol },
    ]);

    const instanceAddress = await storage.getInstance(hash);
    expect(instanceAddress).to.not.be.equal(ZERO_ADDRESS);
    expect(instanceAddress).to.be.equal(await storage.instances(0));
    const instanceInfo = await storage.getInstanceInfo(0);
    expect(instanceInfo.name).to.be.equal(nftName);
    expect(instanceInfo.symbol).to.be.equal(nftSymbol);
    expect(instanceInfo.creator).to.be.equal(alice.address);

    console.log("instanceAddress = ", instanceAddress);

    const nft = await ethers.getContractAt("NFT", instanceAddress);
    const [storageContract, info, creator] = await nft.parameters();

    expect(storageContract).to.be.equal(storage.address);
    expect(info.payingToken).to.be.equal(ETH_ADDRESS);
    expect(info.mintPrice).to.be.equal(price);
    expect(info.contractURI).to.be.equal(contractURI);
    expect(creator).to.be.equal(alice.address);
  });

  it("should correct deploy several NFT nfts", async () => {
    const nftName1 = "Name 1";
    const nftName2 = "Name 2";
    const nftName3 = "Name 3";
    const nftSymbol1 = "S1";
    const nftSymbol2 = "S2";
    const nftSymbol3 = "S3";
    const contractURI1 = "contractURI1/123";
    const contractURI2 = "contractURI2/123";
    const contractURI3 = "contractURI3/123";
    const price1 = ethers.utils.parseEther("0.01");
    const price2 = ethers.utils.parseEther("0.02");
    const price3 = ethers.utils.parseEther("0.03");

    const message1 = EthCrypto.hash.keccak256([
      { type: "string", value: nftName1 },
      { type: "string", value: nftSymbol1 },
      { type: "string", value: contractURI1 },
      { type: "uint96", value: BigNumber.from("500") },
      { type: "address", value: owner.address },
      { type: "uint256", value: chainid },
    ]);

    const signature1 = EthCrypto.sign(signer.privateKey, message1);

    await factory
      .connect(alice)
      .produce([
        nftName1,
        nftSymbol1,
        contractURI1,
        ETH_ADDRESS,
        price1,
        price1,
        true,
        BigNumber.from("1000"),
        BigNumber.from("500"),
        owner.address,
        BigNumber.from("86400"),
        signature1,
      ]);

    const message2 = EthCrypto.hash.keccak256([
      { type: "string", value: nftName2 },
      { type: "string", value: nftSymbol2 },
      { type: "string", value: contractURI2 },
      { type: "uint96", value: BigNumber.from("500") },
      { type: "address", value: owner.address },
      { type: "uint256", value: chainid },
    ]);

    const signature2 = EthCrypto.sign(signer.privateKey, message2);

    await factory
      .connect(bob)
      .produce([
        nftName2,
        nftSymbol2,
        contractURI2,
        ETH_ADDRESS,
        price2,
        price2,
        true,
        BigNumber.from("1000"),
        BigNumber.from("500"),
        owner.address,
        BigNumber.from("86400"),
        signature2,
      ]);

    const message3 = EthCrypto.hash.keccak256([
      { type: "string", value: nftName3 },
      { type: "string", value: nftSymbol3 },
      { type: "string", value: contractURI3 },
      { type: "uint96", value: BigNumber.from("500") },
      { type: "address", value: owner.address },
      { type: "uint256", value: chainid },
    ]);

    const signature3 = EthCrypto.sign(signer.privateKey, message3);

    await factory
      .connect(charlie)
      .produce([
        nftName3,
        nftSymbol3,
        contractURI3,
        ETH_ADDRESS,
        price3,
        price3,
        true,
        BigNumber.from("1000"),
        BigNumber.from("500"),
        owner.address,
        BigNumber.from("86400"),
        signature3,
      ]);

    const hash1 = EthCrypto.hash.keccak256([
      { type: "string", value: nftName1 },
      { type: "string", value: nftSymbol1 },
    ]);

    const hash2 = EthCrypto.hash.keccak256([
      { type: "string", value: nftName2 },
      { type: "string", value: nftSymbol2 },
    ]);

    const hash3 = EthCrypto.hash.keccak256([
      { type: "string", value: nftName3 },
      { type: "string", value: nftSymbol3 },
    ]);

    const instanceAddress1 = await storage.getInstance(hash1);
    const instanceAddress2 = await storage.getInstance(hash2);
    const instanceAddress3 = await storage.getInstance(hash3);

    expect(instanceAddress1).to.not.be.equal(ZERO_ADDRESS);
    expect(instanceAddress2).to.not.be.equal(ZERO_ADDRESS);
    expect(instanceAddress3).to.not.be.equal(ZERO_ADDRESS);

    expect(instanceAddress1).to.be.equal(await storage.instances(0));
    expect(instanceAddress2).to.be.equal(await storage.instances(1));
    expect(instanceAddress3).to.be.equal(await storage.instances(2));

    const instanceInfo1 = await storage.getInstanceInfo(0);
    const instanceInfo2 = await storage.getInstanceInfo(1);
    const instanceInfo3 = await storage.getInstanceInfo(2);

    expect(instanceInfo1.name).to.be.equal(nftName1);
    expect(instanceInfo1.symbol).to.be.equal(nftSymbol1);
    expect(instanceInfo1.creator).to.be.equal(alice.address);

    expect(instanceInfo2.name).to.be.equal(nftName2);
    expect(instanceInfo2.symbol).to.be.equal(nftSymbol2);
    expect(instanceInfo2.creator).to.be.equal(bob.address);

    expect(instanceInfo3.name).to.be.equal(nftName3);
    expect(instanceInfo3.symbol).to.be.equal(nftSymbol3);
    expect(instanceInfo3.creator).to.be.equal(charlie.address);

    console.log("instanceAddress1 = ", instanceAddress1);
    console.log("instanceAddress2 = ", instanceAddress2);
    console.log("instanceAddress3 = ", instanceAddress3);

    const nft1 = await ethers.getContractAt("NFT", instanceAddress1);
    let [storageContract, info, creator] = await nft1.parameters();
    expect(info.payingToken).to.be.equal(ETH_ADDRESS);
    expect(storageContract).to.be.equal(storage.address);
    expect(info.mintPrice).to.be.equal(price1);
    expect(info.contractURI).to.be.equal(contractURI1);
    expect(creator).to.be.equal(alice.address);

    const nft2 = await ethers.getContractAt("NFT", instanceAddress2);
    [storageContract, info, creator] = await nft2.parameters();
    expect(info.payingToken).to.be.equal(ETH_ADDRESS);
    expect(storageContract).to.be.equal(storage.address);
    expect(info.mintPrice).to.be.equal(price2);
    expect(info.contractURI).to.be.equal(contractURI2);
    expect(creator).to.be.equal(bob.address);

    const nft3 = await ethers.getContractAt("NFT", instanceAddress3);
    [storageContract, info, creator] = await nft3.parameters();
    expect(info.payingToken).to.be.equal(ETH_ADDRESS);
    expect(storageContract).to.be.equal(storage.address);
    expect(info.mintPrice).to.be.equal(price3);
    expect(info.contractURI).to.be.equal(contractURI3);
    expect(creator).to.be.equal(charlie.address);
  });

  it("shouldn't deploy NFT instance with the same parameters", async () => {
    const uri = "test.com";
    const nftName = "Name 1";
    const nftSymbol = "S1";
    const contractURI = "contractURI/123";
    const price = ethers.utils.parseEther("0.05");

    const message = EthCrypto.hash.keccak256([
      { type: "string", value: nftName },
      { type: "string", value: nftSymbol },
      { type: "string", value: contractURI },
      { type: "uint96", value: BigNumber.from("500") },
      { type: "address", value: owner.address },
      { type: "uint256", value: chainid },
    ]);

    const signature = EthCrypto.sign(signer.privateKey, message);

    await factory
      .connect(alice)
      .produce([
        nftName,
        nftSymbol,
        contractURI,
        ETH_ADDRESS,
        price,
        price,
        true,
        BigNumber.from("1000"),
        BigNumber.from("500"),
        owner.address,
        BigNumber.from("86400"),
        signature,
      ]);

    await expect(
      factory
        .connect(alice)
        .produce([
          nftName,
          nftSymbol,
          contractURI,
          ETH_ADDRESS,
          price,
          price,
          true,
          BigNumber.from("1000"),
          BigNumber.from("500"),
          owner.address,
          BigNumber.from("86400"),
          signature,
        ])
    ).to.be.reverted;
  });

  it("should correct set parameters", async () => {
    const newPlatformAddress = bob.address;
    const newSigner = charlie.address;

    await expect(factory.connect(owner).setPlatformAddress(ZERO_ADDRESS)).to.be
      .reverted;

    await factory.connect(owner).setPlatformAddress(newPlatformAddress);
    expect(await factory.platformAddress()).to.be.equal(newPlatformAddress);
    await expect(factory.connect(owner).setSigner(ZERO_ADDRESS)).to.be.reverted;
    await factory.connect(owner).setSigner(newSigner);
    expect(await factory.signerAddress()).to.be.equal(newSigner);
  });
});

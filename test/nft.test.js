const { ethers, upgrades } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { BigNumber } = require("ethers");
const chai = require("chai");
chai.use(solidity);
chai.use(require("chai-bignumber")());
const { expect } = chai;

const BN = require("bn.js");
const EthCrypto = require("eth-crypto");

const PLATFORM_COMISSION = "10";
const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";


describe("NFT tests", () => {
    let nft;
    let factory;
    let storage;
    let signer;
    let instanceAddress;

    const accounts = waffle.provider.getWallets();
    const owner = accounts[0];
    const alice = accounts[1];
    const bob = accounts[2];
    const PLATFORM_COMISSION = "10";
    const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

    beforeEach(async () => {
        const Nft = await ethers.getContractFactory("NFT");
        const Storage = await ethers.getContractFactory("StorageContract");
        const Factory = await ethers.getContractFactory("Factory");

        factory = await Factory.deploy();
        storage = await Storage.deploy();

        await storage.connect(owner).setFactory(factory.address);

        signer = EthCrypto.createIdentity();

        await factory.connect(owner).initialize(
            signer.address,
            owner.address,
            PLATFORM_COMISSION,
            storage.address
        );

        nft = await Nft.deploy();
        
        await nft
            .connect(owner)
            .initialize(
                storage.address,
                "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                ethers.utils.parseEther("0.03"),
                "ContractURI",
                "coolName",
                "CNME"
            );
        const nftName = "Name 1";
        const nftSymbol = "S1";
        const contractURI = "contractURI/123";
        const price = ethers.utils.parseEther("0.03");

        await factory
            .connect(alice)
            .produce(nftName, nftSymbol, contractURI, ETH_ADDRESS, price);

        const hash = EthCrypto.hash.keccak256([
            { type: "string", value: nftName },
            { type: "string", value: nftSymbol },
        ]);
        instanceAddress = await storage.getInstance(hash);
        const NFT = await ethers.getContractFactory("NFT");
        nft = await NFT.attach(instanceAddress);
    });

    describe("Deploy", async () => {
        it("Should deploy correctly", async () => {
            const nft = await ethers.getContractAt("NFT", instanceAddress);
            expect(await nft.payingToken()).to.be.equal(ETH_ADDRESS);
        });
    });
    describe("Mint tests", async () => {
        it("Should mint correctly", async () => {
            const NFT_721_BASE_URI = "test.com/";

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            console.log("message = ", message);
            console.log("signer = ", signer.address);

            await nft
                .connect(alice)
                .mint(alice.address, 1, NFT_721_BASE_URI, signature, {
                    value: ethers.utils.parseEther("0.03"),
                });
        });
        it("Should mint correctly with erc20 token", async () => {
            const Erc20Example = await ethers.getContractFactory(
                "erc20Example"
            );
            const erc20Example = await Erc20Example.deploy();

            const NFT_721_BASE_URI = "test.com/";
            const Nft = await ethers.getContractFactory("NFT");
            nft = await Nft.deploy();
            await nft
                .connect(owner)
                .initialize(
                    storage.address,
                    erc20Example.address,
                    100,
                    "ContractURI",
                    "coolName",
                    "CNME"
                ); // 100 - very small amount in wei!

            // mint test tokens
            await erc20Example.connect(alice).mint(alice.address, 10000);
            // allow spender(our nft contract) to get our tokens
            await erc20Example
                .connect(alice)
                .approve(nft.address, 99999999999999);

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await nft
                .connect(alice)
                .mint(alice.address, 1, NFT_721_BASE_URI, signature);
            expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);
        });
        it("Should fail with wrong signer", async () => {
            const NFT_721_BASE_URI = "test.com/";

            const bad_message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
            ]);
            const bad_signature = EthCrypto.sign(alice.privateKey, bad_message);

            await expect(
                nft
                    .connect(alice)
                    .mint(alice.address, 1, NFT_721_BASE_URI, bad_signature, {
                        value: ethers.utils.parseEther("0.03"),
                    })
            ).to.be.reverted;
        });
        it("Should fail with wrong mint price", async () => {
            const NFT_721_BASE_URI = "test.com/";

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await expect(
                nft
                    .connect(alice)
                    .mint(alice.address, 1, NFT_721_BASE_URI, signature, {
                        value: ethers.utils.parseEther("0.02"),
                    })
            ).to.be.reverted;
        });
        it("Should fail with 0 acc balacne erc20", async () => {
            const Erc20Example = await ethers.getContractFactory(
                "erc20Example"
            );
            const erc20Example = await Erc20Example.deploy();

            const NFT_721_BASE_URI = "test.com/";
            const Nft = await ethers.getContractFactory("NFT");
            nft = await Nft.deploy();
            await nft
                .connect(owner)
                .initialize(
                    storage.address,
                    erc20Example.address,
                    100,
                    "ContractURI",
                    "coolName",
                    "CNME"
                ); // 100 - very small amount in wei!

            // allow spender(our nft contract) to get our tokens
            await erc20Example
                .connect(alice)
                .approve(nft.address, 99999999999999);

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await expect(
                nft
                    .connect(alice)
                    .mint(alice.address, 1, NFT_721_BASE_URI, signature)
            ).to.be.reverted;
        });
    });
    describe("TokenURI test", async () => {
        it("Should return correct metadataUri after mint", async () => {
            const NFT_721_BASE_URI = "test.com/1";

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await nft
                .connect(alice)
                .mint(alice.address, 1, NFT_721_BASE_URI, signature, {
                    value: ethers.utils.parseEther("0.03"),
                });
            expect(await nft.tokenURI(1)).to.be.deep.equal("test.com/1");
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
                    storage.address,
                    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    ethers.utils.parseEther("0.03"),
                    "contractURI",
                    "coolName",
                    "CNME"
                );
            const NFT_721_BASE_URI = "test.com/";

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await nft
                .connect(alice)
                .mint(alice.address, 1, NFT_721_BASE_URI, signature, {
                    value: ethers.utils.parseEther("0.03"),
                });
            let provider = waffle.provider;
            let startBalance = await provider.getBalance(owner.address);

            await nft
                .connect(owner)
                .withdrawAll("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE");
            let endBalance = await provider.getBalance(owner.address);
            expect(
                endBalance - startBalance == ethers.utils.parseEther("0.03")
            );
        });
        it("Should withdraw all funds without 10% (comission)", async () => {
            const Nft = await ethers.getContractFactory("NFT");
            nft = await Nft.deploy();
            await nft
                .connect(owner)
                .initialize(
                    storage.address,
                    "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                    ethers.utils.parseEther("0.03"),
                    "contractURI",
                    "coolName",
                    "CNME"
                );
            const NFT_721_BASE_URI = "test.com/";

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await nft
                .connect(alice)
                .mint(alice.address, 1, NFT_721_BASE_URI, signature, {
                    value: ethers.utils.parseEther("0.03"),
                });
            let provider = waffle.provider;
            let startBalance = await provider.getBalance(owner.address);

            await nft
                .connect(owner)
                .withdrawAll("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE");
            let endBalance = await provider.getBalance(owner.address);
            expect(
                endBalance - startBalance ==
                    (ethers.utils.parseEther("0.03") * 90) / 100
            );
        });
    });
});

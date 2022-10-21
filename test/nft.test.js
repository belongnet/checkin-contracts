const { ethers, upgrades } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const { BigNumber } = require("ethers");
const chai = require("chai");
chai.use(solidity);
chai.use(require("chai-bignumber")());
const { expect } = chai;

const BN = require("bn.js");
const EthCrypto = require("eth-crypto");


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
    const PLATFORM_COMISSION = "100";   // 1%
    const ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
    const ZERO = BigNumber.from('0');

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

        const nftName = "Name 1";
        const nftSymbol = "S1";
        const contractURI = "contractURI/123";
        const price = ethers.utils.parseEther("0.03");

        const message = EthCrypto.hash.keccak256([
            { type: "string", value: nftName },
            { type: "string", value: nftSymbol },
            { type: "string", value: contractURI },
            { type: "uint96", value: BigNumber.from('600') },
            { type: "address", value: owner.address }

        ]);

        const signature = EthCrypto.sign(signer.privateKey, message);

        await factory
            .connect(alice)
            .produce(
                [
                nftName, 
                nftSymbol, 
                contractURI, 
                ETH_ADDRESS, 
                price, 
                price, 
                true, 
                BigNumber.from('1000'), 
                BigNumber.from('600'), 
                owner.address, 
                BigNumber.from('86400'), 
                signature
            ]
        );

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
                { type: "bool", value: false },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await nft
                .connect(alice)
                .mint(alice.address, 1, NFT_721_BASE_URI, false, signature, ethers.utils.parseEther("0.03"), {
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
                    [
                        storage.address,
                        erc20Example.address,
                        100,
                        100,
                        "ContractURI",
                        "coolName",
                        "CNME",
                        true,
                        BigNumber.from('1000'),
                        nft.address,
                        BigNumber.from('600'),
                        BigNumber.from('86400'),
                        alice.address  
                    ]
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
                { type: "bool", value: false },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await nft
                .connect(alice)
                .mint(alice.address, 1, NFT_721_BASE_URI, false, signature, 100);
            expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);
        });

        it("Should mint correctly with erc20 token if user in the WL", async () => {
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
                    [
                        storage.address,
                        erc20Example.address,
                        ethers.utils.parseEther('100'),
                        ethers.utils.parseEther('50'),
                        "ContractURI",
                        "coolName",
                        "CNME",
                        true,
                        BigNumber.from('1000'),
                        nft.address,
                        BigNumber.from('600'),
                        BigNumber.from('86400'),
                        bob.address  
                    ]
                ); // 100 - very small amount in wei!
                
            // mint test tokens
            await erc20Example.connect(alice).mint(alice.address, ethers.utils.parseEther('100'));
            // allow spender(our nft contract) to get our tokens
            await erc20Example
                .connect(alice)
                .approve(nft.address, ethers.utils.parseEther('999999'));

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
                { type: "bool", value: true },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);
            const aliceBalanceBefore = await erc20Example.balanceOf(alice.address);
            const bobBalanceBefore = await erc20Example.balanceOf(bob.address);
            await nft
                .connect(alice)
                .mint(alice.address, 1, NFT_721_BASE_URI, true, signature, ethers.utils.parseEther('50'));
            const aliceBalanceAfter = await erc20Example.balanceOf(alice.address);
            const bobBalanceAfter = await erc20Example.balanceOf(bob.address);

            expect(await nft.balanceOf(alice.address)).to.be.deep.equal(1);

            expect(aliceBalanceBefore.sub(aliceBalanceAfter)).to.be.equal(ethers.utils.parseEther('50'));
            expect(bobBalanceAfter.sub(bobBalanceBefore)).to.be.equal(ethers.utils.parseEther('50').mul(BigNumber.from('9900')).div(BigNumber.from('10000')));
        });

        it("Should fail with wrong signer", async () => {
            const NFT_721_BASE_URI = "test.com/";

            const bad_message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
                { type: "bool", value: false },
            ]);
            const bad_signature = EthCrypto.sign(alice.privateKey, bad_message);

            await expect(
                nft
                    .connect(alice)
                    .mint(alice.address, 1, NFT_721_BASE_URI, false, bad_signature, ethers.utils.parseEther("0.03"), {
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
                { type: "bool", value: false },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await expect(
                nft
                    .connect(alice)
                    .mint(alice.address, 1, NFT_721_BASE_URI, false, signature, ethers.utils.parseEther("0.02"), {
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
                    [
                        storage.address,
                        erc20Example.address,
                        100,
                        100,
                        "ContractURI",
                        "coolName",
                        "CNME",
                        true,
                        BigNumber.from('1000'),
                        nft.address,
                        BigNumber.from('600'),
                        BigNumber.from('86400'),
                        alice.address 
                    ]
                ); // 100 - very small amount in wei!

            await erc20Example
                .connect(alice)
                .approve(nft.address, 99999999999999);

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
                { type: "bool", value: false },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await expect(
                nft
                    .connect(alice)
                    .mint(alice.address, 1, NFT_721_BASE_URI, false, signature, 100)
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
                { type: "bool", value: false },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await nft
                .connect(alice)
                .mint(alice.address, 1, NFT_721_BASE_URI, false, signature, ethers.utils.parseEther("0.03"), {
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
                    [
                        storage.address,
                        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                        ethers.utils.parseEther("0.03"),
                        ethers.utils.parseEther("0.03"),
                        "contractURI",
                        "coolName",
                        "CNME",
                        true,
                        BigNumber.from('1000'),
                        nft.address,
                        BigNumber.from('600'),
                        BigNumber.from('86400'),
                        alice.address
                    ]
                );
            const NFT_721_BASE_URI = "test.com/";

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: alice.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
                { type: "bool", value: false },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            let provider = waffle.provider;
            let startBalance = await provider.getBalance(owner.address);

            await nft
                .connect(alice)
                .mint(alice.address, 1, NFT_721_BASE_URI, false, signature, ethers.utils.parseEther("0.03"), {
                    value: ethers.utils.parseEther("0.03"),
                });

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
                    [
                        storage.address,
                        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                        ethers.utils.parseEther("0.03"),
                        ethers.utils.parseEther("0.03"),
                        "contractURI",
                        "coolName",
                        "CNME",
                        true,
                        BigNumber.from('1000'),
                        nft.address,
                        BigNumber.from('600'),
                        BigNumber.from('86400'),
                        alice.address  
                    ]
                );
            const NFT_721_BASE_URI = "test.com/";

            const message = EthCrypto.hash.keccak256([
                { type: "address", value: bob.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
                { type: "bool", value: false },
            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);
            let provider = waffle.provider;

            let startBalanceOwner = await provider.getBalance(owner.address);
            let startBalanceAlice = await provider.getBalance(alice.address);

            await nft
                .connect(bob)
                .mint(bob.address, 1, NFT_721_BASE_URI, false, signature, ethers.utils.parseEther("0.03"), {
                    value: ethers.utils.parseEther("0.03"),
                });
            expect(await factory.platformAddress()).to.be.equal(owner.address);
            let endBalanceOwner = await provider.getBalance(owner.address);
            let endBalanceAlice = await provider.getBalance(alice.address);

            expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(ethers.utils.parseEther("0.03").div(BigNumber.from('100')));
            expect(endBalanceAlice.sub(startBalanceAlice)).to.be.equal(ethers.utils.parseEther("0.03").mul(BigNumber.from('99')).div(BigNumber.from('100')));
            
        });

        it("Should correct distribute royalties", async () => {
            const Nft = await ethers.getContractFactory("NFT");
            const RoyaltiesReceiver = await ethers.getContractFactory("RoyaltiesReceiver");
            
            nft = await Nft.deploy();
            receiver = await RoyaltiesReceiver.deploy();
            await receiver.initialize(
                [
                    await factory.platformAddress(),
                    alice.address
                ], 
                [
                    1,
                    5
                ]
            );
            
            await nft
                .connect(owner)
                .initialize(
                    [
                        storage.address,
                        "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
                        ethers.utils.parseEther("0.03"),
                        ethers.utils.parseEther("0.03"),
                        "contractURI",
                        "coolName",
                        "CNME",
                        true,
                        BigNumber.from('1000'),
                        receiver.address,
                        BigNumber.from('600'),
                        BigNumber.from('86400'),
                        alice.address 
                    ]   
                );

            const Erc20Example = await ethers.getContractFactory(
                "erc20Example"
            );
            const erc20Example = await Erc20Example.deploy();

            expect (await nft.owner()).to.be.equal(await factory.platformAddress());

            const NFT_721_BASE_URI = "test.com/";

            let message = EthCrypto.hash.keccak256([
                { type: "address", value: bob.address },
                { type: "uint256", value: 1 },
                { type: "string", value: NFT_721_BASE_URI },
                { type: "bool", value: false },
            ]);

            let signature = EthCrypto.sign(signer.privateKey, message);
            let provider = waffle.provider;

            let startBalanceOwner = await provider.getBalance(owner.address);
            let startBalanceAlice = await provider.getBalance(alice.address);

            await nft
                .connect(bob)
                .mint(bob.address, 1, NFT_721_BASE_URI, false, signature, ethers.utils.parseEther("0.03"), {
                    value: ethers.utils.parseEther("0.03"),
                });
            
            let endBalanceOwner = await provider.getBalance(owner.address);
            let endBalanceAlice = await provider.getBalance(alice.address);
    
            expect(endBalanceOwner.sub(startBalanceOwner)).to.be.equal(ethers.utils.parseEther("0.03").div(BigNumber.from('100')));
            expect(endBalanceAlice.sub(startBalanceAlice)).to.be.equal(ethers.utils.parseEther("0.03").mul(BigNumber.from('99')).div(BigNumber.from('100')));
            

            // NFT was sold for ETH

            let tx = {
                from: owner.address,
                to: receiver.address,
                value: ethers.utils.parseEther("1"),
                gasLimit: 1000000
            }

            const platformAddress = await factory.platformAddress();
            const creator = await nft.creator();

            await owner.sendTransaction(tx);

            creatorBalanceBefore = await provider.getBalance(alice.address);
            platformBalanceBefore = await provider.getBalance(platformAddress);

            await receiver.connect(bob)["releaseAll()"]();

            creatorBalanceAfter = await provider.getBalance(alice.address);
            platformBalanceAfter = await provider.getBalance(platformAddress);

            expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(ethers.utils.parseEther("1").mul(BigNumber.from('5')).div(BigNumber.from('6')));
            expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(ethers.utils.parseEther("1").div(BigNumber.from('6')));
    
            // NFT was sold for ERC20

            creatorBalanceBefore = await erc20Example.balanceOf(alice.address);
            platformBalanceBefore = await erc20Example.balanceOf(platformAddress);

            await erc20Example.connect(owner).mint(receiver.address, ethers.utils.parseEther('1'));

            await receiver.connect(bob)["releaseAll(address)"](erc20Example.address);

            creatorBalanceAfter = await erc20Example.balanceOf(alice.address);
            platformBalanceAfter = await erc20Example.balanceOf(platformAddress);

            expect(creatorBalanceAfter.sub(creatorBalanceBefore)).to.be.equal(ethers.utils.parseEther("1").mul(BigNumber.from('5')).div(BigNumber.from('6')));
            expect(platformBalanceAfter.sub(platformBalanceBefore)).to.be.equal(ethers.utils.parseEther("1").div(BigNumber.from('6')));

        });
    });
});

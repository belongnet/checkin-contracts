const { ethers } = require("hardhat");
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



describe('NFT tests', () => {
        let nft;
        let factory;
        let storage;
        let signer;

        const accounts = waffle.provider.getWallets();
        const owner = accounts[0];                     
        const alice = accounts[1];
        const bob = accounts[2];
        const charlie = accounts[3];

        beforeEach(async () => {
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

        })

        it("should correct initialize", async () => {
            expect(await factory.platformAddress()).to.be.equal(owner.address);
            expect(await factory.storageContract()).to.be.equal(storage.address);
            expect(await factory.platformCommission()).to.be.equal(+PLATFORM_COMISSION);
            expect(await factory.signerAddress()).to.be.equal(signer.address);
        })

        it("should correct deploy NFT instance", async () => {
            const nftName = "Name 1";
            const nftSymbol = "S1";
            const contractURI = "contractURI/123";
            const price = ethers.utils.parseEther("0.05")

            const message = EthCrypto.hash.keccak256([
                { type: "string", value: nftName },
                { type: "string", value: nftSymbol },
                { type: "string", value: contractURI },
                { type: "uint96", value: BigNumber.from('500') },
                { type: "address", value: owner.address },

            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await factory.connect(alice).produce(
                [
                    nftName,
                    nftSymbol,
                    contractURI,
                    ETH_ADDRESS,
                    price,
                    price,
                    true,
                    BigNumber.from('1000'),
                    BigNumber.from('500'),
                    owner.address,
                    signature
                ]
            );

            const hash = EthCrypto.hash.keccak256([
                { type: "string", value: nftName },
                { type: "string", value: nftSymbol }
            ]);

            const instanceAddress = await storage.getInstance(hash);
            expect(instanceAddress).to.not.be.equal(ZERO_ADDRESS);
            expect(instanceAddress).to.be.equal(await storage.instances(0));
            const instanceInfo = await storage.getInstanceInfo(0);
            expect(instanceInfo.name).to.be.equal(nftName);
            expect(instanceInfo.symbol).to.be.equal(nftSymbol);
            expect(instanceInfo.creator).to.be.equal(alice.address);

            console.log("instanceAddress = ", instanceAddress)

            const nft = await ethers.getContractAt("NFT", instanceAddress);
            expect(await nft.payingToken()).to.be.equal(ETH_ADDRESS);
            expect(await nft.storageContract()).to.be.equal(storage.address);
            expect(await nft.mintPrice()).to.be.equal(price);
            expect(await nft.contractURI()).to.be.equal(contractURI);

        })

        it("should correct deploy several NFT instances", async () => {
            const nftName1 = "Name 1";
            const nftName2 = "Name 2";
            const nftName3 = "Name 3";
            const nftSymbol1 = "S1";
            const nftSymbol2 = "S2";
            const nftSymbol3 = "S3";
            const contractURI1 = "contractURI1/123";
            const contractURI2 = "contractURI2/123";
            const contractURI3 = "contractURI3/123";
            const price1 = ethers.utils.parseEther("0.01")
            const price2 = ethers.utils.parseEther("0.02")
            const price3 = ethers.utils.parseEther("0.03")

            const message1 = EthCrypto.hash.keccak256([
                { type: "string", value: nftName1 },
                { type: "string", value: nftSymbol1 },
                { type: "string", value: contractURI1 },
                { type: "uint96", value: BigNumber.from('500') },
                { type: "address", value: owner.address },

            ]);

            const signature1 = EthCrypto.sign(signer.privateKey, message1);

            await factory.connect(alice).produce(
                [
                    nftName1,
                    nftSymbol1,
                    contractURI1,
                    ETH_ADDRESS,
                    price1,
                    price1,
                    true,
                    BigNumber.from('1000'),
                    BigNumber.from('500'),
                    owner.address,
                    signature1
                ]
            );

            const message2 = EthCrypto.hash.keccak256([
                { type: "string", value: nftName2 },
                { type: "string", value: nftSymbol2 },
                { type: "string", value: contractURI2 },
                { type: "uint96", value: BigNumber.from('500') },
                { type: "address", value: owner.address },


            ]);

            const signature2 = EthCrypto.sign(signer.privateKey, message2);

            await factory.connect(bob).produce(
                [
                    nftName2,
                    nftSymbol2,
                    contractURI2,
                    ETH_ADDRESS,
                    price2,
                    price2,
                    true,
                    BigNumber.from('1000'),
                    BigNumber.from('500'),
                    owner.address,
                    signature2
                ]
            );

            const message3 = EthCrypto.hash.keccak256([
                { type: "string", value: nftName3 },
                { type: "string", value: nftSymbol3 },
                { type: "string", value: contractURI3 },
                { type: "uint96", value: BigNumber.from('500') },
                { type: "address", value: owner.address },


            ]);

            const signature3 = EthCrypto.sign(signer.privateKey, message3);

            await factory.connect(charlie).produce(
                [
                    nftName3,
                    nftSymbol3,
                    contractURI3,
                    ETH_ADDRESS,
                    price3,
                    price3,
                    true,
                    BigNumber.from('1000'),
                    BigNumber.from('500'),
                    owner.address,
                    signature3
                ]
            );

            const hash1 = EthCrypto.hash.keccak256([
                { type: "string", value: nftName1 },
                { type: "string", value: nftSymbol1 }
            ]);

            const hash2 = EthCrypto.hash.keccak256([
                { type: "string", value: nftName2 },
                { type: "string", value: nftSymbol2 }
            ]);

            const hash3 = EthCrypto.hash.keccak256([
                { type: "string", value: nftName3 },
                { type: "string", value: nftSymbol3 }
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


            console.log("instanceAddress1 = ", instanceAddress1)
            console.log("instanceAddress2 = ", instanceAddress2)
            console.log("instanceAddress3 = ", instanceAddress3)

            const nft1 = await ethers.getContractAt("NFT", instanceAddress1);
            const nft2 = await ethers.getContractAt("NFT", instanceAddress2);
            const nft3 = await ethers.getContractAt("NFT", instanceAddress3);

            expect(await nft1.payingToken()).to.be.equal(ETH_ADDRESS);
            expect(await nft1.storageContract()).to.be.equal(storage.address);
            expect(await nft1.mintPrice()).to.be.equal(price1);
            expect(await nft1.contractURI()).to.be.equal(contractURI1);

            expect(await nft2.payingToken()).to.be.equal(ETH_ADDRESS);
            expect(await nft2.storageContract()).to.be.equal(storage.address);
            expect(await nft2.mintPrice()).to.be.equal(price2);
            expect(await nft2.contractURI()).to.be.equal(contractURI2);

            expect(await nft3.payingToken()).to.be.equal(ETH_ADDRESS);
            expect(await nft3.storageContract()).to.be.equal(storage.address);
            expect(await nft3.mintPrice()).to.be.equal(price3);
            expect(await nft3.contractURI()).to.be.equal(contractURI3);

        })

        it("shouldn't deploy NFT instance with the same parameters", async () => {
            const uri = "test.com";
            const nftName = "Name 1";
            const nftSymbol = "S1";
            const contractURI = "contractURI/123";
            const price = ethers.utils.parseEther("0.05")

            const message = EthCrypto.hash.keccak256([
                { type: "string", value: nftName },
                { type: "string", value: nftSymbol },
                { type: "string", value: contractURI },
                { type: "uint96", value: BigNumber.from('500') },
                { type: "address", value: owner.address },

            ]);

            const signature = EthCrypto.sign(signer.privateKey, message);

            await factory.connect(alice).produce(
                [
                    nftName,
                    nftSymbol,
                    contractURI,
                    ETH_ADDRESS,
                    price,
                    price,
                    true,
                    BigNumber.from('1000'),
                    BigNumber.from('500'),
                    owner.address,
                    signature
                ]
            );

            await expect(
                factory.connect(alice).produce(
                    [
                        nftName,
                        nftSymbol,
                        contractURI,
                        ETH_ADDRESS,
                        price,
                        price,
                        true,
                        BigNumber.from('1000'),
                        BigNumber.from('500'),    
                        owner.address,
                        signature
                    ]
                )
            ).to.be.revertedWith("Factory: ALREADY_EXISTS")

        })

    }
)

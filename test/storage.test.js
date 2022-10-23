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

const chainid = 31337;


describe('Storage tests', () => {
        let storage;

        const accounts = waffle.provider.getWallets();
        const owner = accounts[0];                     
        const alice = accounts[1];
        const bob = accounts[2];
        const charlie = accounts[3];

        beforeEach(async () => {
            const StorageContract = await ethers.getContractFactory("StorageContract");

            storage = await StorageContract.deploy();

        })

        it("check if the contract is empty", async () => {
            await expect(storage.connect(owner).getInstanceInfo(0)).to.be.revertedWith('incorrect ID');
            expect(await storage.instancesCount()).to.be.equal(0);
        });

        it("shouldn't add instance if not factory", async () => {
            await expect(storage.connect(owner).addInstance(
                ZERO_ADDRESS,
                owner.address,
                "name",
                "symbol"
            )).to.be.revertedWith('only factory');
        });

        it("shouldn't set factory if zero", async () => {
            await expect(storage.connect(owner).setFactory(
                ZERO_ADDRESS
            )).to.be.revertedWith('incorrect address');
        });
       
    
        

    }
)

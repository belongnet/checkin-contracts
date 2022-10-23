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


describe('Receiver tests', () => {
        let receiver;

        const accounts = waffle.provider.getWallets();
        const owner = accounts[0];                     
        const alice = accounts[1];
        const bob = accounts[2];
        const charlie = accounts[3];

        beforeEach(async () => {
            const RoyaltiesReceiver = await ethers.getContractFactory("RoyaltiesReceiver");

            receiver = await RoyaltiesReceiver.deploy();

        })

        it("should correct initialize", async () => {
            await expect(receiver.connect(owner).initialize([ZERO_ADDRESS, alice.address], [3000, 7000])).to.be.revertedWith('PaymentSplitter: account is the zero address');
            await expect(receiver.connect(owner).initialize([owner.address, alice.address], [0, 7000])).to.be.revertedWith('PaymentSplitter: shares are 0');
            await expect(receiver.connect(owner).initialize([alice.address, alice.address], [3000, 7000])).to.be.revertedWith('PaymentSplitter: account already has shares');

        });

        describe('Receiver tests', () => {
            beforeEach(async () => {
                await receiver.connect(owner).initialize([owner.address, alice.address], [3000, 7000]);
            })

            it("shouldn't release if no funds", async () => {
                const Erc20Example = await ethers.getContractFactory(
                    "erc20Example"
                );
                const erc20Example = await Erc20Example.deploy();
    
                await expect(receiver.connect(owner)["releaseAll()"]()).to.be.revertedWith('PaymentSplitter: account is not due payment');
                await expect(receiver.connect(owner)["releaseAll(address)"](erc20Example.address)).to.be.revertedWith('PaymentSplitter: account is not due payment');
            });
    
        })

    }
)

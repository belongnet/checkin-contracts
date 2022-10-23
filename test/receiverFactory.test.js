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


describe('Receiver factory tests', () => {
        let receiverFactory;

        const accounts = waffle.provider.getWallets();
        const owner = accounts[0];                     
        const alice = accounts[1];
        const bob = accounts[2];
        const charlie = accounts[3];

        beforeEach(async () => {
            const ReceiverFactory = await ethers.getContractFactory("ReceiverFactory");

            receiverFactory = await ReceiverFactory.deploy();

        })

        it("should correct deploy Receiver instance", async () => {
            await expect(receiverFactory.deployReceiver([owner.address, alice.address], [3000])).to.be.revertedWith('RoyaltiesReceiver: payees and shares length mismatch');
            await expect(receiverFactory.deployReceiver([owner.address], [3000])).to.be.revertedWith('RoyaltiesReceiver: there should be only 2 payees');
            let tx = await receiverFactory.deployReceiver([owner.address, alice.address], [3000, 7000]);
            let receipt = await tx.wait()
            const instanceAddress = receipt.events[2].args.instance;
            const receiver = await ethers.getContractAt("RoyaltiesReceiver", instanceAddress);
            expect(await receiver.payee(0)).to.be.equal(owner.address);
            expect(await receiver.payee(1)).to.be.equal(alice.address);
            await expect(receiver.payee(2)).to.be.revertedWith('incorrect index');
            expect(await receiver.shares(owner.address)).to.be.equal(3000);
            expect(await receiver.shares(alice.address)).to.be.equal(7000);
            expect(await receiver.totalShares()).to.be.equal(10000);
        });

    }
)

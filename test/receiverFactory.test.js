const { solidity } = require("ethereum-waffle");
const chai = require("chai");
chai.use(solidity);
chai.use(require("chai-bignumber")());
const { expect } = chai;


describe('Receiver factory tests', () => {
        let receiverFactory;

        let owner, alice, bob, charlie;

        beforeEach(async () => {
            [owner, alice, bob, charlie] = await ethers.getSigners();

            const ReceiverFactory = await ethers.getContractFactory("ReceiverFactory");

            receiverFactory = await ReceiverFactory.deploy();
        })

        it("should correct deploy Receiver instance", async () => {
            await expect(receiverFactory.deployReceiver([owner.address, alice.address], [3000])).to.be.reverted;
            await expect(receiverFactory.deployReceiver([owner.address], [3000])).to.be.reverted;
            let tx = await receiverFactory.deployReceiver([owner.address, alice.address], [3000, 7000]);
            let receipt = await tx.wait();

            const instanceAddress = receipt.events[3].args.instance;
            const receiver = await ethers.getContractAt("RoyaltiesReceiver", instanceAddress);
            expect(await receiver.payees(0)).to.be.equal(owner.address);
            expect(await receiver.payees(1)).to.be.equal(alice.address);
            await expect(receiver.payees(2)).to.be.reverted;
            expect(await receiver.shares(owner.address)).to.be.equal(3000);
            expect(await receiver.shares(alice.address)).to.be.equal(7000);
            expect(await receiver.totalShares()).to.be.equal(10000);
        });

    }
)

For Factory contract deployment:

Open Remix IDE
At any position in the file tree create a new file with any name and .sol extension
Copy to the newly created file all the contents of provided FactoryFlattened.sol file

Compile using settings:
compiler: 0.8.13
enable optimization, 200

choose contract to deploy as Factory (Address will be the one selected by default)
deploy to mainnet (using injected web3, metamask, making sure that network is selected correctly)

await transaction confirmation
after deployment open contract address at etherscan, choose Contract
click Verify and Publish
Compiler Type: Solidity (single file)
compiler version: 0.8.13
License type: MIT

continue
paste all the contents of the FactoryFlattened.sol file (the same as was used in Remix)
at the top right: optimization: yes
click Verify and Publish

after successful verification:

open contract address at etherscan
open "code" tab
open "write contract"

make sure that the network in metamask is selected correctly and the address chosen is the future contract owner

open initialize function and fill in all the values without brackets, quotation marks, etc.

press Write
await transaction confirmation

still using etherscan open Storage contract

open "read contract"
press "owner"
remember the address given as result

choose the same address (given as result) in metamask
switch to "write contract"

open setFactory function and fill in the field with an address of newly deployed Factory contract
press write
await transaction confirmation

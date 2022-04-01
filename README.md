# NFT 

Contract that allow to mint ERC721 token with diffrent payment options and security advancements. This contract does not have constructor and requires to call initialize.

For token minting one needs to pass receiver address, token ID, token URI and BE's signature to mint function (see NatSpec docs).

Owner of the contract can change payment token and mint price at any time. If mint price is more than zero, platform comission will be charged. Owner and platform address can withdraw tokens with withdrawAll() function

# Factory

Produces new instances of NFT contract and registrate them in StorageContract. NFT contract can be deployed by anyone. Factory also contains data about platform comission, platform address and signer address. All NFT contracts deployed with Factory use current parameters from Factory contract. 

# StorageContract

Contains information about registered NFT instances (as Factory implementation can be changed)


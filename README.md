# Belong.net

## HardHat Usage

Check [HardHat guide](./docs/guides/HardHat.md).

## Foundry Usage

Check [Foundry guide](./docs/guides/Foundry.md).

## Remix Usage

- Firstly flatten contract:

```
forge flatten ./contracts/contract.sol > ./contracts/contract_flattened.sol
```

Check [Remix guide](./docs/guides/Remix.md).

## Project Overview

The protocol allows users to create their own NFT collection, whose tokens represent invitations to the corresponding hub (community). All the collections are deployed via the Factory contract. Users must specify the name, the symbol, contractURI, paying token address, mint price, whitelist mint price, max collection size and the flag which shows if NFTs of the collection will be transferable or not. The name, symbol, contractURI and other parameters (such a royalties size and its receiver) need to be moderated on the backend, so BE’s signature will be needed for the collection deployment. Factory will be deployed via proxy.

## 1. Functional Requirements

### 1.1. Roles

Belong NFT project has several roles:

1. The owner: Controls the platform commission, can configure Factory contract.
2. Creator: Collection creator can set the mint prices and the paying token of his/her collection. He/she will receive funds from primary sales and some fraction of royalties from secondary sales
3. Platform address: Receives the royalties from the secondary sales and commissions from primary sales
4. Signer: The platform’s BE which moderates the data and gives its approval if requirements are met
5. User: Can create his/her own collection (with signer’s approval), mint tokens in his own or other collections (with signer’s approval)

### 1.2. Features

Belong NFT project has the following features:

- Create a new collection. (Everyone with signer’s approval)
- Get the information about the deployed collections. (Everyone)
- Mint token from any collection. (Everyone with signer’s approval)
- Send funds from primary and secondary sales to platform’s and creators' wallets (Everyone)
- Set paying token (Collection owner)
- Set mint price (Collection owner)
- Set platform commission (The owner)
- Set platform address in the Factory contract (The owner)
- Set signer address in the Factory contract (The owner)

### 1.3 Use Cases

At the beginning, three smart contracts are deployed at the network:

- ReceiverFactory (creates nfts of royalties receivers)
- Factory (creates nfts of NFT collections)

#### Collection creation

1. User specifies the settings of his collection (name, symbol, contractURI with royalty information, mint price, whitelisted mint price, paying token, royalties and “transferable” flag) on the front-end
2. User deploys the RoyaltiesReceiver contract with deployReceiver() function of ReceiverFactory contract. BE (which is subscribed to the ReceiverFactory's events) checks it it was deployed.
3. The BE checks if name, symbol and royalties size comply with the rules
4. BE creates [`contractURI`](https://docs.opensea.io/docs/contract-level-metadata) JSON file and uploads it to some hosting (the fee_recipient field must be equal to the RoyaltiesReceiver address)
5. BE signs the collection data
6. Now user can call produce() function on Factory contract. A new nft collection will be deployed and the user becomes the creator (not owner) of the new smart contract

#### Mint token from the collection

1. If some other user wants to mint a new token in this collection, his/her account will have to be validated by the BE
2. BE generates tokenURI for the new token
3. If the account meets all the requirements and tokenURI is successfully generated, the BE signs the data for mint. Also, if the user is in the whitelist, BE can specify it with whitelisted flag
4. The user calls the mint functions of the NFT contract

If a mint price is greater than zero, the contract will handle payments in either ETH or ERC20 tokens. For every primary sale, a portion of the payment is immediately sent to the platform as a commission, while the remainder is transferred to the creator.

- The factory owner can set or change the platform commission.
- The collection creator can modify the paying token and adjust the mint prices for both regular and whitelisted users.

At deployment, NFTs can be marked as non-transferable, which means that no token in the collection can be transferred or sold. This transferability setting is immutable and cannot be changed later.

For secondary sales (e.g., through a marketplace), a corresponding RoyaltiesReceiver contract ensures royalties are properly distributed between the creator and the platform.

In batch minting operations, the contract supports both static and dynamic pricing.

- For static price minting, the price for each NFT is determined based on the user's whitelist status.
- For dynamic price minting, each NFT can have its own custom price.

The contract validates signatures to ensure authorized minting and handles payments by checking the expected mint price and paying token. If the price changes or an incorrect token is used, the mint will fail. Royalties and platform commissions are calculated and distributed accordingly.

## 2. Technical Requirements

### 2.1. Architecture Overview

![Diagram1](https://sun9-19.userapi.com/impg/t9SXJJCe9uRMpP6lC5O5UgPyqm44gnYrBRX3Jg/q25RTp2b2dk.jpg?size=1562x1006&quality=96&sign=8be73af3cc40da0a2a459428ecae2a60&type=album)
![Diagram2](./pics/Diagram2.jpg)

![BaseERC721](./pics/BaseERC721.png)
![NFT](./pics/NFT.png)
![NFTFactory](./pics/NFTFactory.png)
![Receiver](./pics/RoyaltiesReceiver.png)
![ReceiverFactory](./pics/ReceiverFactory.png)

### 2.2. Contract Information

[This section contains detailed information (their purpose, assets, functions, and events) about the contracts used in the project.](./docs/contracts)

#### 2.2.1. NFT.sol

[Implements the minting and transfer functionality for NFTs, including transfer validation and royalty management.](./docs/contracts/NFT.md)

#### 2.2.2. Factory.sol

[A factory contract to create new NFT instances with specific parameters.](./docs/contracts/factories/NFTFactory.md)

#### 2.2.4. RoyaltiesReceiver.sol

[A contract for managing and releasing royalty payments in both native Ether and ERC20 tokens.](./docs/contracts/RoyaltiesReceiver.md)

In our case, the receivers will be a creator and the platform address. The sum of both shares must be equal to 10000. Because of that the specified creator royalties and platform fees must be converted to shares with the next formulas:

platform_shares = 10000/(x/p + 1)
creator_shares = 10000 - platform_shares

where x - creators’s BPs (input on FE)
p - platform fee BPs (default is 100)

#### 2.2.5. ReceiverFactory.sol

[A factory contract for creating instances of the RoyaltiesReceiver contract.](./docs/contracts/factories/ReceiverFactory.md)

## 3. Additional Explanations

### 3.1. Platform Comission and Royalties

For every NFT contract deployed feeReceiver and feeNumerator parameters are used during its construction.
These parameters do not affect the internal logic in any significant way and only used to apply with ERC2981 standart

Whether ERC2981 is enforced and used or not is entirely up to third parties (NFT marketplaces)

Considering mint fees - a different logic is used:
Each time a `mint()` function is called on any NFT contract - given NFT contract receives two parameters from Factory contract
These parameters are: `platformCommission` and `platformAddress`
Based on these parameters mint fees are enforced

## Smart Contract

### Conditions under which Treasury is created

1. mintPrice=0&Royalties=0 => Create Contract (feeReciever='address user wallet')
2. mintPrice=0.01&Royalties=0(+2% platform fee) => Create fee reciever
3. mintPrice=0.01&Royalties=1(+2% platform fee) => Create fee reciever
4. mintPrice=0&Royalties=1(+2% platform fee) => Create fee reciever

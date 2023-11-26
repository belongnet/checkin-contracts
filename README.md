# Belong.net

## Usage

Rename .env.example to .env and fill all the fields there
### Deploy 
    yarn
    npx hardhat --network <network_name> run ./scripts/deploy.js 

signer and platformAddress need to be specified first. ReceiverFactory, Factory and StorageContract will be deployed.

### Verification 
    yarn
    npx hardhat --network <network_name> verify <ReceiverFactory address>
    npx hardhat --network <network_name> verify <Factory address>
    npx hardhat --network <network_name> verify <StorageContract address>


## Project Overview

The protocol allows users to create their own NFT collection, whose tokens represent invitations to the corresponding hub (community). All the collections are deployed via the Factory contract. Users must specify the name, the symbol, contractURI, paying token address, mint price, whitelist mint price, max collection size and the flag which shows if NFTs of the collection will be transferable or not. The name, symbol, contractURI and other parameters (such a royalties size and its receiver) need to be moderated on the backend, so BE’s signature will be needed for the collection deployment. The factory implementation can be changed so the information about deployed collections is stored in the separate Storage contract. Factory will be deployed via proxy.

## 1. Functional Requirements

### 1.1. Roles
Belong NFT project has several roles:
1. The owner: Controls the platform commission, can configure Factory and Storage contracts. 
2. Creator: Collection creator can set the mint prices and the paying token of his/her collection. He/she will receive funds from primary sales and some fraction of royalties from secondary sales
3. Platform address: Receives the royalties from the secondary sales and commissions from primary sales 
4. Signer: The platform’s BE which moderates the data and gives its approval if requirements are met
5. User: Can create his/her own collection (with signer’s approval), mint tokens in his own or other collections (with signer’s approval)

### 1.2. Features
Belong NFT project has the following features:
* Create a new collection. (Everyone with signer’s approval)
* Get the information about the deployed collections. (Everyone)
* Mint token from any collection. (Everyone with signer’s approval)
* Send funds from primary and secondary sales to platform’s and creators' wallets (Everyone)
* Set paying token (Collection owner)
* Set mint price (Collection owner)
* Set platform commission (The owner)
* Set platform address in the Factory contract (The owner)
* Set signer address in the Factory contract (The owner)
* Set factory address in the Storage contract (The owner)

### 1.3 Use Cases

At the beginning, three smart contracts are deployed at the network:
- ReceiverFactory (creates instances of royalties receivers)
- Factory (creates instances of NFT collections)
- StorageContract (stores the information about all deployed NFT collections)

#### Collection creation
1. User specifies the settings of his collection (name, symbol, contractURI with royalty information, mint price, whitelisted mint price, paying token, royalties and “transferable” flag) on the front-end
2. User deploys the RoyaltiesReceiver contract with deployReceiver() function of ReceiverFactory contract. BE (which is subscribed to the ReceiverFactory's events) checks it it was deployed.
3. The BE checks if name, symbol and royalties size comply with the rules 
4. BE creates [contractURI](https://docs.opensea.io/docs/contract-level-metadata) JSON file and uploads it to some hosting (the fee_recipient field must be equal to the RoyaltiesReceiver address)
5. BE signs the collection data
6. Now user can call produce() function on Factory contract. A new nft collection will be deployed and the user becomes the creator (not owner) of the new smart contract 

#### Mint token from the collection
1. If some other user wants to mint a new token in this collection, his/her account will have to be validated by the BE
2. BE generates tokenURI for the new token
3. If the account meets all the requirements and tokenURI is successfully generated, the BE signs the data for mint. Also, if the user is in the whitelist, BE can specify it with whitelisted flag
4. The user calls the mint() function of the NFT contract

If the mint price is larger than zero, the contract will distribute ETH/ERC20 from every primary sale. Some fraction of this money will be transferred to the platform immediately and the rest will be transferred to the creator. 
The owner of the factory can set other platform commission. The creator of the collection can change paying token as well as the mint prices.
NFTs can be marked as nontransferable at the moment of the deployment. In this case it will be impossible to transfer any NFT to another address or sell it to anyone. The transferable option cannot be changed
If NFT was sold on a marketplace, a corresponding RoyaltiesReceiver contract will receive royalties and it will be distributed between the creator and the platform.

## 2. Technical Requirements

### 2.1. Architecture Overview


![Scheme1](https://sun9-19.userapi.com/impg/t9SXJJCe9uRMpP6lC5O5UgPyqm44gnYrBRX3Jg/q25RTp2b2dk.jpg?size=1562x1006&quality=96&sign=8be73af3cc40da0a2a459428ecae2a60&type=album)
![Scheme2](https://sun9-79.userapi.com/impg/t9qqDa64GcHaLugTO2hrbVmg7OazXNrWPcmixg/n0jhyfog9pA.jpg?size=789x948&quality=96&sign=5cadcd76acf629e8d1ab91178f8e66f1&type=album)
![Scheme3](https://sun9-47.userapi.com/impg/_6MlNfB_GtleV_nL8UVsXS1HuZjDYGkKC7HLkQ/0varYmmIs64.jpg?size=674x945&quality=96&sign=b8c2e6d360024f8074c0bd93bbf68c96&type=album)
![Scheme4](https://sun9-7.userapi.com/impg/NxZjdVcGH3VxFuw2Jt5fUj1S9mjJDNuJ89ZFqg/fP2ZNYXGtvc.jpg?size=793x594&quality=96&sign=46b1617d97628b6f5ab72c2cfd0df2fd&type=album)
![Scheme5](https://sun9-82.userapi.com/impg/MYGnmOGZus2Xr4eE6mkCVC-6-xDrPIRfnZwCgQ/dn3TM87PUEU.jpg?size=701x627&quality=96&sign=43032481ac463255cffe0322be944800&type=album)
![Scheme6](https://sun9-5.userapi.com/impg/vLHkDiFomNJnQtbjF4I-Kv9hLnmPSqNF6Uj7-Q/GfoPLS0ry4A.jpg?size=596x940&quality=96&sign=5c0b25270f71aca222a211db8a3c1b31&type=album)

### 2.2. Contract Information
This section contains detailed information (their purpose, assets, functions, and events) about the contracts used in the project.
#### 2.2.1. NFT.sol
ERC721 token contract with different payment options and security advancements. Mints tokens from this collection if valid BE signature was provided
##### 2.2.1.1. Assets
Belong NFT contains the following entities:
1. address payingToken - Current token accepted as a mint payment
2. address creator - Collection creator address
3. uint96 totalRoyalty - the total amount of royalties (for example, if platform commission is 1% and user’s royalties are 5%, then totalRoyalty == 6%)
4. address storageContract - Storage contract address
5. uint256 mintPrice - Current mint price
6. uint256 whitelistMintPrice - Mint price for whitelisted users
7. bool transferable - Flag indicating whether the token is transferable or not
8. uint256 totalSupply - The current total supply
9. uint256 maxTotalSupply - The max amount of tokens to be minted
10. string contractURI - Contract URI (for OpenSea)
11. address constant ETH - mock ETH address  
12. metadataUri - token ID -> metadata link mapping
13. creationTs - token ID -> the timestamp of token creation mapping
14. collectionExpire - The period of time in which collection is expired (for the BE)

##### 2.2.1.2. Functions

Belong NFT has the following functions:
1. initialize(
    [
        address _storageContract,
        address _payingToken,
        uint256 _mintPrice,
        string memory _contractURI,
        string memory _erc721name,
        string memory _erc721shortName,
        bool _transferable,
        uint256 _maxTotalSupply,
        address _feeReceiver,
        uint96 _feeNumerator,
        address _creator
    ]
): Handles configurations and sets related parameters
2. mint(
    address reciever,
    uint256 tokenId,
    string calldata tokenUri,
    bool whitelisted,
    bytes calldata signature
) - Mints ERC721 token
3. tokenURI(uint256 _tokenId) - Returns metadata link for specified ID
4. setPayingToken(
        address _payingToken, 
        uint256 _mintPrice, 
        uint256 _whitelistMintPrice
    ) - Sets paying token, mint price and whitelist mint price
5. owner() - Overridden function from Ownable contract. Owner of the contract is always the platform address. Otherwise the user will be able to change royalty information on the marketplaces

##### Update corresponding to new OpenSea royalties requirements
In order to satisfy new OpenSea requirements considering royalties functions listed below were overridden:
1. setApprovalForAll(address operator, bool approved)
2. approve(address operator, uint256 tokenId)
3. transferFrom(address from, address to, uint256 tokenId)
4. safeTransferFrom(address from, address to, uint256 tokenId)
5. safeTransferFrom(address from, address to, uint256 tokenId, bytes memory data)
and now can revert if called from one of addresses (or with certain parameters) in list governed by OpenSea
This list can be changed by OpenSea at any time and this will take an immediate effect
Risks were acknowledged and evaluted

#### 2.2.2. Factory.sol
Produces new instances of NFT contract and registers them in the StorageContract. The NFT contract can be deployed by anyone. Factory also contains data about platform commission, platform address and signer address. All NFT contracts deployed with Factory use current parameters from the Factory contract.

##### 2.2.2.1. Assets
Belong NFT Factory contains the following struct:

    struct InstanceInfo {
        string name;    - name of a new collection
        string symbol;  - symbol of a new collection
        string contractURI; - contract URI of a new collection
        address payingToken; - paying token of a new collection
        uint256 mintPrice;  - mint price ofany token of a new collection
        bool transferable;  - shows if tokens will be transferrable or not
        uint256 maxTotalSupply; - max total supply of a new collection
        address feeReceiver;    - royalties receiver for the collection (must be RoyaltiesReceiver contract address)
        uint96 feeNumerator;    - total fee amount (in BPs - base points, 0.01%) of a new collection (sum of creator royalties BPs and platform royalties BPs). Must be <= 1000 (10%)
        bytes signature;    - BE's signature
    }

This structure should be passed to the produce function to deploy a new NFT collection

Belong NFT Factory contains the following entities:

1. address platformAddress - Platform address
2. address storageContract - Storage contract address
3. address signerAddress - Signer address
4. uint8 platformCommission - Platform commission percentage

##### 2.2.2.2. Functions
Belong NFT Factory has the following functions:
1. initialize(
    address _signer,
    address _platformAddress,
    uint8 _platformCommission,
    address _storageContract
): Handles configurations and sets related parameters
2. produce(InstanceInfo memory _info) - Produces the new instance with defined name and symbol
3. setPlatformCommission(uint8 _platformCommission) - Sets platform commission
4. setPlatformAddress(address _platformAddress) - Sets platform address
5. setSigner(address _signer) - Sets signer address



#### 2.2.3. StorageContract.sol
Contains information about registered NFT instances (as Factory implementation can be changed)
##### 2.2.3.1. Assets
Belong Storage contract contains the following strucrure:
struct InstanceInfo {
        string name;
        string symbol;
        address creator;
} - The information about an instance (its name, symbol, creator address)

Belong Storage contract contains the following entities:

1. address factory - Factory address
2. getInstance - keccak256("name", "symbol") => instance address mapping
3. address[] instances - Instances’ array

##### 2.2.3.2. Functions
Belong Storage contract has the following functions:
1. getInstanceInfo(uint256 instanceId) Returns instance info by its ID
2. instancesCount() - Returns the count of instances
3. setFactory(address _factory) - Sets the factory address
4. addInstance(
    address instanceAddress,
    address creator,
    string memory name,
    string memory symbol
) - Adds new instance with passed parameters. Can be called only by factory



#### 2.2.4. RoyaltiesReceiver.sol
Must be deployed before the deployment of a new NFT collection (via ReceiverFactory) and passed to Factory's produce() function as a fee receiver. It will split upcoming tokens/ETH between the creator and the platform. It's a fork of OZ's PaymentSplitter with some changes. The only change is that common release() functions are replaced with releaseAll() functions which allow the caller to transfer funds for only both the creator and the platform.
##### 2.2.4.1. Assets
_(Forked from OZ's PaymentSplitter)_
##### 2.2.4.2. Functions
_(Forked from OZ's PaymentSplitter except for release() functions)_

They were replaced with the following functions:
1. releaseAll() - claims all available ETH to both creator and the platform. Can be called by anyone
2. releaseAll() - claims all available ERC20 token to both creator and the platform. Can be called by anyone

#### 2.2.5. ReceiverFactory.sol
Deploys RoyaltiesReceiver instances 
##### 2.2.5.1. Functions

1. deployReceiver(address[] memory payees, uint256[] memory shares_) - Deploys instance of RoyaltiesReceiver with specified fee receiver addresses and their shares. In our case, the receivers will be a creator and the platform address. The sum of both shares must be equal to 10000. Because of that the specified creator royalties and platform fees must be converted to shares with the next formulas:


    platform_shares = 10000/(x/p + 1)
    creator_shares = 10000 - platform_shares

    where x - creators’s BPs (input on FE)
    p - platform fee BPs (default is 100)

## 3. Additional Explanations

### 3.1. Platform Comission and Royalties
For every NFT contract deployed feeReceiver and feeNumerator parameters are used during its construction.
These parameters do not affect the internal logic in any significant way and only used to apply with ERC2981 standart

Whether ERC2981 is enforced and used or not is entirely up to third parties (NFT marketplaces)

Considering mint fees - a different logic is used:
Each time a `mint()` function is called on any NFT contract, two parameters are received from the Factory contract: `platformCommission` and `platformAddress`. The `mint()` function in the NFT contract then enforces mint fees based on these parameters. If a referrer is present, the platform commission is split equally between the platform and the referrer.
These parameters are: platformCommission and platformAddress
Based on these parameters mint fees are enforced
 Whether ERC2981 is enforced and used or not is entirely up to third parties (NFT marketplaces).
 
 Considering mint fees - a different logic is used:
-Each time a mint() function is called on any NFT contract - given NFT contract receives two parameters from Factory contract
+When the `mint()` function is called on an NFT contract, it enforces mint fees based on `platformCommission` and `platformAddress` received from the Factory contract. If a referrer exists, the commission is shared equally between the platform and the referrer.
 These parameters are: platformCommission and platformAddress
 Based on these parameters mint fees are enforced

## Smart Contract

### Conditions under which Treasury is created

1. mintPrice=0&Royalties=0 => Create Contract (feeReciever='address user wallet')
2. mintPrice=0.01&Royalties=0(+2% platform fee) => Create fee reciever
3. mintPrice=0.01&Royalties=1(+2% platform fee) => Create fee reciever
4. mintPrice=0&Royalties=1(+2% platform fee) => Create fee reciever
## Referral System Overview
The project now includes a decentralized referral system. This system allows referrers to earn a commission from the sales (NFT mints) made by the users they referred. The referral relationships and commission calculations are managed by smart contracts on the blockchain, ensuring transparency and security.

### ReferralManager Contract
- **Purpose**: Manages the referral relationships between users.
- **Key Functions**:
  - `setReferrer(address organizer, address referrer)`: Registers a referrer for a new user (organizer).
  - `getReferrer(address organizer)`: Retrieves the referrer for a given user.

### Factory Contract Modifications
- **Referral Integration**: The Factory contract now interacts with the ReferralManager to handle referral information when creating new NFT contracts.
- **Key Changes**:
  - Integration with ReferralManager to set and retrieve referrer information for each organizer.

### NFT Contract Modifications
- **Referral Commission Logic**: The NFT contracts now include functionality to handle the referral commissions during the minting process.
- **Key Changes**:
  - Logic to calculate and transfer a commission, which is 50% of the platform commission, to the referrer's wallet.

### Using the Referral System
1. **Setting a Referrer**: Use the `setReferrer` function in the ReferralManager contract to establish a referral relationship.
2. **Creating NFT Contracts**: When a new NFT contract is created through the Factory, it checks for a referrer and sets it in the NFT contract.
3. **Minting NFTs**: Upon minting an NFT, if a referrer is set, a commission is automatically calculated and transferred to the referrer.

### Running Tests
The project includes comprehensive tests for the new referral system. To run these tests:
```bash
npx hardhat test
```
```diff
@@ -264,7 +264,7 @@
+  - Logic to calculate and transfer a commission, which is 50% of the platform commission, to the referrer's wallet.

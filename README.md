# Belong.net

## Project Overview

The protocol allows users to create their own NFT collection, whose tokens represent invitations to the corresponding hub (community). All the collections are deployed via Factory contract. Users must specify the name, the symbol, contractURI, paying token address, mint price, max collection size and the flag which shows if NFTs of the collection will be transferable or not. The name, symbol and contractURI and other parameters (such a royalties size and its receiver) need to be moderated on the backend, so BE’s signature will be needed for the deployment. The factory implementation can be changed so the information about deployed collections is stored in the separate Storage contract. Factory will be deployed via proxy.

## 1. Functional Requirements

### 1.1. Roles
Belong NFT project has several roles:
1. The owner: Controls the platform commission, can configure Factory and Storage contracts. 
2. Creator: Collection creator can set the mint price and the paying token of his/her collection. He/she will receive funds from primary sales and some fraction of royalties from secondary sales. He/she can withdraw the funds assigned for him/her from the contract at any moment. 
3. Platform address: Receives the royalties from the secondary sales and commissions from primary sales 
4. Signer: The platform’s BE which moderates the data and gives its approvement if requirements are met
5. User: Can create his/her own collection (with signer’s approval), mint tokens in his own or other collections (with signer’s approval)

### 1.2. Features
Belong NFT project has the following features:
* Create a new collection. (Everyone with signer’s approval)
* Get the information about the deployed collections. (Everyone)
* Mint token from any collection. (Everyone with signer’s approval)
* Send funds from primary and secondary sales to platform’s and creators wallets (Everyone)
* Set paying token (Collection owner)
* Set mint price (Collection owner)
* Set platform commission (The owner)
* Set platform address at the Factory contract (The owner)
* Set signer address at the Factory contract (The owner)
* Set factory address at the Storage contract (The owner)

### 1.3 Use Cases
#### Collection creation
1. User specify the settings of his collection (name, symbol, contractURI with royalty information, mint price, paying token, royalties and “transferable” flag) on the front-end
2. The BE (or a user) deploys RoyaltiesReceiver contract
3. The BE checks if name, symbol and royalties size comply with the rules 
4. BE creates [contractURI](https://docs.opensea.io/docs/contract-level-metadata) JSON file and uploads it to some hosting 
5. BE signs the collection data (along with RoyaltiesReceiver address)
6. Now user can call produce() function on Factory contract. A new nft collection will be deployed and the user becomes the creator (not owner) of the new smart contract 

#### Mint token from the collection
1. If some other user wants to mint a new token in this collection, his/her account will have to be validated by the BE
2. BE generates tokenURI for the new token
3. If the account meets all the requirements and tokenURI is successfully generated, the BE signs the data for mint
4. The user calls the mint() function of the NFT contract

If the mint price is larger than zero, the contract will collect ETH/ERC20 from every primary sale. Some fraction of this money will be transferred to the platform immediatelly and the rest will be transferred to the creator. 
The owner of the factory can set other platform commission. The creator of the collection can change paying token as well as the mint price.
NFTs can be marked as nontransferable at the moment of the deployment. In this case it will be impossible to transfer any NFT to another address or sell it to anyone. The transferable option cannot be changed
If NFT was sold on a marketplace, a corresponding RoyaltiesReceiver contract will receive royalties and it will be distributed between the creator and the platform.

## 2. Technical Requirements

### 2.1. Architecture Overview


![Scheme2](https://sun9-62.userapi.com/impf/4J1NleLlyMX2svlvK_Z7Yl4qNn8dJEBXHz4NJQ/RJCsKH9i0OA.jpg?size=1752x718&quality=96&sign=27dc1603d76970e46402b779fb9049e1&type=album)
![Scheme](https://sun9-33.userapi.com/impf/voCxpBdgbX9jg6wX-KSdl_f1qLLh4D00OjEPUw/uoOyCsjyWqg.jpg?size=1122x1312&quality=95&sign=c08481983f8be8c9e1316baca5a5e6ff&type=album)


### 2.2. Contract Information
This section contains detailed information (their purpose, assets, functions,
and events) about the contracts used in the project.
#### 2.2.1. NFT.sol
ERC721 token contract with different payment options and security advancements. Mints tokens from this collection if valid BE signature was provided. Also allows to collect funds for the collection owner and the platform. 
##### 2.2.1.1. Assets
Belong NFT contains the following entities:
1. address payingToken - Current token accepted as a mint payment
2. address creator - Collection creator address
3. uint96 totalRoyalty - total amount of royalties (for example, if platform commission is 1% and user’s royalties is 5%, then totalRoyalty == 6%)
4. address storageContract - Storage contract address
5. uint256 mintPrice - Current mint price
6. bool transferable - Flag if the tokens transferable or not
7. uint256 totalSupply - The current totalSupply
8. uint256 maxTotalSupply - The max amount of tokens to be minted
9. string contractURI - Contract URI (for OpenSea)
10. address constant ETH - mock ETH address  
11. metadataUri - token ID -> metadata link mapping

##### 2.2.1.2. Functions
Belong NFT has the following functions:
1. initialize(
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
): Handles configurations and sets related parameters
2. mint(
    address reciever,
    uint256 tokenId,
    string calldata tokenUri,
    bytes calldata signature
) - Mints ERC721 token
3. tokenURI(uint256 _tokenId) - Returns metadata link for specified ID
5. setPayingToken(address _payingToken) - Sets paying token
6. setMintPrice(uint256 _mintPrice) - Sets mint price
8. owner() - Overridden function from Ownable contract. Owner of the contract is always the platform address. Otherwise the user will be able to change royalty information on the marketplaces

#### 2.2.2. Factory.sol
Produces new instances of NFT contract and registrate them in StorageContract. NFT contract can be deployed by anyone. Factory also contains data about platform comission, platform address and signer address. All NFT contracts deployed with Factory use current parameters from Factory contract.

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
        uint96 feeNumerator;    - total fee amount (in BPS) of a new collection
        bytes signature;    - BE's signature
}

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
2. produce(InstanceInfo memory _info) - Produces new instance with defined name and symbol
3. setPlatformCommission(uint8 _platformCommission) - Sets platform commission
4. setPlatformAddress(address _platformAddress) - Sets platform address
5. setSigner(address _signer) - Sets signer address



#### 2.2.3. StorageContract.sol
Contains information about registered NFT instances (as Factory implementation can be changed)
##### 2.2.1.1. Assets
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

##### 2.2.1.2. Functions
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
Must be deployed before the deployment of a new NFT collection and passed to Factory's produce() function as a fee receiver. It will split upcoming tokens/ETH between the creator and the platform. It's a fork of OZ's PaymentSplitter with some changes. The only changes is that common release() functions are replaced with releaseAll() functions which allow the caller to transfer funds for only both the creator and the platform.
##### 2.2.1.1. Assets
_(Forked from OZ's PaymentSplitter)_
##### 2.2.1.2. Functions
_(Forked from OZ's PaymentSplitter except for release() functions)_

They were replaced with the following functions:
1. releaseAll() - claims all available ETH to both creator and the platform. Can be called by anyone
1. releaseAll() - claims all available ERC20 token to both creator and the platform. Can be called by anyone



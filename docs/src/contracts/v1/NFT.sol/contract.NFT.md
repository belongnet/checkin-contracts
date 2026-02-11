# NFT
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/NFT.sol)

**Inherits:**
ERC721, ERC2981, Ownable, [CreatorToken](/contracts/utils/CreatorToken.sol/abstract.CreatorToken.md)

**Title:**
NFT Contract

Implements the minting and transfer functionality for NFTs, including transfer validation and royalty management.

This contract inherits from BaseERC721 and implements additional minting logic, including whitelist support and fee handling.


## State Variables
### ETH_ADDRESS
The constant address representing ETH.


```solidity
address public constant ETH_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
```


### totalSupply
The current total supply of tokens.


```solidity
uint256 public totalSupply
```


### autoApproveTransfersFromValidator
If true, the collection's transfer validator is automatically approved to transfer token holders' tokens.


```solidity
bool private autoApproveTransfersFromValidator
```


### metadataUri
Mapping of token ID to its metadata URI.


```solidity
mapping(uint256 => string) public metadataUri
```


### parameters
The struct containing all NFT parameters for the collection.


```solidity
NftParameters public parameters
```


## Functions
### constructor

Deploys the contract with the given collection parameters and transfer validator.

Called by the factory when a new instance is deployed.


```solidity
constructor(NftParameters memory _params) ;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_params`|`NftParameters`|Collection parameters containing information like name, symbol, fees, and more.|


### setNftParameters

Sets a new paying token and mint prices for the collection.

Can only be called by the contract owner.


```solidity
function setNftParameters(address _payingToken, uint128 _mintPrice, uint128 _whitelistMintPrice, bool autoApprove)
    external
    onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_payingToken`|`address`|The new paying token address.|
|`_mintPrice`|`uint128`|The new mint price.|
|`_whitelistMintPrice`|`uint128`|The new whitelist mint price.|
|`autoApprove`|`bool`|If true, the transfer validator will be automatically approved for all token holders.|


### mintStaticPrice

Mints new NFTs with static prices to a specified receiver.

Requires signatures from a trusted signer and validates whitelist status per item.
Reverts if `paramsArray.length` exceeds factory `maxArraySize`.


```solidity
function mintStaticPrice(
    address receiver,
    StaticPriceParameters[] calldata paramsArray,
    address expectedPayingToken,
    uint256 expectedMintPrice
) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`receiver`|`address`|The address that will receive all newly minted tokens.|
|`paramsArray`|`StaticPriceParameters[]`|Array of parameters for each mint (tokenId, tokenUri, whitelisted, signature).|
|`expectedPayingToken`|`address`|The expected token used for payments (ETH pseudo-address or ERC-20).|
|`expectedMintPrice`|`uint256`|The expected total price for the minting operation.|


### mintDynamicPrice

Mints new NFTs with dynamic prices to a specified receiver.

Requires signatures from a trusted signer. Each item provides its own price.
Reverts if `paramsArray.length` exceeds factory `maxArraySize`.


```solidity
function mintDynamicPrice(
    address receiver,
    DynamicPriceParameters[] calldata paramsArray,
    address expectedPayingToken
) external payable;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`receiver`|`address`|The address that will receive all newly minted tokens.|
|`paramsArray`|`DynamicPriceParameters[]`|Array of parameters for each mint (tokenId, tokenUri, price, signature).|
|`expectedPayingToken`|`address`|The expected token used for payments (ETH pseudo-address or ERC-20).|


### tokenURI

Returns the metadata URI for a specific token ID.


```solidity
function tokenURI(uint256 _tokenId) public view override returns (string memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_tokenId`|`uint256`|The ID of the token.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The metadata URI associated with the given token ID.|


### name

Returns the name of the token collection.


```solidity
function name() public view override returns (string memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The name of the token.|


### symbol

Returns the symbol of the token collection.


```solidity
function symbol() public view override returns (string memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The symbol of the token.|


### contractURI

Returns the contract URI for the collection.


```solidity
function contractURI() external view returns (string memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The contract URI.|


### isApprovedForAll

Checks if an operator is approved to manage all tokens of a given owner.

Overrides the default behavior to automatically approve the transfer validator if enabled.


```solidity
function isApprovedForAll(address _owner, address operator) public view override returns (bool isApproved);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_owner`|`address`|The owner of the tokens.|
|`operator`|`address`|The operator trying to manage the tokens.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`isApproved`|`bool`|Whether the operator is approved for all tokens of the owner.|


### supportsInterface

Returns true if this contract implements the interface defined by `interfaceId`.
See: https://eips.ethereum.org/EIPS/eip-165
This function call must use less than 30000 gas.


```solidity
function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool);
```

### _baseMint

Mints a new token and assigns it to a specified address.

Increases totalSupply, stores metadata URI, and creation timestamp.


```solidity
function _baseMint(uint256 tokenId, address to, string calldata tokenUri) internal;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|The ID of the token to be minted.|
|`to`|`address`|The address that will receive the newly minted token.|
|`tokenUri`|`string`|The metadata URI associated with the token.|


### _pay

Handles payment routing for mints (ETH or ERC-20), splitting platform and referral fees.

Validates that `expectedPayingToken` matches configured currency; emits [Paid](/contracts/v1/NFT.sol/contract.NFT.md#paid).


```solidity
function _pay(uint256 price, address expectedPayingToken) private returns (uint256 amount);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`price`|`uint256`|Total expected amount to charge.|
|`expectedPayingToken`|`address`|Expected payment currency (ETH pseudo-address or ERC-20).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|Amount actually charged (wei or token units).|


### _beforeTokenTransfer

Hook that is called before any token transfers, including minting and burning.


```solidity
function _beforeTokenTransfer(address from, address to, uint256 id) internal override;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`from`|`address`|The address tokens are being transferred from.|
|`to`|`address`|The address tokens are being transferred to.|
|`id`|`uint256`|The token ID being transferred.|


## Events
### Paid
Event emitted when a payment is made to the PricePoint.


```solidity
event Paid(address indexed sender, address paymentCurrency, uint256 value);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|The address that made the payment.|
|`paymentCurrency`|`address`|The currency used for the payment.|
|`value`|`uint256`|The amount of the payment.|

### NftParametersChanged
Emitted when the paying token and prices are updated.


```solidity
event NftParametersChanged(address newToken, uint256 newPrice, uint256 newWLPrice, bool autoApproved);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`newToken`|`address`|The address of the new paying token.|
|`newPrice`|`uint256`|The new mint price.|
|`newWLPrice`|`uint256`|The new whitelist mint price.|
|`autoApproved`|`bool`|The new value of the automatic approval flag.|


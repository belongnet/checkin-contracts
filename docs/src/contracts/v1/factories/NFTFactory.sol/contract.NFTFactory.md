# NFTFactory
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/9a5d5791960776da326b790b7c18e7af6b05a3aa/contracts/v1/factories/NFTFactory.sol)

**Inherits:**
Initializable, Ownable, [ReferralSystem](/contracts/v1/factories/utils/ReferralSystem.sol/abstract.ReferralSystem.md)

**Title:**
NFT Factory Contract

A factory contract to create new NFT instances with specific parameters.

This contract allows producing NFTs, managing platform settings, and verifying signatures.


## State Variables
### _nftFactoryParameters
A struct that contains the NFT factory parameters.


```solidity
NftFactoryParameters private _nftFactoryParameters
```


### getNftInstanceInfo
A mapping from keccak256(name, symbol) to the NFT instance address.


```solidity
mapping(bytes32 => NftInstanceInfo) public getNftInstanceInfo
```


## Functions
### constructor

**Note:**
oz-upgrades-unsafe-allow: constructor


```solidity
constructor() ;
```

### initialize

Initializes the contract with NFT factory parameters and referral percentages.


```solidity
function initialize(NftFactoryParameters calldata nftFactoryParameters_, uint16[5] calldata percentages)
    external
    initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`nftFactoryParameters_`|`NftFactoryParameters`|The NFT factory parameters to be set.|
|`percentages`|`uint16[5]`|The referral percentages for the system.|


### produce

Produces a new NFT instance.

Creates a new instance of the NFT and adds the information to the storage contract.


```solidity
function produce(InstanceInfo memory _info, bytes32 referralCode) external returns (address nftAddress);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_info`|`InstanceInfo`|Struct containing the details of the new NFT instance.|
|`referralCode`|`bytes32`|The referral code associated with this NFT instance.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`nftAddress`|`address`|The address of the created NFT instance.|


### setFactoryParameters

Sets new factory parameters.

Can only be called by the owner (BE).


```solidity
function setFactoryParameters(NftFactoryParameters calldata nftFactoryParameters_, uint16[5] calldata percentages)
    external
    onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`nftFactoryParameters_`|`NftFactoryParameters`|The NFT factory parameters to be set.|
|`percentages`|`uint16[5]`|Array of five BPS values mapping usage count (0..4) to a referral percentage.|


### nftFactoryParameters

Returns the current NFT factory parameters.


```solidity
function nftFactoryParameters() external view returns (NftFactoryParameters memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`NftFactoryParameters`|The NFT factory parameters.|


## Events
### NFTCreated
Event emitted when a new NFT is created.


```solidity
event NFTCreated(bytes32 indexed _hash, NftInstanceInfo info);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_hash`|`bytes32`|The keccak256 hash of the NFT's name and symbol.|
|`info`|`NftInstanceInfo`|The information about the created NFT instance.|

### FactoryParametersSet
Event emitted when the new factory parameters set.


```solidity
event FactoryParametersSet(NftFactoryParameters nftFactoryParameters, uint16[5] percentages);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`nftFactoryParameters`|`NftFactoryParameters`|The NFT factory parameters to be set.|
|`percentages`|`uint16[5]`|The referral percentages for the system.|


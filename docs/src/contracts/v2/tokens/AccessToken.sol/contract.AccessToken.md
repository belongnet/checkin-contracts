# AccessToken
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v2/tokens/AccessToken.sol)

**Inherits:**
Initializable, UUPSUpgradeable, ERC721, ERC2981, Ownable, ReentrancyGuard, [CreatorToken](/contracts/utils/CreatorToken.sol/abstract.CreatorToken.md)

**Title:**
AccessToken

Upgradeable ERC-721 collection with royalty support, signature-gated minting,
optional auto-approval for a transfer validator, and platform/referral fee routing.


- Deployed via `Factory` using UUPS (Solady) upgradeability.
- Royalties use ERC-2981 with a fee receiver deployed by the factory when `feeNumerator > 0`.
- Payments can be in NativeCurrency or an ERC-20 token; platform fee and referral split are applied.
- Transfer validation is enforced via `CreatorToken` when transfers are enabled.
- `mintStaticPrice` and `mintDynamicPrice` are signature-gated (see `SignatureVerifier`).


## State Variables
### NATIVE_CURRENCY_ADDRESS
Pseudo-address used to represent NativeCurrency in payment flows.


```solidity
address public constant NATIVE_CURRENCY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
```


### PLATFORM_COMISSION_DENOMINATOR
Denominator for platform commission calculations (basis points).

A value of 10_000 corresponds to 100% (i.e., BPS math).


```solidity
uint16 public constant PLATFORM_COMISSION_DENOMINATOR = 10_000
```


### totalSupply
Number of tokens minted so far.


```solidity
uint256 public totalSupply
```


### autoApproveTransfersFromValidator
If true, the configured transfer validator is auto-approved for all holders.


```solidity
bool private autoApproveTransfersFromValidator
```


### metadataUri
Token ID → metadata URI mapping.


```solidity
mapping(uint256 => string) public metadataUri
```


### parameters
Immutable-like parameters set during initialization.


```solidity
AccessTokenParameters public parameters
```


## Functions
### expectedTokenCheck

Ensures the provided payment token matches the configured token.


```solidity
modifier expectedTokenCheck(address token) ;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`token`|`address`|Expected payment token (NativeCurrency pseudo-address or ERC-20).|


### constructor

**Note:**
oz-upgrades-unsafe-allow: constructor


```solidity
constructor() ;
```

### initialize

Initializes the collection configuration and sets royalty and validator settings.

Called exactly once by the factory when deploying the collection proxy.


```solidity
function initialize(AccessTokenParameters calldata _params, address transferValidator_) external initializer;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_params`|`AccessTokenParameters`|AccessToken initialization parameters (see `AccessTokenParameters`).|
|`transferValidator_`|`address`|Transfer validator contract (approved depending on `autoApprove` flag).|


### setNftParameters

Owner-only: updates paying token and mint prices; toggles auto-approval of validator.


```solidity
function setNftParameters(address _payingToken, uint128 _mintPrice, uint128 _whitelistMintPrice, bool autoApprove)
    external
    onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_payingToken`|`address`|New paying token (use `NATIVE_CURRENCY_ADDRESS` for NativeCurrency).|
|`_mintPrice`|`uint128`|New public mint price.|
|`_whitelistMintPrice`|`uint128`|New whitelist mint price.|
|`autoApprove`|`bool`|If true, `isApprovedForAll` auto-approves the transfer validator.|


### mintStaticPrice

Signature-gated batch mint with static prices (public or whitelist).


- Validates each entry via factory signer (`checkStaticPriceParameters`).
- Computes total due based on whitelist flags and charges payer in NativeCurrency or ERC-20.
- Reverts if `paramsArray.length` exceeds factory’s `maxArraySize`.


```solidity
function mintStaticPrice(
    address expectedPayingToken,
    uint256 expectedMintPrice,
    address[] calldata receivers,
    StaticPriceParameters[] calldata staticPriceParameters,
    SignatureVerifier.SignatureProtection[] calldata protections
) external payable expectedTokenCheck(expectedPayingToken) nonReentrant;
```

### mintDynamicPrice

Signature-gated batch mint with per-item dynamic prices.


- Validates each entry via factory signer (`checkDynamicPriceParameters`).
- Sums prices provided in the payload and charges payer accordingly.
- Reverts if `paramsArray.length` exceeds factory’s `maxArraySize`.


```solidity
function mintDynamicPrice(
    address expectedPayingToken,
    address[] calldata receivers,
    DynamicPriceParameters[] calldata dynamicPriceParameters,
    SignatureVerifier.SignatureProtection[] calldata protections
) external payable expectedTokenCheck(expectedPayingToken) nonReentrant;
```

### tokenURI

Returns metadata URI for a given token ID.


```solidity
function tokenURI(uint256 _tokenId) public view override returns (string memory);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_tokenId`|`uint256`|Token ID to query.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The token URI string.|


### staticMintPrice


```solidity
function staticMintPrice(bool isWhitelisted) public view returns (uint256);
```

### name

Collection name.


```solidity
function name() public view override returns (string memory);
```

### symbol

Collection symbol.


```solidity
function symbol() public view override returns (string memory);
```

### contractURI

Contract-level metadata URI for marketplaces.


```solidity
function contractURI() external view returns (string memory);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`string`|The contract URI.|


### isApprovedForAll

Checks operator approval for all tokens of `_owner`.

Auto-approves the transfer validator when `autoApproveTransfersFromValidator` is true.


```solidity
function isApprovedForAll(address _owner, address operator) public view override returns (bool isApproved);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`_owner`|`address`|Token owner.|
|`operator`|`address`|Operator address to check.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`isApproved`|`bool`|True if approved.|


### selfImplementation

Returns the current implementation address (UUPS).


```solidity
function selfImplementation() external view virtual returns (address);
```
**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`|implementation Address of the implementation logic contract.|


### supportsInterface

EIP-165 interface support.


```solidity
function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`interfaceId`|`bytes4`|Interface identifier.|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`bool`|True if supported.|


### _baseMint

Internal mint helper that enforces supply cap and stores metadata.


```solidity
function _baseMint(uint256 tokenId, address to, string calldata tokenUri) private;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`tokenId`|`uint256`|Token ID to mint.|
|`to`|`address`|Recipient address.|
|`tokenUri`|`string`|Metadata URI to set for the token.|


### _pay

Handles payment routing for mints (NativeCurrency or ERC-20).


- Validates `expectedPayingToken` against configured payment token.
- Splits platform commission and referral share, then forwards remainder to creator.
- Emits [Paid](/contracts/v2/tokens/AccessToken.sol/contract.AccessToken.md#paid).


```solidity
function _pay(uint256 price, address expectedPayingToken) private returns (uint256 amount);
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`price`|`uint256`|Expected total price to charge.|
|`expectedPayingToken`|`address`|Expected payment currency (NativeCurrency or ERC-20).|

**Returns**

|Name|Type|Description|
|----|----|-----------|
|`amount`|`uint256`|Amount actually charged (wei or token units).|


### _beforeTokenTransfer

Hook executed before transfers, mints, and burns.


- For pure transfers (non-mint/burn), enforces `transferable` and validates via `_validateTransfer`.


```solidity
function _beforeTokenTransfer(address from, address to, uint256 id) internal override;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`from`|`address`|Sender address (zero for mint).|
|`to`|`address`|Recipient address (zero for burn).|
|`id`|`uint256`|Token ID being moved.|


### _authorizeUpgrade

Authorizes UUPS upgrades; restricted to owner.


```solidity
function _authorizeUpgrade(
    address /*newImplementation*/
)
    internal
    override
    onlyOwner;
```
**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`<none>`|`address`||


## Events
### Paid
Emitted after a successful mint payment.


```solidity
event Paid(address indexed sender, address paymentCurrency, uint256 value);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`sender`|`address`|Payer address.|
|`paymentCurrency`|`address`|NativeCurrency pseudo-address or ERC-20 token used for payment.|
|`value`|`uint256`|Amount paid (wei for NativeCurrency; token units for ERC-20).|

### NftParametersChanged
Emitted when mint parameters are updated by the owner.


```solidity
event NftParametersChanged(address newToken, uint256 newPrice, uint256 newWLPrice, bool autoApproved);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`newToken`|`address`|Paying token address.|
|`newPrice`|`uint256`|Public mint price (token units or wei).|
|`newWLPrice`|`uint256`|Whitelist mint price (token units or wei).|
|`autoApproved`|`bool`|Whether the transfer validator is auto-approved for all holders.|

## Errors
### IncorrectNativeCurrencyAmountSent
Sent when the provided NativeCurrency amount is not equal to the required price.


```solidity
error IncorrectNativeCurrencyAmountSent(uint256 nativeCurrencyAmountSent);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`nativeCurrencyAmountSent`|`uint256`|Amount of NativeCurrency sent with the transaction.|

### PriceChanged
Sent when the expected mint price no longer matches the effective price.


```solidity
error PriceChanged(uint256 currentPrice);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currentPrice`|`uint256`|The effective price computed by the contract.|

### TokenChanged
Sent when the expected paying token differs from the configured token.


```solidity
error TokenChanged(address currentPayingToken);
```

**Parameters**

|Name|Type|Description|
|----|----|-----------|
|`currentPayingToken`|`address`|The currently configured paying token.|

### WrongArraySize
Sent when a provided array exceeds the max allowed size from factory parameters.


```solidity
error WrongArraySize();
```

### NotTransferable
Sent when a transfer is attempted while transfers are disabled or not allowed.


```solidity
error NotTransferable();
```

### TotalSupplyLimitReached
Sent when minting would exceed the collection total supply.


```solidity
error TotalSupplyLimitReached();
```

### TokenIdDoesNotExist
Sent when querying a token that has not been minted.


```solidity
error TokenIdDoesNotExist();
```

## Structs
### AccessTokenParameters
Parameters used to initialize a newly deployed AccessToken collection.

Populated by the factory at creation and stored immutably in `parameters`.


```solidity
struct AccessTokenParameters {
    /// @notice Factory that deployed the collection; provides global settings and signer.
    Factory factory;
    /// @notice Receiver of ERC-2981 royalties (if any).
    address feeReceiver;
    /// @notice Referral code attached to this collection (optional).
    bytes32 referralCode;
    /// @notice Collection info (name, symbol, prices, supply cap, payment token, etc.).
    AccessTokenInfo info;
}
```


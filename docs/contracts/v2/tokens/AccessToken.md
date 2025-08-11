# Solidity API

## AccessToken

Upgradeable ERC-721 collection with royalty support, signature-gated minting,
        optional auto-approval for a transfer validator, and platform/referral fee routing.
@dev
- Deployed via `Factory` using UUPS (Solady) upgradeability.
- Royalties use ERC-2981 with a fee receiver deployed by the factory when `feeNumerator > 0`.
- Payments can be in ETH or an ERC-20 token; platform fee and referral split are applied.
- Transfer validation is enforced via `CreatorToken` when transfers are enabled.
- `mintStaticPrice` and `mintDynamicPrice` are signature-gated (see `SignatureVerifier`).

### IncorrectETHAmountSent

```solidity
error IncorrectETHAmountSent(uint256 ETHsent)
```

Sent when the provided ETH amount is not equal to the required price.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| ETHsent | uint256 | Amount of ETH sent with the transaction. |

### PriceChanged

```solidity
error PriceChanged(uint256 currentPrice)
```

Sent when the expected mint price no longer matches the effective price.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentPrice | uint256 | The effective price computed by the contract. |

### TokenChanged

```solidity
error TokenChanged(address currentPayingToken)
```

Sent when the expected paying token differs from the configured token.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| currentPayingToken | address | The currently configured paying token. |

### WrongArraySize

```solidity
error WrongArraySize()
```

Sent when a provided array exceeds the max allowed size from factory parameters.

### NotTransferable

```solidity
error NotTransferable()
```

Sent when a transfer is attempted while transfers are disabled or not allowed.

### TotalSupplyLimitReached

```solidity
error TotalSupplyLimitReached()
```

Sent when minting would exceed the collection total supply.

### TokenIdDoesNotExist

```solidity
error TokenIdDoesNotExist()
```

Sent when querying a token that has not been minted.

### Paid

```solidity
event Paid(address sender, address paymentCurrency, uint256 value)
```

Emitted after a successful mint payment.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| sender | address | Payer address. |
| paymentCurrency | address | ETH pseudo-address or ERC-20 token used for payment. |
| value | uint256 | Amount paid (wei for ETH; token units for ERC-20). |

### NftParametersChanged

```solidity
event NftParametersChanged(address newToken, uint256 newPrice, uint256 newWLPrice, bool autoApproved)
```

Emitted when mint parameters are updated by the owner.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newToken | address | Paying token address. |
| newPrice | uint256 | Public mint price (token units or wei). |
| newWLPrice | uint256 | Whitelist mint price (token units or wei). |
| autoApproved | bool | Whether the transfer validator is auto-approved for all holders. |

### AccessTokenParameters

Parameters used to initialize a newly deployed AccessToken collection.

_Populated by the factory at creation and stored immutably in `parameters`._

```solidity
struct AccessTokenParameters {
  contract Factory factory;
  address creator;
  address feeReceiver;
  bytes32 referralCode;
  struct AccessTokenInfo info;
}
```

### ETH_ADDRESS

```solidity
address ETH_ADDRESS
```

Pseudo-address used to represent ETH in payment flows.

### totalSupply

```solidity
uint256 totalSupply
```

Number of tokens minted so far.

### metadataUri

```solidity
mapping(uint256 => string) metadataUri
```

Token ID → metadata URI mapping.

### parameters

```solidity
struct AccessToken.AccessTokenParameters parameters
```

Immutable-like parameters set during initialization.

### constructor

```solidity
constructor() public
```

### initialize

```solidity
function initialize(struct AccessToken.AccessTokenParameters _params, address transferValidator_) external
```

Initializes the collection configuration and sets royalty and validator settings.

_Called exactly once by the factory when deploying the collection proxy._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _params | struct AccessToken.AccessTokenParameters | AccessToken initialization parameters (see `AccessTokenParameters`). |
| transferValidator_ | address | Transfer validator contract (approved depending on `autoApprove` flag). |

### setNftParameters

```solidity
function setNftParameters(address _payingToken, uint128 _mintPrice, uint128 _whitelistMintPrice, bool autoApprove) external
```

Owner-only: updates paying token and mint prices; toggles auto-approval of validator.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _payingToken | address | New paying token (use `ETH_ADDRESS` for ETH). |
| _mintPrice | uint128 | New public mint price. |
| _whitelistMintPrice | uint128 | New whitelist mint price. |
| autoApprove | bool | If true, `isApprovedForAll` auto-approves the transfer validator. |

### mintStaticPrice

```solidity
function mintStaticPrice(address receiver, struct StaticPriceParameters[] paramsArray, address expectedPayingToken, uint256 expectedMintPrice) external payable
```

Signature-gated batch mint with static prices (public or whitelist).
@dev
- Validates each entry via factory signer (`checkStaticPriceParameters`).
- Computes total due based on whitelist flags and charges payer in ETH or ERC-20.
- Reverts if `paramsArray.length` exceeds factory’s `maxArraySize`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Address that will receive all minted tokens. |
| paramsArray | struct StaticPriceParameters[] | Array of static price mint parameters (id, uri, whitelist flag). |
| expectedPayingToken | address | Expected paying token for sanity check. |
| expectedMintPrice | uint256 | Expected total price (reverts if mismatched). |

### mintDynamicPrice

```solidity
function mintDynamicPrice(address receiver, struct DynamicPriceParameters[] paramsArray, address expectedPayingToken) external payable
```

Signature-gated batch mint with per-item dynamic prices.
@dev
- Validates each entry via factory signer (`checkDynamicPriceParameters`).
- Sums prices provided in the payload and charges payer accordingly.
- Reverts if `paramsArray.length` exceeds factory’s `maxArraySize`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| receiver | address | Address that will receive all minted tokens. |
| paramsArray | struct DynamicPriceParameters[] | Array of dynamic price mint parameters (id, uri, price). |
| expectedPayingToken | address | Expected paying token for sanity check. |

### tokenURI

```solidity
function tokenURI(uint256 _tokenId) public view returns (string)
```

Returns metadata URI for a given token ID.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _tokenId | uint256 | Token ID to query. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The token URI string. |

### name

```solidity
function name() public view returns (string)
```

Collection name.

### symbol

```solidity
function symbol() public view returns (string)
```

Collection symbol.

### contractURI

```solidity
function contractURI() external view returns (string)
```

Contract-level metadata URI for marketplaces.

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | string | The contract URI. |

### isApprovedForAll

```solidity
function isApprovedForAll(address _owner, address operator) public view returns (bool isApproved)
```

Checks operator approval for all tokens of `_owner`.

_Auto-approves the transfer validator when `autoApproveTransfersFromValidator` is true._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| _owner | address | Token owner. |
| operator | address | Operator address to check. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| isApproved | bool | True if approved. |

### selfImplementation

```solidity
function selfImplementation() external view virtual returns (address)
```

Returns the current implementation address (UUPS).

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | address | implementation Address of the implementation logic contract. |

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

EIP-165 interface support.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| interfaceId | bytes4 | Interface identifier. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | bool | True if supported. |

### _beforeTokenTransfer

```solidity
function _beforeTokenTransfer(address from, address to, uint256 id) internal
```

Hook executed before transfers, mints, and burns.
@dev
- For pure transfers (non-mint/burn), enforces `transferable` and validates via `_validateTransfer`.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| from | address | Sender address (zero for mint). |
| to | address | Recipient address (zero for burn). |
| id | uint256 | Token ID being moved. |

### _authorizeUpgrade

```solidity
function _authorizeUpgrade(address) internal
```

Authorizes UUPS upgrades; restricted to owner.

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
|  | address |  |


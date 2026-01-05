# NftFactoryParameters
[Git Source](https://gitlab.com/nomadhub/smart-contracts/blob/e023936db04d0b7e2f5bfdf55b2bcf9f827cb12c/contracts/v1/factories/NFTFactory.sol)

**Title:**
NftFactoryParameters

A struct that contains parameters related to the NFT factory, such as platform and commission details.

This struct is used to store key configuration information for the NFT factory.


```solidity
struct NftFactoryParameters {
/// @notice The platform address that is allowed to collect fees.
address platformAddress;
/// @notice The address of the signer used for signature verification.
address signerAddress;
/// @notice The address of the default payment currency.
address defaultPaymentCurrency;
/// @notice The platform commission in basis points (BPs).
uint256 platformCommission;
/// @notice The maximum size of an array allowed in batch operations.
uint256 maxArraySize;
/// @notice The address of the contract used to validate token transfers.
address transferValidator;
}
```


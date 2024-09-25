# Solidity API

## PricePointParameters

A struct that contains all the parameters needed to create an PricePoint collection.

_This struct is used to pass parameters between contracts._

```solidity
struct PricePointParameters {
  struct PricePointInfo info;
  address platform;
}
```

## PricePointInfo

A struct that holds detailed information about an individual PricePoint collection.

```solidity
struct PricePointInfo {
  address user;
  string name;
  string symbol;
  string contractURI;
  address paymentCurrency;
  bool transferable;
  bytes signature;
}
```


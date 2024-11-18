# Hardhat

## Hardhat Usage

### Install Dependencies

```
yarn
```

### Set Up env

Rename .env.example to .env and fill all the fields there

- `PK` or `MNEMONIC`: Your Ethereum wallet private key or wallet's seed phrase
- `INFURA_ID_PROJECT`: Your Infura API key for network access

BlockScans API keys:

- `ETHERSCAN_API_KEY`: Your Etherscan API key for contract verification
- `BLASTSCAN_API_KEY`: Your Blastscan API key for contract verification
- `POLYSCAN_API_KEY`: Your Polygonscan API key for contract verification

NFT deployment configuration:

Addresses that should be set:

- `SIGNER_ADDRESS`: Signer's address
- `PLATFORM_ADDRESS`: Platform's address
- `PLATFORM_COMMISSION`: Platform's commission

Addresses that can be set (not necessary addresses):

- `TRANSFER_VALIDATOR`: Transfer validator's address (default = `address(0x0)`)

  - Also can be set LimitBreak's default one: `0x0000721C310194CcfC01E523fc93C9cCcFa2A0Ac`

- `PAYMENT_CURRENCY`: Default payment currency for nft minting (default = `ETH`)
- `MAX_ARRAY_SIZE`: The max array size can be pasted as parameter into function call (default = `20`)
- `REFERRAL_PERCENT_FIRST_TIME_USAGE`
- `REFERRAL_PERCENT_SECOND_TIME_USAGE`
- `REFERRAL_PERCENT_THIRD_TIME_USAGE`
- `REFERRAL_PERCENT_DEFAULT`: After 3 times using became by deafult

### Compile

```
    yarn compile
```

### Test

```
    yarn test
```

### Coverage

```
    yarn coverage
```

### Deploy

- NFT

```
    yarn deploy:nft <network_name>
```

signer and platformAddress need to be specified first. ReceiverFactory, Factory will be deployed.

### Verification

- NFT

```
    yarn verify:nft <network_name>
```

- Or

```
    yarn/npx hardhat --network <network_name> verify <ReceiverFactory address>
```

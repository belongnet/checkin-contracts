# Hardhat

## Hardhat Usage

### Install Dependencies

```
yarn
```

### Set Up env

Rename .env.example to .env and fill all the fields there

- `PK`: Your Ethereum wallet private key
- `MNEMONIC`: Your Ethereum wallet's seed phrase
- `INFURA_ID_PROJECT`: Your Infura API key for network access
- `ETHERSCAN_API_KEY`: Your Etherscan API key for contract verification
  (Add any other required fields)
- `BLASTSCAN_API_KEY`: Your Blastscan API key for contract verification
  (Add any other required fields)

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

- NFT with royalties

```
    yarn deploy:royalties <network_name>
```

- NFT Price Point

```
    yarn deploy:price <network_name>
```

signer and platformAddress need to be specified first. ReceiverFactory, Factory will be deployed.

### Verification

- NFT with royalties

```
    yarn verify:royalties <network_name>
```

- NFT Price Point

```
    yarn verify:price <network_name>
```

- Or

```
    yarn/npx hardhat --network <network_name> verify <ReceiverFactory address>
```

# Hardhat

## Hardhat Usage

### Install Dependencies

```
yarn
```

### Set Up env

Rename .env.example to .env and fill all the fields there

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

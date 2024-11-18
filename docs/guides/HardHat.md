# Hardhat

## Hardhat Usage

### Install Dependencies

```shell
$ yarn or yarn install
```

### Set Up env

Rename .env.example to .env and fill all the fields there

- `INFURA_ID_PROJECT`: Your Infura API key for network access

Testnet:

- `PK` or `MNEMONIC`: Your Ethereum wallet's private key or wallet's seed phrase

Mainnet:

- `LEDGER_ADDRESS` : The address of your ledger account you want to deploy from

BlockScans API keys:

- `ETHERSCAN_API_KEY`: Your Etherscan API key for contract verification
- `BLASTSCAN_API_KEY`: Your Blastscan API key for contract verification
- `POLYSCAN_API_KEY`: Your Polygonscan API key for contract verification

NFT deployment configuration:

Addresses that should be set:

- `SIGNER_ADDRESS`: Signer's address
- `PLATFORM_ADDRESS`: Platform's address
- `PLATFORM_COMMISSION`: Platform's commission, 100% = 10000, ..., 200 = 2%, 50 = 0.5% etc.

Addresses that can be set (not necessary addresses):

- `PAYMENT_CURRENCY`: Default payment currency for nft minting (default = `Native currency`)
- `MAX_ARRAY_SIZE`: The limitation of max array size that can be pasted as parameter into function call (default = `20`)
- `REFERRAL_PERCENT_FIRST_TIME_USAGE`
- `REFERRAL_PERCENT_SECOND_TIME_USAGE`
- `REFERRAL_PERCENT_THIRD_TIME_USAGE`
- `REFERRAL_PERCENT_DEFAULT`: After 3 times using became by deafult

- `TRANSFER_VALIDATOR`: Transfer validator's address required by the OpenSea marketplace (default = `address(0x0)`)

  - Also can be set LimitBreak's default one: `0x0000721C310194CcfC01E523fc93C9cCcFa2A0Ac` then in this SC limitations can be configured:
  - Transfer Security Levels
    - Level 0 (Zero): No transfer restrictions.
      - Caller Constraints: None
      - Receiver Constraints: None
    - Level 1 (One): Only whitelisted operators can initiate transfers, with over-the-counter (OTC) trading enabled.
      - Caller Constraints: OperatorWhitelistEnableOTC
      - Receiver Constraints: None
    - Level 2 (Two): Only whitelisted operators can initiate transfers, with over-the-counter (OTC) trading disabled.
      - Caller Constraints: OperatorWhitelistDisableOTC
      - Receiver Constraints: None
    - Level 3 (Three): Only whitelisted operators can initiate transfers, with over-the-counter (OTC) trading enabled. Transfers to contracts with code are not allowed.
      - Caller Constraints: OperatorWhitelistEnableOTC
      - Receiver Constraints: NoCode
    - Level 4 (Four): Only whitelisted operators can initiate transfers, with over-the-counter (OTC) trading enabled. Transfers are allowed only to Externally Owned Accounts (EOAs).
      - Caller Constraints: OperatorWhitelistEnableOTC
      - Receiver Constraints: EOA
    - Level 5 (Five): Only whitelisted operators can initiate transfers, with over-the-counter (OTC) trading disabled. Transfers to contracts with code are not allowed.
      - Caller Constraints: OperatorWhitelistDisableOTC
      - Receiver Constraints: NoCode
    - Level 6 (Six): Only whitelisted operators can initiate transfers, with over-the-counter (OTC) trading disabled. Transfers are allowed only to Externally Owned Accounts (EOAs).

### Compile

```shell
$ yarn compile
```

### Test

```shell
$ yarn test
```

### Coverage

```shell
$ yarn coverage
```

### Deploy

- Testnet

```shell
$ yarn deploy:nft <network_name>
```

- Mainnet

Ensure that your Ledger device is plugged in, unlocked, and connected to the Ethereum app, then run the deploy command:

```shell
$ yarn deploy:nft <network_name>
```

This will deploy as usual, however, you will now be prompted on your Ledger device to confirm each transaction before it's sent to the network. You should see a message like the following in your terminal:

```shell
Deploying [ NFTFactory ]

Batch #1
Executing NFTFactory...

Ledger: Waiting for confirmation on device
```

At this point, you should see a prompt on your Ledger device to confirm the transaction. Once you confirm, the message will update to show that the transaction was sent to the network, and you'll see the deployment progress in your terminal.

### Verification

- NFT

```shell
$ yarn verify:nft <network_name>
```

- Or

```shell
$ yarn/npx hardhat --network <network_name> verify <ReceiverFactory address>
```

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

If you want to deploy on Mainnet you can comment the testnet lines in [hardhat.config.ts](../../hardhat.config.ts) and in vice versa if you don't want to deploy on Mainnet.

BlockScans API keys:

- `ETHERSCAN_API_KEY`: Your Etherscan API key for contract verification
- `BLASTSCAN_API_KEY`: Your Blastscan API key for contract verification
- `POLYSCAN_API_KEY`: Your Polygonscan API key for contract verification
- `CELOSCAN_API_KEY`: Your Celoscan API key for contract verification
- `BASESCAN_API_KEY`: Your Basescan API key for contract verification
- `LINEASCAN_API_KEY`: Your Lineascan API key for contract verification

For the rest of the networks you don't need to provide any API keys for BlockScans.
If you use [Blockscout](https://docs.blockscout.com/devs/verification/hardhat-verification-plugin), then no need to speify any API keys.

NFT deployment configuration:

Addresses that should be set:

- `SIGNER_ADDRESS`: Signer's address
- `PLATFORM_ADDRESS`: Platform's address

Addresses that can be set (not necessary addresses):

- `PLATFORM_COMMISSION`: Platform's commission, 10000 = 100%, ..., 200 = 2%, 50 = 0.5% etc. (default = `200`)
- `PAYMENT_CURRENCY`: Default payment currency for nft minting (default = `Native currency`)
- `MAX_ARRAY_SIZE`: The limitation of max array size that can be pasted as parameter into function call (default = `20`)
- `REFERRAL_PERCENT_FIRST_TIME_USAGE`
- `REFERRAL_PERCENT_SECOND_TIME_USAGE`
- `REFERRAL_PERCENT_THIRD_TIME_USAGE`
- `REFERRAL_PERCENT_DEFAULT`: After 3 times using became by deafult

- `TRANSFER_VALIDATOR`: Transfer validator's address required by the OpenSea marketplace (default = `address(0x0)`)

  - Also can be set LimitBreak's default one: `0x0000721C310194CcfC01E523fc93C9cCcFa2A0Ac` but only for Ethereum and Polygon Mainnet then in this SC limitations can be configured:
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

Testnet

```shell
$ yarn deploy:factory <network_name>
```

Mainnet

Ensure that your Ledger device is plugged in, unlocked, and connected to the Ethereum app, then run the deploy command:

```shell
$ yarn deploy:factory <network_name>
```

`<network_name>` supported chains:

- `mainnet` - Ethereum mainnet
- `bsc` - Binance Smart Chain mainnet
- `matic` - Polygon mainnet
- `blast` - Blast mainnet
- `celo` - Celo mainnet
- `base` - BASE mainnet
- `linea` - Linea mainnet
- `skale_europa` - Skale Europa Hub mainnet
- `skale_nebula` - Skale Nebula Hub mainnet
- `skale_calypso` - Skale Calypso Hub mainnet
- `sepolia` - Ethereum Sepolia testnet
- `blast_sepolia` - Blast Sepolia testnet
- `skale_calypso_testnet` - Skale Calypso Hub testnet
- `amoy` - Polygon Amoy testnet

This will deploy as usual, however, you will now be prompted on your Ledger device to confirm each transaction before it's sent to the network. You should see a message like the following in your terminal:

```shell
✔️ [hardhat-ledger] Connecting wallet
✔️ [hardhat-ledger] Deriving address #10 (path "m/44'/60'/10'/0/0")
✔️ [hardhat-ledger] Waiting for confirmation
```

At this point, you should see a prompt on your Ledger device to confirm the transaction. Once you confirm, the message will update to show that the transaction was sent to the network, and you'll see the deployment progress in your terminal.

**To deploy NFT mock (for verification):**

- V1

```shell
$ yarn deploy:nft_mock <network_name>
```

### Verification

- NFT Factory

After deployment update [.env](../../.env) with specifying the

- `NFT_FACTORY_ADDRESS`: NFT Factory address that has been deployed.

Then run the following commands:

- V1

```shell
$ yarn verify:factory <network_name>
```

- NFT and Royalties receiver

After deployment update [.env](../../.env) with specifying the

- `NFT_ADDRESS`: NFT address that has been deployed.
- `NFT_CREATOR_ADDRESS`: NFT creator address who deployed an NFT.
- `RECEIVER_ADDRESS`: Royalties Receiver address that has been deployed.
- `NFT_NAME`: NFT name.
- `NFT_SYMBOL`: NFT symbol.
- `PAYING_TOKEN_ADDRESS`: NFT paying token address (Native currency or ERC20 token).
- `FEE_NUMERATOR`: NFT fee numerator.
- `TRANSFERRABLE`: NFT is tranferrable (true/false).
- `MAX_TOTAL_SUPPLY`: NFT max total supply amount.
- `MINT_PRICE`: NFT mint price.
- `WHITELIST_MINT_PRICE`: NFT whitelist mint price.
- `COLLECTION_EXPIRE`: NFT collection expire timestamp.
- `CONTRACT_URI`: NFT cotract URI string.
- `SIGNATURE`: NFT signatre for NFT creation.
- `REFERRAL_CODE`: NFT referral code if exists.

**To verify NFT mock:**

Update [.env](../../.env) with specifying the:

- `NFT_MOCK`: NFT mock address that has been deployed.

- V1

```shell
$ yarn verify:nft_mock <network_name>
```

Then run the following commands:

- V1

```shell
$ yarn verify:deployed <network_name>
```

`<network_name>` supported chains:

- `mainnet` - Ethereum mainnet
- `bsc` - Binance Smart Chain mainnet
- `matic` - Polygon mainnet
- `blast` - Blast mainnet
- `celo` - Celo mainnet
- `base` - BASE mainnet
- `linea` - Linea mainnet
- `skale_europa` - Skale Europa Hub mainnet
- `skale_nebula` - Skale Nebula Hub mainnet
- `skale_calypso` - Skale Calypso Hub mainnet
- `sepolia` - Ethereum Sepolia testnet
- `blast_sepolia` - Blast Sepolia testnet
- `skale_calypso_testnet` - Skale Calypso Hub testnet
- `amoy` - Polygon Amoy testnet

### [Deployed Crypto Addresses](./../addresses.md)

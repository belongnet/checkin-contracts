# To declare class:

```bash
$ starkli declare ./target/dev/nft_NFT.contract_class.json --network sepolia --account ~/.starkli-wallets/deployer/account.json --keystore~/.starkli-wallets/deployer/keystore.json --rpc https://free-rpc.nethermind.io/sepolia-juno
```

# NFT

Declaring Cairo 1 class: 0x06d7c892b96083e259223814f4d5cb9d27c6b63edf4684c8c41229e06926afc7
Compiling Sierra class to CASM with compiler version 2.8.2...
CASM class hash: 0x05f1610efa77281a7d637e8b62ab44d9c99433d76c516c779fc0ce4073fe7931
Contract declaration transaction: 0x006e4e1f64e08da68c0720f28c26a3738cbf718c4616e6b0b0ac8e895e0c97b7
Class hash declared:
0x06d7c892b96083e259223814f4d5cb9d27c6b63edf4684c8c41229e06926afc7

# Receiver

Declaring Cairo 1 class: 0x04125bc64ff8c4212e09219e8fc9ecc89967eae605c8c5ec82edbd50ab11dbf4
Compiling Sierra class to CASM with compiler version 2.8.2...
CASM class hash: 0x0499169ef1004241f8abdf7d86b0697a175b72e85b9e32568ff3bc50d0f831f4
Contract declaration transaction: 0x02796aa9ee663a6058b61afc405d2a8b78e8c44fc216e20592e950e5606f8a91
Class hash declared:
0x04125bc64ff8c4212e09219e8fc9ecc89967eae605c8c5ec82edbd50ab11dbf4

# Nft Factory

Declaring Cairo 1 class: 0x02dfbfcabeadc296a8d1df504d6a632af6623ffaa12b44bc1ca65c9dfbd97e85
Compiling Sierra class to CASM with compiler version 2.8.2...
CASM class hash: 0x0164a5d3cbd54330a050e3f889d9c12de4fbaa5621ca6417230b99da9e71edb9
Contract declaration transaction: 0x07a67322268a8791e8514f6beaff343c910fd60cc02ff141fb5bde4524777234
Class hash declared:
0x02dfbfcabeadc296a8d1df504d6a632af6623ffaa12b44bc1ca65c9dfbd97e85

starkli declare /x/SmartContracts/smart-contracts/target/dev/nft_NFTFactory.contract_class.json --network sepolia

# To deploy SC

Deploying class 0x02dfbfcabeadc296a8d1df504d6a632af6623ffaa12b44bc1ca65c9dfbd97e85 with salt 0x0427f3290a80b65a2fae67902e665464585ec1a8c063eaeed44a765bc7a5d3ec...
The contract will be deployed at address 0x0717246d4b4b3e1c4087b2cc63d99c46c08ef7beea9dbc46e2d854f724dcb711
Contract deployment transaction: 0x06f689013d55a336d2a66c8cf37c7373e86580383ee3a72cfd7e365d42b83525
Contract deployed:
0x0717246d4b4b3e1c4087b2cc63d99c46c08ef7beea9dbc46e2d854f724dcb711

```bash
$ starkli deploy 0x02dfbfcabeadc296a8d1df504d6a632af6623ffaa12b44bc1ca65c9dfbd97e85 0x06e534AaA270d95F705248fC50aE5E19E9290b69c53AD339B4ea8ed3db5858d4
```

starkli deploy 0x02dfbfcabeadc296a8d1df504d6a632af6623ffaa12b44bc1ca65c9dfbd97e85 0x06e534AaA270d95F705248fC50aE5E19E9290b69c53AD339B4ea8ed3db5858d4

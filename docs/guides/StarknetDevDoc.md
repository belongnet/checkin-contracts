# To declare class:

```bash
$ starkli declare ./target/dev/nft_NFT.contract_class.json --network sepolia --account ~/.starkli-wallets/deployer/account.json --keystore ~/.starkli-wallets/deployer/keystore.json --rpc https://free-rpc.nethermind.io/sepolia-juno

$ starkli declare ./target/dev/nft_Receiver.contract_class.json --network sepolia --account ~/.starkli-wallets/deployer/account.json --keystore ~/.starkli-wallets/deployer/keystore.json --rpc https://free-rpc.nethermind.io/sepolia-juno

$ starkli declare ./target/dev/nft_NFTFactory.contract_class.json --network sepolia --account ~/.starkli-wallets/deployer/account.json --keystore ~/.starkli-wallets/deployer/keystore.json --rpc https://free-rpc.nethermind.io/sepolia-juno
```

# NFT

Declaring Cairo 1 class: 0x015b6df174feb8a9075e3670202ce6856ea1cd4b916e6b45922c0a46a412dbe1
Compiling Sierra class to CASM with compiler version 2.8.2...
CASM class hash: 0x0311e95401338642236bbf2d9f7b88a2d57463bd4fae4d58c947817d71ed7aa3
Contract declaration transaction: 0x03838d8a9e60f6ef0e1e6c6340d1dbfd868722d5346100e8410b28e8641e2465
Class hash declared:
0x015b6df174feb8a9075e3670202ce6856ea1cd4b916e6b45922c0a46a412dbe1

# Receiver

Declaring Cairo 1 class: 0x04b8fc093ee4e2f271db671d5e9c8257847e273ca49e5361d0ffbff96ac20fc0
Compiling Sierra class to CASM with compiler version 2.8.2...
CASM class hash: 0x0784e90a4c24cd75fe9d84c34865ae92571314fe17953bee3d1ddc2720650809
Contract declaration transaction: 0x047f42e56401b6362febd521555ffd4f002e3cfe0d336cba3e33b997613cadd3
Class hash declared:
0x04b8fc093ee4e2f271db671d5e9c8257847e273ca49e5361d0ffbff96ac20fc0

# Nft Factory

Declaring Cairo 1 class: 0x0244f01881dfbbd2051d481650b3f43b839beb11701b9c31a8bf4d1a8c2b01ff
Compiling Sierra class to CASM with compiler version 2.8.2...
CASM class hash: 0x04fe715ade1abf5d4bf783074181ec6d2ab35704df5e8f4ff98195cc12449599
Contract declaration transaction: 0x02accb58d0468a3a4185f2f7c3a914d3765455e48799c7a525177ce87cf05347
Class hash declared:
0x0244f01881dfbbd2051d481650b3f43b839beb11701b9c31a8bf4d1a8c2b01ff

# To deploy SC

```bash
$ starkli deploy 0x0244f01881dfbbd2051d481650b3f43b839beb11701b9c31a8bf4d1a8c2b01ff 0x06e534AaA270d95F705248fC50aE5E19E9290b69c53AD339B4ea8ed3db5858d4 --network sepolia --account ~/.starkli-wallets/deployer/account.json --keystore ~/.starkli-wallets/deployer/keystore.json --rpc https://free-rpc.nethermind.io/sepolia-juno
```

# Nft Factory

Deploying class 0x0244f01881dfbbd2051d481650b3f43b839beb11701b9c31a8bf4d1a8c2b01ff with salt 0x03059285a0fd953c1ebeb000b8936749786670c823a4d48c632aaf2ec562dc5e...
The contract will be deployed at address 0x00b755fa4342afb5998ee920585882f3888df02fbc01a906696983f47ee9587f
Contract deployment transaction: 0x069b8185c970a60d95ab20f61540a0ac5433d075f172d828ca84a4394fecdd2b
Contract deployed:
0x00b755fa4342afb5998ee920585882f3888df02fbc01a906696983f47ee9587f

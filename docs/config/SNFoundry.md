# Foundry

**Starknet Foundry is a toolchain for developing Starknet smart contracts. It helps with writing, deploying, and testing your smart contracts. It is inspired by Foundry.**

Foundry consists of:

- **snforge**: STARKNET testing framework (like Truffle, Hardhat and DappTools).
- **sncast**: Swiss army knife for interacting with STARKNET smart contracts, sending transactions and getting chain data.
- **scarb**: Scarb is the package manager and build toolchain for Starknet ecosystem. Those coming from Rust ecosystem will find Scarb very similar to Cargo.

## Documentation

[SNFoundry Documentation](https://foundry-rs.github.io/)

## Usage

### Build

```shell
$ scarb build
```

### Test

```shell
$ snforge test OR scarb test
```

### snforge commands

[snforge CLI Reference](https://foundry-rs.github.io/starknet-foundry/appendix/snforge.html)

### sncast commands

[sncast CLI Reference](https://foundry-rs.github.io/starknet-foundry/appendix/sncast.html)

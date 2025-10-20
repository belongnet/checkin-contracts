# Declaring a smart contract

## Overview

Before a contract is deployed on Starknet, it first needs to be _declared_. Declaration is the process of submitting a contract's code to Starknet and making it available for future deployments, analogous to registering its blueprint.

## Prerequisites

Ensure that the following commands are working properly on your system:

```bash
starkli --version
scarb --version
snforge --version
sncast --version
asdf --version
```

## Compiling a smart contract

Before a smart contract can be declared, it first needs to be compiled. To compile an existing smart contract project, simply navigate into the project's directory and run:

```bash
scarb build
```

The compiled contract should be saved in the `target/dev/` directory.

If you require a new smart contract project, run either:

```bash
scarb init --name <PROJECT_NAME>
```

in an empty folder with the same name as the project or:

```bash
scarb new <PROJECT_NAME>
```

anywhere, and select the default Starknet Foundry as a test runner.

> **NOTE**
> Building a Starknet Foundry project with Scarb requires [Rust](https://www.rust-lang.org/) to be installed. You can verify that Rust is installed and up-to-date by running:
>
> ```bash
> rustc --version
> ```
>
> or install the latest Rust version by following the instructions in the [Rust documentation](https://doc.rust-lang.org/beta/book/ch01-01-installation.html).
>
> Moreover, the first time a project is built, some components of Scarb are compiled locally with the Rust toolchain. This process may take a few minutes, but will not happen in subsequent builds.

In any case, the `Scarb.toml` file in the project's directory should resemble the following (up to version numbers):

```toml
[package]
name = <PROJECT_NAME>
version = "0.1.0"
edition = "2023_11"

[dependencies]
starknet = "2.8.4"

[dev-dependencies]
snforge_std = { git = "https://github.com/foundry-rs/starknet-foundry", tag = "v0.32.0" }
assert_macros = "2.8.4"

[[target.starknet-contract]]
sierra = true
```

## Setting an RPC provider

In order to interact with Starknet, Starkli requires an RPC endpoint to be configured. For interactions with Starknet Sepolia and Starknet mainnet, Starkli supports default (and limited) RPC endpoints when using the `--network` flag. Configuring a custom RPC endpoint can be done by either using Starkli's `--rpc` flag or setting up Starkli's `STARKNET_RPC` environment variable (see more details in the [Starkli documentation](https://book.starkli.rs/providers#using-an-rpc-url-directly)).

For demonstration purposes, this tutorial uses Starkli's default Starknet Sepolia RPC endpoint by setting `--network=sepolia`.

## Declaring a smart contract

A contract can be declared on Starknet using Starkli by running the following command:

```bash
starkli declare target/dev/<CONTRACT_NAME>.sierra.json --network=sepolia
```

When using `starkli declare`, Starkli will do its best to identify the compiler version of the declared class. In case it fails, the `--compiler-version` flag can be used to specify the version of the compiler as follows:

1. Find the compiler versions supported by Starkli by running:

   ```bash
   starkli declare --help
   ```

   and looking for the possible values of the `--compiler-version` flag.

2. Find the current Scarb version in use:

   ```bash
   scarb --version
   ```

3. In case a different compiler version is required, switch to a different Scarb version using `asdf`:

   - Install the desired Scarb version:

     ```bash
     asdf install scarb <VERSION>
     ```

   - Select the desired Scarb version as the local version for the project:

     ```bash
     asdf local scarb <VERSION>
     ```

> **TIP**
> The following is an example of declaring a contract with both a custom RPC endpoint (provided by [Infura](https://www.infura.io/)) and a specific compiler version:
>
> ```bash
> starkli declare target/dev/<CONTRACT_NAME>.sierra.json \
>     --rpc=https://starknet-sepolia.infura.io/v3/<API_KEY> \
>     --compiler-version=2.6.0 \
> ```

## Expected result

The output of a successful contract declaration using Starkli should resemble the following:

```bash
Class hash declared: <CLASS_HASH>
```

On the other hand, if the contract you are declaring has previously been declared, the output should resemble the following:

```bash
Not declaring class as its already declared. Class hash: <CLASS_HASH>
```

This is because declaration is a one-time process for each unique contract code, and a contract's class hash is its unique identifier

In both cases, however, you should be able to see the declared contract on a block explorer like [StarkScan](https://sepolia.starkscan.co/) or [Voyager](https://sepolia.voyager.online/) by searching for its class hash.

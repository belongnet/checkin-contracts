# Setting up your environment

## Overview

In order to use Starknet, you need to install several tools. This section will walk you through installing the three most recommended tools to begin developing on Starknet:

- Starkli, a command-line interface that allows you to interact with Starknet.
- Scarb, a build toolchain and package manager for Cairo and Starknet ecosystems.
- Starknet Foundry, the go-to framework for building and testing Starknet Smart Contracts.

## Setting up Starkli

### MacOS and Linux installation

It is highly recommended to install Starkli on MacOS and Linux using the [`starkliup` portable script](https://get.starkli.sh). `starkliup` manages shell configuration for you, and using any other installation method requires [manually setting up shell completions](https://book.starkli.rs/shell-completions).

**Procedure**

1. Download `starkliup`:
   ```shell
   curl https://get.starkli.sh | sh
   ```
2. Restart the terminal and install Starkli:
   ```shell
   starkliup
   ```
3. Restart the terminal and verify that Starkli is installed correctly:
   ```shell
   starkli --version
   ```

### Windows installation

Starknet Foundry's installation on Windows requires manually setting up shell completions.

**Procedure**

1. Install Starkli:
   ```shell
   cargo install --locked --git https://github.com/xJonathanLEI/starkli
   ```
2. Restart the terminal and verify that Starkli is installed correctly:
   ```shell
   starkli --version
   ```
3. Set up Starkli's shell completions by following the instructions in the [Starkli documentation](https://book.starkli.rs/shell-completions).

### Environment variables setup

For the majority of flags available on Starkli, you can set environment variables to make the commands shorter and easier to manage.

Setting environment variables for Starkli significantly simplifies command execution and management, thereby enhancing efficiency, readability, and control when using Starkli.

The two primary environment variables that are vital for effective usage of Starkli's CLI are:

- `STARKNET_ACCOUNT`: The location of the [Account Descriptor](./AccountSetUp.md#creating-an-account-descriptor) file.
- `STARKNET_KEYSTORE`: The location of the keystore file for the [Signer](./AccountSetUp.md#creating-a-signer).

Set these environment variables as follows:

```bash
export STARKNET_ACCOUNT=~/.starkli-wallets/deployer/account.json
export STARKNET_KEYSTORE=~/.starkli-wallets/deployer/keystore.json
```

## Setting up Scarb

### MacOS and Linux installation

It is highly recommended to install Scarb on MacOS and Linux via the [`asdf` version manager](https://asdf-vm.com/). Installing Scarb with `asdf` seamlessly integrates with the Cairo [VSCode extension](https://marketplace.visualstudio.com/items?itemName=starkware.cairo1) and allows easy switching between different versions of Scarb, both globally and per project (see full details in the [`asdf` documentation](https://asdf-vm.com/manage/commands.html) or by running `asdf --help`).

**Procedure**

1. Verify that `asdf` is installed:
   ```bash
   asdf --version
   ```
   or install it by following the instructions in the [`asdf` documentation](https://asdf-vm.com/guide/getting-started.html).
2. Install the `asdf` Scarb plugin:
   ```bash
   asdf plugin add scarb
   ```
3. Install the latest version of Scarb:
   ```bash
   asdf install scarb latest
   ```
4. Restart the terminal and verify that Scarb is installed correctly:
   ```bash
   scarb --version
   ```
5. Set a global version for Scarb (needed for using `scarb init`):
   ```bash
   asdf global scarb latest
   ```

### Windows installation

Scarb's installation on Windows requires manual setup.

**Procedure**

1. Follow the instructions in the [Scarb documentation](https://docs.swmansion.com/scarb/download.html#windows).
2. Restart the terminal and verify that Scarb is installed correctly:
   ```bash
   scarb --version
   ```

## Setting up Starknet Foundry

### MacOS and Linux installation

It is highly recommended to install Starknet Foundry on MacOS and Linux using the [`asdf` version manager](https://asdf-vm.com/). Installing Starknet Foundry with `asdf` allows easy switching between different versions of Starknet Foundry, both globally and per project (see full details in the [`asdf` documentation](https://asdf-vm.com/manage/commands.html) or by running `asdf --help`).

**Procedure**

1. Verify that `asdf` is installed, or install it by following the instructions in the [`asdf` documentation](https://asdf-vm.com/guide/getting-started.html).
2. Install the `asdf` Starknet Foundry plugin:
   ```bash
   asdf plugin add starknet-foundry
   ```
3. Install the latest version of Starknet Foundry:
   ```bash
   asdf install starknet-foundry latest
   ```
4. Set a global version for Starknet Foundry using `asdf` (needed for using `scarb init`):
   ```bash
   asdf global starknet-foundry latest
   ```
5. Restart the terminal and verify that Starknet Foundry is installed correctly:
   ```bash
   snforge --version
   sncast --version
   ```

### Windows installation

Starknet Foundry's installation on Windows requires manual setup.

**Procedure**

1. Follow the instructions in the [Starknet Foundry documentation](https://foundry-rs.github.io/starknet-foundry/getting-started/installation.html#installation-on-windows).
2. Restart the terminal and verify that Starknet Foundry is installed correctly:

   ```bash
   snforge --version
   sncast --version
   ```

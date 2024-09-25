// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ReentrancyGuard} from "solady/src/utils/ReentrancyGuard.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";

import {StorageContract, NFTFactory} from "./StorageContract.sol";
import {BaseERC721} from "./BaseERC721.sol";
import {NftParameters} from "./Structures.sol";
import {ITransferValidator721} from "./interfaces/ITransferValidator721.sol";

/// @notice Error thrown when the total supply limit is reached.
error TotalSupplyLimitReached();

/// @notice Error thrown when insufficient ETH is sent for a minting transaction.
/// @param ETHsent The amount of ETH sent.
error NotEnoughETHSent(uint256 ETHsent);

/// @notice Error thrown when a non-transferable token is attempted to be transferred.
error NotTransferable();

/// @notice Error thrown when an invalid signature is provided for minting.
error InvalidSignature();

/// @notice Error thrown when the mint price changes unexpectedly.
/// @param expectedMintPrice The expected mint price.
/// @param currentPrice The actual current mint price.
error PriceChanged(uint256 expectedMintPrice, uint256 currentPrice);

/// @notice Error thrown when the paying token changes unexpectedly.
/// @param expectedPayingToken The expected paying token.
/// @param currentPayingToken The actual paying token.
error TokenChanged(address expectedPayingToken, address currentPayingToken);

/**
 * @title NFT Contract
 * @notice Implements the minting and transfer functionality for NFTs, including transfer validation and royalty management.
 * @dev This contract inherits from BaseERC721 and implements additional minting logic, including whitelist support and fee handling.
 */
contract NFT is BaseERC721, ReentrancyGuard {
    using SignatureCheckerLib for address;
    using SafeTransferLib for address;

    /// @notice Emitted when the paying token and prices are updated.
    /// @param newToken The address of the new paying token.
    /// @param newPrice The new mint price.
    /// @param newWLPrice The new whitelist mint price.
    event PayingTokenChanged(
        address newToken,
        uint256 newPrice,
        uint256 newWLPrice
    );

    /// @notice The constant address representing ETH.
    address public constant ETH_ADDRESS =
        0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @notice The struct containing all NFT parameters for the collection.
    NftParameters public parameters;

    /**
     * @dev Called by the factory when a new instance is deployed.
     * @param _params Collection parameters containing information like name, symbol, fees, and more.
     * @param newValidator The transfer validator contract address.
     */
    constructor(
        NftParameters memory _params,
        ITransferValidator721 newValidator
    ) BaseERC721(_params, newValidator) {
        parameters = _params;
    }

    /**
     * @notice Mints a new NFT to a specified address.
     * @dev Requires a signature from a trusted address and validates against whitelist status.
     * @param receiver The address receiving the NFT.
     * @param tokenId The ID of the token to mint.
     * @param tokenUri The metadata URI of the token being minted.
     * @param whitelisted Whether the receiver is whitelisted for a discount.
     * @param signature The signature of the trusted address for validation.
     * @param _expectedMintPrice The expected mint price at the time of minting.
     * @param _expectedPayingToken The expected paying token (ETH or another token).
     */
    function mint(
        address receiver,
        uint256 tokenId,
        string calldata tokenUri,
        bool whitelisted,
        bytes calldata signature,
        uint256 _expectedMintPrice,
        address _expectedPayingToken
    ) external payable nonReentrant {
        NftParameters memory _parameters = parameters;

        // Validate signature
        if (
            !_isSignatureValid(
                receiver,
                tokenId,
                tokenUri,
                whitelisted,
                signature,
                StorageContract(_parameters.storageContract)
                    .factory()
                    .signerAddress()
            )
        ) {
            revert InvalidSignature();
        }

        // Ensure the total supply has not been exceeded
        if (tokenId + 1 > _parameters.info.maxTotalSupply) {
            revert TotalSupplyLimitReached();
        }

        // Determine the mint price based on whitelist status
        uint256 price = whitelisted
            ? _parameters.info.whitelistMintPrice
            : _parameters.info.mintPrice;

        // Check if the expected mint price matches the actual price
        if (_expectedMintPrice != price) {
            revert PriceChanged(_expectedMintPrice, price);
        }

        // Check if the expected paying token matches the actual paying token
        if (_expectedPayingToken != _parameters.info.payingToken) {
            revert TokenChanged(
                _expectedPayingToken,
                _parameters.info.payingToken
            );
        }

        uint256 amount = _parameters.info.payingToken == ETH_ADDRESS
            ? msg.value
            : price;

        // Check if the correct amount of ETH is sent
        if (amount != price) {
            revert NotEnoughETHSent(amount);
        }

        uint256 fee;
        uint256 amountToCreator;

        // Calculate platform commission and the amount to send to the creator
        unchecked {
            fee =
                (amount *
                    uint256(
                        StorageContract(_parameters.storageContract)
                            .factory()
                            .platformCommission()
                    )) /
                _feeDenominator();

            amountToCreator = amount - fee;
        }

        // Handle payments in ETH or other tokens
        if (_parameters.info.payingToken == ETH_ADDRESS) {
            if (fee > 0) {
                StorageContract(_parameters.storageContract)
                    .factory()
                    .platformAddress()
                    .safeTransferETH(fee);
            }

            _parameters.creator.safeTransferETH(amountToCreator);
        } else {
            if (fee > 0) {
                _parameters.info.payingToken.safeTransferFrom(
                    msg.sender,
                    StorageContract(_parameters.storageContract)
                        .factory()
                        .platformAddress(),
                    fee
                );
            }

            _parameters.info.payingToken.safeTransferFrom(
                msg.sender,
                _parameters.creator,
                amountToCreator
            );
        }

        _baseMint(tokenId, receiver, tokenUri);
    }

    /**
     * @notice Sets a new paying token and mint prices for the collection.
     * @param _payingToken The new paying token address.
     * @param _mintPrice The new mint price.
     * @param _whitelistMintPrice The new whitelist mint price.
     */
    function setPayingToken(
        address _payingToken,
        uint256 _mintPrice,
        uint256 _whitelistMintPrice
    ) external onlyOwner zeroAddressCheck(_payingToken) {
        parameters.info.payingToken = _payingToken;
        parameters.info.mintPrice = _mintPrice;
        parameters.info.whitelistMintPrice = _whitelistMintPrice;
        emit PayingTokenChanged(_payingToken, _mintPrice, _whitelistMintPrice);
    }

    /**
     * @notice Returns the paying token for the collection.
     */
    function payingToken() external view returns (address) {
        return parameters.info.payingToken;
    }

    /**
     * @notice Returns the address of the storage contract.
     */
    function storageContract() external view returns (address) {
        return parameters.storageContract;
    }

    /**
     * @notice Returns the current mint price for the collection.
     */
    function mintPrice() external view returns (uint256) {
        return parameters.info.mintPrice;
    }

    /**
     * @notice Returns the current whitelist mint price for the collection.
     */
    function whitelistMintPrice() external view returns (uint256) {
        return parameters.info.whitelistMintPrice;
    }

    /**
     * @notice Returns whether the collection is transferable.
     */
    function transferable() external view returns (bool) {
        return parameters.info.transferable;
    }

    /**
     * @notice Returns the maximum total supply for the collection.
     */
    function maxTotalSupply() external view returns (uint256) {
        return parameters.info.maxTotalSupply;
    }

    /**
     * @notice Returns the total royalty percentage for the collection.
     */
    function totalRoyalty() external view returns (uint256) {
        return parameters.info.feeNumerator;
    }

    /**
     * @notice Returns the creator of the collection.
     */
    function creator() external view returns (address) {
        return parameters.creator;
    }

    /**
     * @notice Returns the expiration timestamp for the collection.
     */
    function collectionExpire() external view returns (uint256) {
        return parameters.info.collectionExpire;
    }

    /**
     * @notice Returns the contract URI for the collection.
     */
    function contractURI() external view returns (string memory) {
        return parameters.info.contractURI;
    }

    /**
     * @notice Updates the token transfer status.
     * @dev Overrides the _update function to include transfer validation based on the collection's transferability.
     * @param to The address to transfer the token to.
     * @param tokenId The token ID to transfer.
     * @param auth The authorized caller.
     * @return from The address the token is being transferred from.
     */
    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address from) {
        from = super._update(to, tokenId, auth);

        // Check if the transaction is not a mint/burn, only a transfer
        if (
            from != address(0) &&
            to != address(0) &&
            !parameters.info.transferable
        ) {
            revert NotTransferable();
        }
    }

    /**
     * @notice Verifies if the signature is valid for the current signer address
     * @dev This function checks the signature for the provided NFT data
     * @param receiver The address receiving the NFT.
     * @param tokenId The ID of the token to mint.
     * @param tokenUri The metadata URI of the token being minted.
     * @param whitelisted Whether the receiver is whitelisted for a discount.
     * @param signature The signature of the trusted address for validation.
     * @return bool Whether the signature is valid
     */
    function _isSignatureValid(
        address receiver,
        uint256 tokenId,
        string calldata tokenUri,
        bool whitelisted,
        bytes calldata signature,
        address signerAddress
    ) internal view returns (bool) {
        return
            signerAddress.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        receiver,
                        tokenId,
                        tokenUri,
                        whitelisted,
                        block.chainid
                    )
                ),
                signature
            );
    }
}

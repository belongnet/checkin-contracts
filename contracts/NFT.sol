// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ReentrancyGuard} from "solady/src/utils/ReentrancyGuard.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {ECDSA} from "solady/src/utils/ECDSA.sol";

import {StorageContract} from "./StorageContract.sol";
import {BaseERC721} from "./BaseERC721.sol";
import {NftParameters} from "./Structures.sol";
import {ITransferValidator721} from "./interfaces/ITransferValidator721.sol";

error TotalSupplyLimitReached();
error NotEnoughETHSent(uint256 ETHsent);
error NotTransferable();
error InvalidSignature();

contract NFT is BaseERC721, ReentrancyGuard {
    using ECDSA for bytes32;
    using SafeTransferLib for address;

    event PayingTokenChanged(
        address newToken,
        uint256 newPrice,
        uint256 newWLPrice
    );

    NftParameters public parameters;

    modifier onlyCreator() {
        require(msg.sender == parameters.creator, "not creator");
        _;
    }

    // constructor() {
    //     _disableInitializers();
    // }

    /**
     * @dev called by factory when instance deployed
     * @param _params Collection parameters
     */
    function initialize(
        NftParameters calldata _params,
        ITransferValidator721 newValidator
    )
        external
        initializer
        zeroAddressCheck(_params.info.payingToken)
        zeroAddressCheck(_params.storageContract)
        zeroAddressCheck(_params.info.feeReceiver)
        zeroAddressCheck(_params.creator)
        zeroAddressCheck(address(newValidator))
    {
        __ERC721Base_init(_params, newValidator);

        parameters = _params;
    }

    /**
     * @notice Mints new NFT
     * @dev Requires a signature from the trusted address
     * @param receiver Address that gets ERC721 token
     * @param tokenUri Metadata URI of the ERC721 token
     * @param whitelisted A flag if the user whitelisted or not
     * @param signature Signature of the trusted address
     */
    function mint(
        address receiver,
        string calldata tokenUri,
        bool whitelisted,
        bytes calldata signature
    ) external payable nonReentrant {
        uint256 tokenId = totalSupply;

        NftParameters memory _parameters = parameters;

        if (
            keccak256(
                abi.encodePacked(
                    receiver,
                    tokenId,
                    tokenUri,
                    whitelisted,
                    block.chainid
                )
            ).recover(signature) !=
            StorageContract(parameters.storageContract)
                .factory()
                .signerAddress()
        ) {
            revert InvalidSignature();
        }

        if (tokenId + 1 > _parameters.info.maxTotalSupply) {
            revert TotalSupplyLimitReached();
        }

        uint256 price = whitelisted
            ? _parameters.info.whitelistMintPrice
            : _parameters.info.mintPrice;

        uint256 amount = _parameters.info.payingToken ==
            0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
            ? msg.value
            : price;

        if (amount != price) {
            revert NotEnoughETHSent(amount);
        }

        uint256 fee;
        uint256 amountToCreator;

        unchecked {
            fee =
                (amount *
                    uint256(
                        StorageContract(_parameters.storageContract)
                            .factory()
                            .platformCommission()
                    )) /
                _feeDenominator();

            // `fee` will be always lower than `amount`
            amountToCreator = amount - fee;
        }

        address platformAddress = StorageContract(_parameters.storageContract)
            .factory()
            .platformAddress();

        if (
            _parameters.info.payingToken ==
            0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
        ) {
            if (fee > 0) {
                platformAddress.safeTransferETH(fee);
            }

            _parameters.creator.safeTransferETH(amountToCreator);
        } else {
            if (fee > 0) {
                _parameters.info.payingToken.safeTransferFrom(
                    msg.sender,
                    platformAddress,
                    fee
                );
            }

            _parameters.info.payingToken.safeTransferFrom(
                msg.sender,
                _parameters.creator,
                amountToCreator
            );
        }

        mint_(tokenId, receiver, tokenUri);
    }

    /**
     * @notice Sets paying token
     * @param _payingToken New token address
     */
    function setPayingToken(
        address _payingToken,
        uint256 _mintPrice,
        uint256 _whitelistMintPrice
    ) external onlyCreator zeroAddressCheck(_payingToken) {
        parameters.info.payingToken = _payingToken;
        parameters.info.mintPrice = _mintPrice;
        parameters.info.whitelistMintPrice = _whitelistMintPrice;
        emit PayingTokenChanged(_payingToken, _mintPrice, _whitelistMintPrice);
    }

    /**
     * @notice owner() function overriding for OpenSea
     */
    function owner() public view override returns (address) {
        return
            StorageContract(parameters.storageContract)
                .factory()
                .platformAddress();
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override returns (address from) {
        from = super._update(to, tokenId, auth);

        // Check if the tx is not a mint/burn, only transfer
        if (
            from != address(0) &&
            to != address(0) &&
            !parameters.info.transferable
        ) {
            revert NotTransferable();
        }
    }
}

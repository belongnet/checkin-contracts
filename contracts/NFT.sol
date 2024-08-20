// SPDX-License-Identifier: MIT
pragma solidity 0.8.25;

import {ERC721Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import {ERC2981Upgradeable} from "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuard} from "solady/src/utils/ReentrancyGuard.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";
import {ECDSA} from "solady/src/utils/ECDSA.sol";
import "operator-filter-registry/src/upgradeable/DefaultOperatorFiltererUpgradeable.sol";
import {Factory} from "./Factory.sol";
import {StorageContract} from "./StorageContract.sol";
import {NftParameters} from "./Structures.sol";

error ZeroAddressPasted();
error InvalidSignature();
error TotalSupplyLimitReached();
error NotEnoughETHSent(uint256 ETHsent);
error NotTransferable();

contract NFT is
    ERC721Upgradeable,
    OwnableUpgradeable,
    ReentrancyGuard,
    ERC2981Upgradeable,
    DefaultOperatorFiltererUpgradeable
{
    using SafeTransferLib for address;
    using ECDSA for bytes32;

    event PayingTokenChanged(
        address newToken,
        uint256 newPrice,
        uint256 newWLPrice
    );

    NftParameters public parameters;

    uint256 public totalSupply; // The current totalSupply

    mapping(uint256 => string) public metadataUri; // token ID -> metadata link

    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPasted();
        }
        _;
    }

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
        NftParameters calldata _params
    )
        external
        initializer
        zeroAddressCheck(_params.info.payingToken)
        zeroAddressCheck(address(_params.storageContract))
        zeroAddressCheck(_params.info.feeReceiver)
        zeroAddressCheck(_params.creator)
    {
        __ERC721_init(_params.info.name, _params.info.symbol);
        __Ownable_init(msg.sender);
        __ERC2981_init();
        __DefaultOperatorFilterer_init();

        parameters = _params;

        _setDefaultRoyalty(_params.info.feeReceiver, _params.info.totalRoyalty);
    }

    /**
     * @notice Mints new NFT
     * @dev Requires a signature from the trusted address
     * @param reciever Address that gets ERC721 token
     * @param tokenId ID of a ERC721 token to mint
     * @param tokenUri Metadata URI of the ERC721 token
     * @param whitelisted A flag if the user whitelisted or not
     * @param signature Signature of the trusted address
     */
    function mint(
        address reciever,
        uint256 tokenId,
        string calldata tokenUri,
        bool whitelisted,
        bytes calldata signature
    ) external payable nonReentrant {
        if (
            !_verifySignature(
                reciever,
                tokenId,
                tokenUri,
                whitelisted,
                signature
            )
        ) {
            revert InvalidSignature();
        }

        NftParameters memory _parameters = parameters;

        if (totalSupply + 1 > _parameters.info.maxTotalSupply) {
            revert TotalSupplyLimitReached();
        }

        uint256 price = whitelisted
            ? _parameters.info.whitelistMintPrice
            : _parameters.info.mintPrice;

        address platformAddress = _parameters
            .storageContract
            .factory()
            .platformAddress();
        uint8 feeBPs = _parameters
            .storageContract
            .factory()
            .platformCommission();

        uint256 amount;
        uint256 fee;

        if (
            _parameters.info.payingToken ==
            0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
        ) {
            amount = msg.value;

            if (amount != price) {
                revert NotEnoughETHSent(amount);
            }

            if (feeBPs == 0) {
                _parameters.creator.safeTransferETH(amount);
            } else {
                fee = (amount * uint256(feeBPs)) / _feeDenominator();

                platformAddress.safeTransferETH(fee);
                _parameters.creator.safeTransferETH(amount - fee);
            }
        } else {
            amount = price;

            if (feeBPs == 0) {
                _parameters.info.payingToken.safeTransferFrom(
                    msg.sender,
                    _parameters.creator,
                    amount
                );
            } else {
                fee = (amount * uint256(feeBPs)) / _feeDenominator();

                _parameters.info.payingToken.safeTransferFrom(
                    msg.sender,
                    platformAddress,
                    fee
                );
                _parameters.info.payingToken.safeTransferFrom(
                    msg.sender,
                    _parameters.creator,
                    amount - fee
                );
            }
        }

        totalSupply++;
        metadataUri[tokenId] = tokenUri;

        _safeMint(reciever, tokenId);
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
     * @notice Returns metadata link for specified ID
     * @param _tokenId Token ID
     */

    function tokenURI(
        uint256 _tokenId
    ) public view override returns (string memory) {
        return metadataUri[_tokenId];
    }

    /**
     * @notice Returns if specified interface is supported or no
     * @param interfaceId Interface ID
     */
    function supportsInterface(
        bytes4 interfaceId
    )
        public
        view
        virtual
        override(ERC2981Upgradeable, ERC721Upgradeable)
        returns (bool)
    {
        return
            ERC2981Upgradeable.supportsInterface(interfaceId) ||
            ERC721Upgradeable.supportsInterface(interfaceId);
    }

    /**
     * @notice owner() function overriding for OpenSea
     */
    function owner() public view override returns (address) {
        return parameters.storageContract.factory().platformAddress();
    }

    /**
     * @dev Approve or remove `operator` as an operator for the caller.
     * Operators can call {transferFrom} or {safeTransferFrom} for any token owned by the caller.
     *
     * Requirements:
     *
     * - The `operator` cannot be the caller.
     *
     * Emits an {ApprovalForAll} event.
     * Overridden with onlyAllowedOperatorApproval modifier to follow OpenSea royalties requirements.
     */
    function _setApprovalForAll(
        address _owner,
        address operator,
        bool approved
    ) internal override onlyAllowedOperatorApproval(operator) {
        super._setApprovalForAll(_owner, operator, approved);
    }

    /**
     * @dev Gives permission to `to` to transfer `tokenId` token to another account.
     * The approval is cleared when the token is transferred.
     *
     * Only a single account can be approved at a time, so approving the zero address clears previous approvals.
     *
     * Requirements:
     *
     * - The caller must own the token or be an approved operator.
     * - `tokenId` must exist.
     *
     * Emits an {Approval} event.
     * Overridden with onlyAllowedOperatorApproval modifier to follow OpenSea royalties requirements.
     */
    function _approve(
        address operator,
        uint256 tokenId,
        address auth,
        bool emitEvent
    ) internal override onlyAllowedOperatorApproval(operator) {
        super._approve(operator, tokenId, auth, emitEvent);
    }

    /**
     * @dev Transfers `tokenId` token from `from` to `to`.
     *
     * WARNING: Usage of this method is discouraged, use {safeTransferFrom} whenever possible.
     *
     * Requirements:
     *
     * - `from` cannot be the zero address.
     * - `to` cannot be the zero address.
     * - `tokenId` token must be owned by `from`.
     * - If the caller is not `from`, it must be approved to move this token by either {approve} or {setApprovalForAll}.
     *
     * Emits a {Transfer} event.
     * Overridden with onlyAllowedOperator modifier to follow OpenSea royalties requirements.
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override onlyAllowedOperator(from) {
        if (!parameters.info.transferable) {
            revert NotTransferable();
        }

        super.transferFrom(from, to, tokenId);
    }

    /**
     * @dev Verifies if the signature belongs to the current signer address
     * @param receiver The token receiver
     * @param tokenId The token ID
     * @param tokenUri The token URI
     * @param whitelisted If the receiver is whitelisted or no
     * @param signature The signature to check
     */
    function _verifySignature(
        address receiver,
        uint256 tokenId,
        string memory tokenUri,
        bool whitelisted,
        bytes memory signature
    ) internal view returns (bool) {
        return
            keccak256(
                abi.encodePacked(
                    receiver,
                    tokenId,
                    tokenUri,
                    whitelisted,
                    block.chainid
                )
            ).recover(signature) ==
            parameters.storageContract.factory().signerAddress();
    }
}

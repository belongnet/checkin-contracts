// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.27;

import {Initializable} from "solady/src/utils/Initializable.sol";
import {UUPSUpgradeable} from "solady/src/utils/UUPSUpgradeable.sol";
import {ERC721} from "solady/src/tokens/ERC721.sol";
import {ERC2981} from "solady/src/tokens/ERC2981.sol";
import {Ownable} from "solady/src/auth/Ownable.sol";
import {SafeTransferLib} from "solady/src/utils/SafeTransferLib.sol";

import {CreatorToken} from "../../utils/CreatorToken.sol";
import {Factory} from "../platform/Factory.sol";
import {SignatureVerifier} from "../utils/SignatureVerifier.sol";
import {StaticPriceParameters, DynamicPriceParameters, AccessTokenInfo} from "../Structures.sol";

/// @title AccessToken
/// @notice Upgradeable ERC-721 collection with royalty support, signature-gated minting,
///         optional auto-approval for a transfer validator, and platform/referral fee routing.
/// @dev
/// - Deployed via `Factory` using UUPS (Solady) upgradeability.
/// - Royalties use ERC-2981 with a fee receiver deployed by the factory when `feeNumerator > 0`.
/// - Payments can be in NativeCurrency or an ERC-20 token; platform fee and referral split are applied.
/// - Transfer validation is enforced via `CreatorToken` when transfers are enabled.
/// - `mintStaticPrice` and `mintDynamicPrice` are signature-gated (see `SignatureVerifier`).
contract AccessToken is Initializable, UUPSUpgradeable, ERC721, ERC2981, Ownable, CreatorToken {
    using SafeTransferLib for address;
    using SignatureVerifier for address;

    // ============================== Errors ==============================

    /// @notice Sent when the provided NativeCurrency amount is not equal to the required price.
    /// @param nativeCurrencyAmountSent Amount of NativeCurrency sent with the transaction.
    error IncorrectNativeCurrencyAmountSent(uint256 nativeCurrencyAmountSent);

    /// @notice Sent when the expected mint price no longer matches the effective price.
    /// @param currentPrice The effective price computed by the contract.
    error PriceChanged(uint256 currentPrice);

    /// @notice Sent when the expected paying token differs from the configured token.
    /// @param currentPayingToken The currently configured paying token.
    error TokenChanged(address currentPayingToken);

    /// @notice Sent when a provided array exceeds the max allowed size from factory parameters.
    error WrongArraySize();

    /// @notice Sent when a transfer is attempted while transfers are disabled or not allowed.
    error NotTransferable();

    /// @notice Sent when minting would exceed the collection total supply.
    error TotalSupplyLimitReached();

    /// @notice Sent when querying a token that has not been minted.
    error TokenIdDoesNotExist();

    // ============================== Events ==============================

    /// @notice Emitted after a successful mint payment.
    /// @param sender Payer address.
    /// @param paymentCurrency NativeCurrency pseudo-address or ERC-20 token used for payment.
    /// @param value Amount paid (wei for NativeCurrency; token units for ERC-20).
    event Paid(address indexed sender, address paymentCurrency, uint256 value);

    /// @notice Emitted when mint parameters are updated by the owner.
    /// @param newToken Paying token address.
    /// @param newPrice Public mint price (token units or wei).
    /// @param newWLPrice Whitelist mint price (token units or wei).
    /// @param autoApproved Whether the transfer validator is auto-approved for all holders.
    event NftParametersChanged(address newToken, uint256 newPrice, uint256 newWLPrice, bool autoApproved);

    // ============================== Types ==============================

    /// @notice Parameters used to initialize a newly deployed AccessToken collection.
    /// @dev Populated by the factory at creation and stored immutably in `parameters`.
    struct AccessTokenParameters {
        /// @notice Factory that deployed the collection; provides global settings and signer.
        Factory factory;
        /// @notice Creator (initial owner) of the collection.
        address creator;
        /// @notice Receiver of ERC-2981 royalties (if any).
        address feeReceiver;
        /// @notice Referral code attached to this collection (optional).
        bytes32 referralCode;
        /// @notice Collection info (name, symbol, prices, supply cap, payment token, etc.).
        AccessTokenInfo info;
    }

    // ============================== State ==============================

    /// @notice Pseudo-address used to represent NativeCurrency in payment flows.
    address public constant NATIVE_CURRENCY_ADDRESS = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    /// @notice Number of tokens minted so far.
    uint256 public totalSupply;

    /// @notice If true, the configured transfer validator is auto-approved for all holders.
    bool private autoApproveTransfersFromValidator;

    /// @notice Token ID → metadata URI mapping.
    mapping(uint256 => string) public metadataUri;

    /// @notice Immutable-like parameters set during initialization.
    AccessTokenParameters public parameters;

    // ============================== Initialization ==============================

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /// @notice Initializes the collection configuration and sets royalty and validator settings.
    /// @dev Called exactly once by the factory when deploying the collection proxy.
    /// @param _params AccessToken initialization parameters (see `AccessTokenParameters`).
    /// @param transferValidator_ Transfer validator contract (approved depending on `autoApprove` flag).
    function initialize(AccessTokenParameters calldata _params, address transferValidator_) external initializer {
        parameters = _params;

        if (_params.info.feeNumerator > 0) {
            _setDefaultRoyalty(_params.feeReceiver, _params.info.feeNumerator);
        }

        _setTransferValidator(transferValidator_);

        _initializeOwner(_params.creator);
    }

    // ============================== Admin ==============================

    /// @notice Owner-only: updates paying token and mint prices; toggles auto-approval of validator.
    /// @param _payingToken New paying token (use `NATIVE_CURRENCY_ADDRESS` for NativeCurrency).
    /// @param _mintPrice New public mint price.
    /// @param _whitelistMintPrice New whitelist mint price.
    /// @param autoApprove If true, `isApprovedForAll` auto-approves the transfer validator.
    function setNftParameters(address _payingToken, uint128 _mintPrice, uint128 _whitelistMintPrice, bool autoApprove)
        external
        onlyOwner
    {
        parameters.info.paymentToken = _payingToken;
        parameters.info.mintPrice = _mintPrice;
        parameters.info.whitelistMintPrice = _whitelistMintPrice;

        autoApproveTransfersFromValidator = autoApprove;

        emit NftParametersChanged(_payingToken, _mintPrice, _whitelistMintPrice, autoApprove);
    }

    // ============================== Minting ==============================

    /// @notice Signature-gated batch mint with static prices (public or whitelist).
    /// @dev
    /// - Validates each entry via factory signer (`checkStaticPriceParameters`).
    /// - Computes total due based on whitelist flags and charges payer in NativeCurrency or ERC-20.
    /// - Reverts if `paramsArray.length` exceeds factory’s `maxArraySize`.
    /// @param receiver Address that will receive all minted tokens.
    /// @param paramsArray Array of static price mint parameters (id, uri, whitelist flag).
    /// @param expectedPayingToken Expected paying token for sanity check.
    /// @param expectedMintPrice Expected total price (reverts if mismatched).
    function mintStaticPrice(
        address receiver,
        StaticPriceParameters[] calldata paramsArray,
        address expectedPayingToken,
        uint256 expectedMintPrice
    ) external payable {
        Factory factory = parameters.factory;
        require(paramsArray.length <= factory.nftFactoryParameters().maxArraySize, WrongArraySize());

        AccessTokenInfo memory info = parameters.info;

        uint256 amountToPay;
        for (uint256 i; i < paramsArray.length; ++i) {
            factory.nftFactoryParameters().signerAddress.checkStaticPriceParameters(receiver, paramsArray[i]);

            uint256 price = paramsArray[i].whitelisted ? info.whitelistMintPrice : info.mintPrice;

            unchecked {
                amountToPay += price;
            }

            _baseMint(paramsArray[i].tokenId, receiver, paramsArray[i].tokenUri);
        }

        require(_pay(amountToPay, expectedPayingToken) == expectedMintPrice, PriceChanged(expectedMintPrice));
    }

    /// @notice Signature-gated batch mint with per-item dynamic prices.
    /// @dev
    /// - Validates each entry via factory signer (`checkDynamicPriceParameters`).
    /// - Sums prices provided in the payload and charges payer accordingly.
    /// - Reverts if `paramsArray.length` exceeds factory’s `maxArraySize`.
    /// @param receiver Address that will receive all minted tokens.
    /// @param paramsArray Array of dynamic price mint parameters (id, uri, price).
    /// @param expectedPayingToken Expected paying token for sanity check.
    function mintDynamicPrice(
        address receiver,
        DynamicPriceParameters[] calldata paramsArray,
        address expectedPayingToken
    ) external payable {
        Factory factory = parameters.factory;
        require(paramsArray.length <= factory.nftFactoryParameters().maxArraySize, WrongArraySize());

        uint256 amountToPay;
        for (uint256 i; i < paramsArray.length; ++i) {
            factory.nftFactoryParameters().signerAddress.checkDynamicPriceParameters(receiver, paramsArray[i]);

            unchecked {
                amountToPay += paramsArray[i].price;
            }

            _baseMint(paramsArray[i].tokenId, receiver, paramsArray[i].tokenUri);
        }

        _pay(amountToPay, expectedPayingToken);
    }

    // ============================== Views ==============================

    /// @notice Returns metadata URI for a given token ID.
    /// @param _tokenId Token ID to query.
    /// @return The token URI string.
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        if (!_exists(_tokenId)) {
            revert TokenIdDoesNotExist();
        }

        return metadataUri[_tokenId];
    }

    /// @notice Collection name.
    function name() public view override returns (string memory) {
        return parameters.info.metadata.name;
    }

    /// @notice Collection symbol.
    function symbol() public view override returns (string memory) {
        return parameters.info.metadata.symbol;
    }

    /// @notice Contract-level metadata URI for marketplaces.
    /// @return The contract URI.
    function contractURI() external view returns (string memory) {
        return parameters.info.contractURI;
    }

    /// @notice Checks operator approval for all tokens of `_owner`.
    /// @dev Auto-approves the transfer validator when `autoApproveTransfersFromValidator` is true.
    /// @param _owner Token owner.
    /// @param operator Operator address to check.
    /// @return isApproved True if approved.
    function isApprovedForAll(address _owner, address operator) public view override returns (bool isApproved) {
        isApproved = super.isApprovedForAll(_owner, operator);

        if (!isApproved && autoApproveTransfersFromValidator) {
            isApproved = operator == address(_transferValidator);
        }
    }

    /// @notice Returns the current implementation address (UUPS).
    /// @return implementation Address of the implementation logic contract.
    function selfImplementation() external view virtual returns (address) {
        return _selfImplementation();
    }

    /// @notice EIP-165 interface support.
    /// @param interfaceId Interface identifier.
    /// @return True if supported.
    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC2981) returns (bool) {
        bool result;
        /// @solidity memory-safe-assembly
        assembly {
            let s := shr(224, interfaceId)
            // ICreatorToken: 0xad0d7f6c, ILegacyCreatorToken: 0xa07d229a.
            // ERC4906: 0x49064906, check https://eips.ethereum.org/EIPS/eip-4906.
            result := or(or(eq(s, 0xad0d7f6c), eq(s, 0xa07d229a)), eq(s, 0x49064906))
        }

        return result || super.supportsInterface(interfaceId);
    }

    // ============================== Internals ==============================

    /// @notice Internal mint helper that enforces supply cap and stores metadata.
    /// @param tokenId Token ID to mint.
    /// @param to Recipient address.
    /// @param tokenUri Metadata URI to set for the token.
    function _baseMint(uint256 tokenId, address to, string calldata tokenUri) private {
        require(totalSupply + 1 <= parameters.info.maxTotalSupply, TotalSupplyLimitReached());
        unchecked {
            totalSupply++;
        }

        metadataUri[tokenId] = tokenUri;
        _safeMint(to, tokenId);
    }

    /// @notice Handles payment routing for mints (NativeCurrency or ERC-20).
    /// @dev
    /// - Validates `expectedPayingToken` against configured payment token.
    ///  - Splits platform commission and referral share, then forwards remainder to creator.
    ///  - Emits {Paid}.
    /// @param price Expected total price to charge.
    /// @param expectedPayingToken Expected payment currency (NativeCurrency or ERC-20).
    /// @return amount Amount actually charged (wei or token units).
    function _pay(uint256 price, address expectedPayingToken) private returns (uint256 amount) {
        AccessTokenParameters memory _parameters = parameters;

        require(expectedPayingToken == _parameters.info.paymentToken, TokenChanged(_parameters.info.paymentToken));

        amount = expectedPayingToken == NATIVE_CURRENCY_ADDRESS ? msg.value : price;

        require(amount == price, IncorrectNativeCurrencyAmountSent(amount));

        uint256 fees;
        uint256 amountToCreator;
        unchecked {
            fees = (amount * _parameters.factory.nftFactoryParameters().platformCommission) / _feeDenominator();

            amountToCreator = amount - fees;
        }

        bytes32 referralCode = _parameters.referralCode;
        address refferalCreator = _parameters.factory.getReferralCreator(referralCode);

        uint256 feesToPlatform = fees;
        uint256 referralFees;
        if (referralCode != bytes32(0)) {
            referralFees = _parameters.factory.getReferralRate(_parameters.creator, referralCode, fees);
            unchecked {
                feesToPlatform -= referralFees;
            }
        }

        if (expectedPayingToken == NATIVE_CURRENCY_ADDRESS) {
            if (feesToPlatform > 0) {
                _parameters.factory.nftFactoryParameters().platformAddress.safeTransferETH(feesToPlatform);
            }
            if (referralFees > 0) {
                refferalCreator.safeTransferETH(referralFees);
            }

            _parameters.creator.safeTransferETH(amountToCreator);
        } else {
            if (feesToPlatform > 0) {
                expectedPayingToken.safeTransferFrom(
                    msg.sender, _parameters.factory.nftFactoryParameters().platformAddress, feesToPlatform
                );
            }
            if (referralFees > 0) {
                expectedPayingToken.safeTransferFrom(msg.sender, refferalCreator, referralFees);
            }

            expectedPayingToken.safeTransferFrom(msg.sender, _parameters.creator, amountToCreator);
        }

        emit Paid(msg.sender, expectedPayingToken, amount);
    }

    /// @notice Hook executed before transfers, mints, and burns.
    /// @dev
    /// - For pure transfers (non-mint/burn), enforces `transferable` and validates via `_validateTransfer`.
    /// @param from Sender address (zero for mint).
    /// @param to Recipient address (zero for burn).
    /// @param id Token ID being moved.
    function _beforeTokenTransfer(address from, address to, uint256 id) internal override {
        super._beforeTokenTransfer(from, to, id);

        if (from != address(0) && to != address(0)) {
            require(parameters.info.transferable, NotTransferable());
            _validateTransfer(msg.sender, from, to, id);
        }
    }

    /// @notice Authorizes UUPS upgrades; restricted to owner.
    /// @param /*newImplementation*/ New implementation (unused in guard).
    function _authorizeUpgrade(address /*newImplementation*/ ) internal override onlyOwner {}
}

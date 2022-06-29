// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/common/ERC2981Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IFactory.sol";
import "./interfaces/IStorageContract.sol";

import "hardhat/console.sol";

/// @title Contract that allow to mint ERC721 token with diffrent payment options and security advancements
/// @notice this contract does not have constructor and requires to call initialize

contract NFT is ERC721Upgradeable, OwnableUpgradeable, ReentrancyGuard, ERC2981Upgradeable {
    
    address public payingToken; // Current token accepted as a mint payment
    address public storageContract; // Storage contract address
    uint256 public mintPrice;   // Mint price
    bool public transferable;   // Flag if the tokens transferable or not
    uint256 public totalSupply; // The current totalSupply
    uint256 public maxTotalSupply;  // The max amount of tokens to be minted
    uint96 public totalRoyalty; // Royalty fraction for platform + Royalty fraction for creator
    address public creator; // Creator address

    string public contractURI;  // Contract URI (for OpenSea)

    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;  

    mapping(uint256 => string) public metadataUri;  // token ID -> metadata link

    event Withdrawn(address who, address token, uint256 amountForCreator, uint256 amountForPlatform);
    event EthReceived(address who, uint256 amount);
    event PayingTokenChanged(address oldToken, address newToken);
    event PriceChanged(uint256 oldPrice, uint256 newPrice);

    /// @dev initialize is called by factory when deployed
    /// @param _storageContract Contract that stores data
    /// @param _payingToken Address of ERC20 paying token or ETH address declared above
    /// @param _mintPrice Mint price
    /// @param _contractURI Contract URI
    /// @param _erc721name Name of ERC721 token
    /// @param _erc721shortName Symbol of ERC721 token
    /// @param _transferable Is tokens transferrable or not
    /// @param _maxTotalSupply Max total supply
    /// @param _feeReceiver Fee receiver
    /// @param _feeNumerator Fee numerator
    /// @param _creator Creator address
    function initialize(
        address _storageContract,
        address _payingToken,
        uint256 _mintPrice,
        string memory _contractURI,
        string memory _erc721name,
        string memory _erc721shortName,
        bool _transferable,
        uint256 _maxTotalSupply,
        address _feeReceiver,
        uint96 _feeNumerator,
        address _creator
    ) public initializer {
        __ERC721_init(_erc721name, _erc721shortName);
        __Ownable_init();
        payingToken = _payingToken;
        mintPrice = _mintPrice;
        contractURI = _contractURI;
        storageContract = _storageContract;
        transferable = _transferable;
        maxTotalSupply = _maxTotalSupply;
        _setDefaultRoyalty(_feeReceiver, _feeNumerator);
        totalRoyalty = _feeNumerator;
        creator = _creator;
    }

    /// @dev mints ERC721 token
    /// @notice needs a signature from trusted address in order to mint
    /// @param reciever Address that gets ERC721 token
    /// @param tokenId Id of a ERC721 token that is going to be minted
    /// @param tokenUri Metadata URI of the ERC721 token
    /// @param signature Signature of the trusted address
    function mint(
        address reciever,
        uint256 tokenId,
        string calldata tokenUri,
        bytes calldata signature
    ) external payable nonReentrant {
        require(
            _verifySignature(reciever, tokenId, tokenUri, signature),
            "Invalid signature"
        );

        require(totalSupply + 1 <= maxTotalSupply, "limit exceeded");

        _mint(reciever, tokenId);
        totalSupply++;
        metadataUri[tokenId] = tokenUri;

        uint256 amount;
        address payingToken_ = payingToken;


        uint256 fee;
        uint8 feeBPs = IFactory(IStorageContract(storageContract).factory())
            .platformCommission();

        address platformAddress = IFactory(IStorageContract(storageContract).factory()).platformAddress();
        if (payingToken_ == ETH) {
            require(msg.value >= mintPrice, "Not enough ether sent");
            amount = msg.value;
            if (feeBPs != 0) {
                fee = (amount * uint256(feeBPs)) / _feeDenominator();
                payable(platformAddress).transfer(fee);
                payable(creator).transfer(amount - fee);
            }
        } else {
            amount = mintPrice;
            if (feeBPs == 0) {
                IERC20(payingToken_).transferFrom(msg.sender, address(this), amount);
            } else {
                fee = (amount * uint256(feeBPs)) / _feeDenominator();
                IERC20(payingToken_).transferFrom(msg.sender, platformAddress, fee);
                IERC20(payingToken_).transferFrom(msg.sender, creator, amount - fee);
            }
        }
    }

    /// @notice Returns metadata link for specified ID
    /// @param _tokenId Token ID
    function tokenURI(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        return metadataUri[_tokenId];
    }

    function owner() public view override returns (address) {
        return IFactory(IStorageContract(storageContract).factory()).platformAddress();
    }

    /// @dev sets paying token
    /// @param _payingToken New token address
    function setPayingToken(address _payingToken) external {
        require(_msgSender() == creator, "not creator");
        address oldToken = payingToken;
        payingToken = _payingToken;
        emit PayingTokenChanged(oldToken, _payingToken);
    }

    /// @dev sets mint price
    /// @param _mintPrice New mint price
    function setMintPrice(uint256 _mintPrice) external {
        require(_msgSender() == creator, "not creator");
        uint256 oldPrice = mintPrice;
        mintPrice = _mintPrice;
        emit PriceChanged(oldPrice, _mintPrice);

    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC2981Upgradeable, ERC721Upgradeable) returns (bool) {
        return ERC2981Upgradeable.supportsInterface(interfaceId) || ERC721Upgradeable.supportsInterface(interfaceId);
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override { 
        require(transferable, "token is not transferable");
        super._transfer(from, to, tokenId);
    }

    function _verifySignature(
        address receiver,
        uint256 tokenId,
        string memory tokenUri,
        bytes memory signature
    ) public view returns (bool) {
        return
            ECDSA.recover(
                keccak256(
                    abi.encodePacked(
                        receiver, 
                        tokenId,
                        tokenUri
                    )
                ), signature
            ) == IFactory(IStorageContract(storageContract).factory()).signerAddress();
    }

    receive() payable external {
        emit EthReceived(_msgSender(), msg.value);
    }
}

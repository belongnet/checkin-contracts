// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IFactory.sol";
import "./interfaces/IStorageContract.sol";

/// @title Contract that allow to mint ERC721 token with diffrent payment options and security advancements
/// @notice this contract does not have constructor and requires to call initialize

contract NFT is ERC721Upgradeable, OwnableUpgradeable, ReentrancyGuard {
    address public payingToken; // Current token accepted as a mint payment
    address public storageContract; // Storage contract address
    uint256 public mintPrice;   // Mint price

    string public contractURI;  // Contract URI (for OpenSea)

    address public constant ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;  

    mapping(uint256 => string) public metadataUri;  // token ID -> metadata link
    mapping(address => uint256) public availableForOwner;   // token address -> withdraw amount available for the owner
    mapping(address => uint256) public availableForPlatform;    // token address -> withdraw amount available for the platform

    /// @dev initialize is called by factory when deployed
    /// @param _storageContract Contract that stores data
    /// @param _payingToken Address of ERC20 paying token or ETH address declared above
    /// @param _mintPrice Mint price
    /// @param _contractURI Contract URI
    /// @param erc721name Name of ERC721 token
    /// @param erc721shortName Symbol of ERC721 token
    function initialize(
        address _storageContract,
        address _payingToken,
        uint256 _mintPrice,
        string memory _contractURI,
        string memory erc721name,
        string memory erc721shortName
    ) public initializer {
        __ERC721_init(erc721name, erc721shortName);
        __Ownable_init();
        payingToken = _payingToken;
        mintPrice = _mintPrice;
        contractURI = _contractURI;
        storageContract = _storageContract;
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

        _mint(reciever, tokenId);
        metadataUri[tokenId] = tokenUri;

        uint256 amount;

        if (payingToken == ETH) {
            require(msg.value >= mintPrice, "Not enough ether sent");
            amount = msg.value;
        } else {
            amount = mintPrice;
            IERC20(payingToken).transferFrom(msg.sender, address(this), amount);
        }

        uint256 fee;
        address payingToken_ = payingToken;
        uint8 feePercent = IFactory(IStorageContract(storageContract).factory())
            .platformCommission();
        if (feePercent != 0) {
            fee = (amount * uint256(feePercent)) / 100;
            availableForPlatform[payingToken_] += fee;
        }
        availableForOwner[payingToken_] += amount - fee;
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

    /// @dev transfer tokens/ETH to owner or platform address
    /// @param _token token addres
    function withdrawAll(address _token) external {
        uint256 amount;
        if (msg.sender == owner()) {
            amount = availableForOwner[_token];
        } else if (
            msg.sender ==
            IFactory(IStorageContract(storageContract).factory())
                .platformAddress()
        ) {
            amount = availableForPlatform[_token];
        } else {
            revert("Not allowed");
        }

        if (amount != 0) {
            if (_token == ETH) {
                payable(msg.sender).transfer(amount);
            } else {
                IERC20(_token).transfer(msg.sender, amount);
            }
        }
    }

    /// @dev sets paying token
    /// @param _payingToken New token address
    function setPayingToken(address _payingToken) external onlyOwner {
        payingToken = _payingToken;
    }

    /// @dev sets mint price
    /// @param _mintPrice New mint price
    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        mintPrice = _mintPrice;
    }

    function _verifySignature(
        address receiver,
        uint256 tokenId,
        string memory tokenUri,
        bytes memory signature
    ) internal view returns (bool) {
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
}

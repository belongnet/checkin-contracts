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
    mapping(address => uint256) public availableForCreator;   // token address -> withdraw amount available for the creator
    mapping(address => uint256) public availableForPlatform;    // token address -> withdraw amount available for the platform
    mapping(address => uint256) public lastBalances;    // token address -> last balance of the contract

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

        if (payingToken_ == ETH) {
            require(msg.value >= mintPrice, "Not enough ether sent");
            amount = msg.value;
            lastBalances[payingToken_] = address(this).balance;
        } else {
            amount = mintPrice;
            IERC20(payingToken_).transferFrom(msg.sender, address(this), amount);
            lastBalances[payingToken_] = IERC20(payingToken_).balanceOf(address(this));
        }

        uint256 fee;
        uint8 feePercent = IFactory(IStorageContract(storageContract).factory())
            .platformCommission();
        if (feePercent != 0) {
            fee = (amount * uint256(feePercent)) / _feeDenominator();
            availableForPlatform[payingToken_] += fee;
        }
        availableForCreator[payingToken_] += amount - fee;
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

    /// @dev transfer tokens/ETH to owner or platform address
    /// @param _token token address
    function withdrawAll(address _token) external {
        address creator_ = creator;
        address platform_ = IFactory(IStorageContract(storageContract).factory())
                .platformAddress();

        uint256 amountForCreator = getAmountTokenToPay(creator_, _token);
        uint256 amountForPlatform = getAmountTokenToPay(platform_, _token);

        availableForCreator[_token] = 0;
        availableForPlatform[_token] = 0;

        if (_token == ETH) {
            if(amountForCreator != 0) payable(creator_).transfer(amountForCreator);
            if(amountForPlatform != 0) payable(platform_).transfer(amountForPlatform);
            lastBalances[_token] = address(this).balance;
        } else {
            if(amountForCreator != 0) IERC20(_token).transfer(creator_, amountForCreator);
            if(amountForPlatform != 0) IERC20(_token).transfer(platform_, amountForPlatform);
             lastBalances[_token] = IERC20(_token).balanceOf(address(this));
        }
        
        emit Withdrawn(_msgSender(), _token, amountForCreator, amountForPlatform);

    }
    
    /// @dev returns amount of specified token available for specified address
    /// @param _for account address (must be platform address or creator's address)
    /// @param _token token address
    function getAmountTokenToPay(address _for, address _token) public view returns (uint256) {
        uint256 amount;
        uint8 platformCommission = IFactory(IStorageContract(storageContract).factory()).platformCommission();
        uint256 lastBalance = lastBalances[_token];
        uint256 currentBalance = _token == ETH ? address(this).balance : IERC20(_token).balanceOf(address(this));
        if (_for == creator) {
            amount = availableForCreator[_token];
            if (currentBalance > lastBalance)
                amount += (currentBalance - lastBalance) * (totalRoyalty - uint96(platformCommission)) / totalRoyalty;            
        } else if (
            _for ==
            IFactory(IStorageContract(storageContract).factory())
                .platformAddress()
        ) {
            amount = availableForPlatform[_token];
            if (currentBalance > lastBalance)
                amount += (currentBalance - lastBalance) * uint256(platformCommission) / totalRoyalty;            
        }
        return amount;
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

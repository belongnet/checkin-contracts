// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./NFT.sol";
import "./interfaces/IStorageContract.sol";

contract Factory is OwnableUpgradeable {

    struct InstanceInfo {
        string name;    // name of a new collection
        string symbol;  // symbol of a new collection
        string contractURI; // contract URI of a new collection
        address payingToken;    // paying token of a new collection
        uint256 mintPrice;  // mint price of a token from a new collection
        uint256 whitelistMintPrice;  // mint price of a token from a new collection for whitelisted users
        bool transferable;  // shows if tokens will be transferrable or not
        uint256 maxTotalSupply; // max total supply of a new collection
        uint96 feeNumerator;    // total fee amount (in BPS) of a new collection
        address feeReceiver; // royalties receiver address
        bytes signature;    // BE's signature
    }

    address public platformAddress; // Address which is allowed to collect platform fee
    address public storageContract; // Storage contract address 
    address public signerAddress;   // Signer address
    uint8 public platformCommission;    // Platform comission percent

    event InstanceCreated(
        string name,
        string symbol,
        address instance,
        uint256 length
    );

    function initialize(
        address _signer,
        address _platformAddress,
        uint8 _platformCommission,
        address _storageContract
    ) external initializer {
        __Ownable_init();
        signerAddress = _signer;
        platformAddress = _platformAddress;
        platformCommission = _platformCommission;
        storageContract = _storageContract;
    }

    function setPlatformCommission(uint8 _platformCommission) external onlyOwner {
        platformCommission = _platformCommission;
    }

    function setPlatformAddress(address _platformAddress) external onlyOwner {
        platformAddress = _platformAddress;
    }

    function setSigner(address _signer) external onlyOwner {
        signerAddress = _signer;
    }

    /**
     * @dev produces new instance with defined name and symbol
     * @param _info New instance info
     * @return instance address of new contract
     */
    function produce(
        InstanceInfo memory _info
    ) public returns (address) {
        require(
            _verifySignature(_info.name, _info.symbol, _info.contractURI, _info.feeNumerator, _info.feeReceiver, _info.signature),
            "Invalid signature"
        );
        _createInstanceValidate(_info.name, _info.symbol);
        address instanceCreated = _createInstance(_info.name, _info.symbol);
        require(
            instanceCreated != address(0),
            "Factory: INSTANCE_CREATION_FAILED"
        );
        NFT(payable(instanceCreated)).initialize(
            storageContract,
            _info.payingToken,
            _info.mintPrice,
            _info.whitelistMintPrice,
            _info.contractURI,
            _info.name,
            _info.symbol,
            _info.transferable,
            _info.maxTotalSupply,
            _info.feeReceiver,
            _info.feeNumerator,
            _msgSender()
        );
        return instanceCreated;
    }

    function _createInstanceValidate(string memory name, string memory symbol)
        internal
        view
    {
        require((bytes(name)).length != 0, "Factory: EMPTY NAME");
        require((bytes(symbol)).length != 0, "Factory: EMPTY SYMBOL");
        require(
            IStorageContract(storageContract).getInstance(
                keccak256(abi.encodePacked(name, symbol))
            ) == address(0),
            "Factory: ALREADY_EXISTS"
        );
    }

    function _createInstance(string memory name, string memory symbol)
        internal
        returns (address instanceAddress)
    {
        NFT instance = new NFT();
        instanceAddress = address(instance);
        uint256 id = IStorageContract(storageContract).addInstance(
            instanceAddress,
            _msgSender(),
            name,
            symbol
        );
        emit InstanceCreated(name, symbol, instanceAddress, id);
    }

    function _verifySignature(
        string memory name,
        string memory symbol,   
        string memory contractURI,
        uint96 feeNumerator,
        address feeReceiver,
        bytes memory signature
    ) public view returns (bool) {
        return
            ECDSA.recover(
                keccak256(
                    abi.encodePacked(
                        name, 
                        symbol,
                        contractURI,
                        feeNumerator,
                        feeReceiver
                    )
                ), signature
            ) == signerAddress;
    }

    uint256[49] private __gap;

}

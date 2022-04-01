// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.13;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./NFT.sol";
import "./interfaces/IStorageContract.sol";

contract Factory is OwnableUpgradeable {
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

    function setPlatformCommission(uint8 _platformCommission) external {
        platformCommission = _platformCommission;
    }

    function setPlatformAddress(address _platformAddress) external {
        platformAddress = _platformAddress;
    }

    function setSigner(address _signer) external {
        signerAddress = _signer;
    }

    /**
     * @dev produces new instance with defined name and symbol
     * @param name name of new token
     * @param symbol symbol of new token
     * @return instance address of new contract
     */
    function produce(
        string memory name,
        string memory symbol,
        string memory contractURI,
        address _payingToken,
        uint256 _mintPrice
    ) public returns (address instance) {
        _createInstanceValidate(name, symbol);
        address instanceCreated = _createInstance(name, symbol);
        require(
            instanceCreated != address(0),
            "Factory: INSTANCE_CREATION_FAILED"
        );
        address ms = _msgSender();
        NFT(instanceCreated).initialize(
            storageContract,
            _payingToken,
            _mintPrice,
            contractURI,
            name,
            symbol
        );
        OwnableUpgradeable(instanceCreated).transferOwnership(ms);
        instance = instanceCreated;
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
}

// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {NFT, ECDSA} from "./NFT.sol";
import {StorageContract} from "./StorageContract.sol";
import {NftParameters, InstanceInfo} from "./Structures.sol";
import {ITransferValidator721} from "./interfaces/ITransferValidator721.sol";

error InvalidSignature();
error EmptyNamePasted();
error EmptySymbolPasted();
error InstanceAlreadyExists();
error InstanceCreationFailed();
error ZeroAddressPasted();

contract Factory is OwnableUpgradeable {
    using ECDSA for bytes32;

    event InstanceCreated(
        string name,
        string symbol,
        NFT instance,
        uint256 length
    );

    event SignerSet(address newSigner);
    event PlatformComissionSet(uint8 newComission);
    event PlatformAddressSet(address newPlatformAddress);

    ITransferValidator721 public constant DEFAULT_TRANSFER_VALIDATOR =
        ITransferValidator721(0x721C0078c2328597Ca70F5451ffF5A7B38D4E947);

    address public platformAddress; // Address which is allowed to collect platform fee
    StorageContract public storageContract; // Storage contract address
    address public signerAddress; // Signer address
    uint8 public platformCommission; // Platform comission BPs

    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPasted();
        }
        _;
    }

    // constructor() {
    //     _disableInitializers();
    // }

    /**
     * @notice Initializes the contract
     * @param _signer The signer address
     * @param _platformAddress The platform address
     * @param _platformCommission The platform comission (BPs)
     * @param _storageContract The storage contract address
     */
    function initialize(
        address _signer,
        address _platformAddress,
        uint8 _platformCommission,
        StorageContract _storageContract
    )
        external
        initializer
        zeroAddressCheck(_signer)
        zeroAddressCheck(_platformAddress)
        zeroAddressCheck(address(_storageContract))
    {
        __Ownable_init(msg.sender);

        signerAddress = _signer;
        platformAddress = _platformAddress;
        platformCommission = _platformCommission;
        storageContract = _storageContract;

        emit SignerSet(_signer);
        emit PlatformComissionSet(_platformCommission);
        emit PlatformAddressSet(_platformAddress);
    }

    /**
     * @notice Sets new platform comission
     * @dev Only owner can call it
     * @param _platformCommission The platform comission
     */
    function setPlatformCommission(
        uint8 _platformCommission
    ) external onlyOwner {
        platformCommission = _platformCommission;
        emit PlatformComissionSet(_platformCommission);
    }

    /**
     * @notice Sets new platform address
     * @dev Only owner can call it
     * @param _platformAddress The platform address
     */
    function setPlatformAddress(
        address _platformAddress
    ) external onlyOwner zeroAddressCheck(_platformAddress) {
        platformAddress = _platformAddress;
        emit PlatformAddressSet(_platformAddress);
    }

    /**
     * @notice Sets new signer address
     * @dev Only owner can call it
     * @param _signer The signer address
     */
    function setSigner(
        address _signer
    ) external onlyOwner zeroAddressCheck(_signer) {
        signerAddress = _signer;
        emit SignerSet(_signer);
    }

    /**
     * @notice produces new instance with defined name and symbol
     * @param _info The new instance's info
     * @return instance The new instance's address
     */
    function produce(
        InstanceInfo calldata _info,
        ITransferValidator721 validator
    ) external returns (NFT instance) {
        if (
            !_verifySignature(
                _info.name,
                _info.symbol,
                _info.contractURI,
                _info.feeNumerator,
                _info.feeReceiver,
                _info.signature
            )
        ) {
            revert InvalidSignature();
        }

        NftParameters memory params = NftParameters(
            storageContract,
            _info,
            msg.sender
        );

        if (address(validator) == address(0)) {
            validator = DEFAULT_TRANSFER_VALIDATOR;
        }

        instance = _createInstance(_info.name, _info.symbol);

        instance.initialize(params, validator);

        // instance.transferOwnership(msg.sender);
        return instance;
    }

    /**
     * @dev Creates a new instance of NFT and adds the info
     * into the Storage contract
     * @param name New instance's name
     * @param symbol New instance's symbol
     * @return instance The new instance's address
     */
    function _createInstance(
        string memory name,
        string memory symbol
    ) internal returns (NFT instance) {
        if ((bytes(name)).length == 0) {
            revert EmptyNamePasted();
        }
        if ((bytes(symbol)).length == 0) {
            revert EmptySymbolPasted();
        }

        StorageContract _storageContract = storageContract;

        if (
            _storageContract.instancesByName(
                keccak256(abi.encodePacked(name, symbol))
            ) != NFT(address(0))
        ) {
            revert InstanceAlreadyExists();
        }

        instance = new NFT();

        if (instance == NFT(address(0))) {
            revert InstanceCreationFailed();
        }

        uint256 id = _storageContract.addInstance(
            instance,
            msg.sender,
            name,
            symbol
        );
        emit InstanceCreated(name, symbol, instance, id);
    }

    /**
     * @dev Verifies if the signature belongs to the current signer address
     * @param name New instance's name
     * @param symbol New instance's symbol
     * @param contractURI New instance's contract URI
     * @param feeNumerator Fee numerator for ERC2981
     * @param feeReceiver Fee receiver for ERC2981
     * @param signature The signature to check
     */
    function _verifySignature(
        string calldata name,
        string calldata symbol,
        string calldata contractURI,
        uint96 feeNumerator,
        address feeReceiver,
        bytes calldata signature
    ) internal view returns (bool) {
        return
            keccak256(
                abi.encodePacked(
                    name,
                    symbol,
                    contractURI,
                    feeNumerator,
                    feeReceiver,
                    block.chainid
                )
            ).recover(signature) == signerAddress;
    }

    uint256[49] private __gap;
}

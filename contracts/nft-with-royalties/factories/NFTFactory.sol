// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {SignatureCheckerLib} from "solady/src/utils/SignatureCheckerLib.sol";
import {NFT} from "../NFT.sol";
import {StorageContract} from "../StorageContract.sol";
import {NftParameters, InstanceInfo} from "../Structures.sol";
import {ITransferValidator721} from "../interfaces/ITransferValidator721.sol";

error InvalidSignature();
error EmptyNamePasted();
error EmptySymbolPasted();
error NFTAlreadyExists();
error ZeroAddressPasted();

/// @title NFT Factory Contract
/// @notice A factory contract to create new NFT instances with specific parameters
/// @dev This contract allows producing NFTs, managing platform settings, and verifying signatures
contract NFTFactory is OwnableUpgradeable {
    using SignatureCheckerLib for address;

    /// @notice Event emitted when a new NFT is created
    /// @param name Name of the created NFT
    /// @param symbol Symbol of the created NFT
    /// @param instance The address of the created NFT instance
    /// @param id The ID of the newly created NFT
    event NFTCreated(string name, string symbol, NFT instance, uint256 id);

    /// @notice Event emitted when the signer address is set
    /// @param newSigner The new signer address
    event SignerSet(address newSigner);

    /// @notice Event emitted when the platform commission is set
    /// @param newComission The new platform commission in BPs (basis points)
    event PlatformComissionSet(uint8 newComission);

    /// @notice Event emitted when the platform address is set
    /// @param newPlatformAddress The new platform address
    event PlatformAddressSet(address newPlatformAddress);

    /// @notice Event emitted when the transfer validator is set
    /// @param newValidator The new transfer validator contract
    event TransferValidatorSet(ITransferValidator721 newValidator);

    /// @notice Event emitted when the storage address is set
    /// @param newStorageContract The new storage contract
    event StorageContractSet(address newStorageContract);

    /// @notice Address of the current transfer validator
    /**
     * Ethereum: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
     * BASE/OP: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
     * Polygon/Poygon zkEVM: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
     * BSC: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
     * Ethereum Sepolia: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
     */
    ITransferValidator721 public transferValidator;

    /// @notice Platform address that is allowed to collect fees
    address public platformAddress;

    /// @notice Address of the storage contract used to store NFT instances
    address public storageContract;

    /// @notice Address of the signer used for signature verification
    address public signerAddress;

    /// @notice The platform commission in BPs
    uint8 public platformCommission;

    /// @notice Modifier to check if the passed address is not zero
    /// @param _address The address to check
    modifier zeroAddressCheck(address _address) {
        if (_address == address(0)) {
            revert ZeroAddressPasted();
        }
        _;
    }

    // constructor() {
    //     _disableInitializers();
    // }

    /// @notice Initializes the contract
    /// @param _signer The address of the signer
    /// @param _platformAddress The address of the platform that collects fees
    /// @param _platformCommission The platform commission in BPs
    /// @param _storageContract The address of the storage contract
    /// @param validator The transfer validator contract
    function initialize(
        address _signer,
        address _platformAddress,
        uint8 _platformCommission,
        address _storageContract,
        ITransferValidator721 validator
    ) external initializer {
        __Ownable_init(msg.sender);

        _setStorageContract(_storageContract);
        _setSigner(_signer);
        _setPlatformAddress(_platformAddress);
        _setPlatformCommission(_platformCommission);
        _setTransferValidator(validator);
    }

    /// @notice Sets new storage contract address
    /// @dev Can only be called by the owner
    /// @param _storageContract The new storage address
    function setStorageContract(address _storageContract) external onlyOwner {
        _setStorageContract(_storageContract);
    }

    /// @notice Sets new platform commission
    /// @dev Can only be called by the owner
    /// @param _platformCommission The new platform commission in BPs
    function setPlatformCommission(
        uint8 _platformCommission
    ) external onlyOwner {
        _setPlatformCommission(_platformCommission);
    }

    /// @notice Sets new platform address
    /// @dev Can only be called by the owner
    /// @param _platformAddress The new platform address
    function setPlatformAddress(address _platformAddress) external onlyOwner {
        _setPlatformAddress(_platformAddress);
    }

    /// @notice Sets new signer address
    /// @dev Can only be called by the owner
    /// @param _signer The new signer address
    function setSigner(address _signer) external onlyOwner {
        _setSigner(_signer);
    }

    /// @notice Sets new transfer validator contract
    /// @dev Can only be called by the owner
    /// @param validator The new transfer validator contract
    function setTransferValidator(
        ITransferValidator721 validator
    ) external onlyOwner {
        _setTransferValidator(validator);
    }

    /// @notice Produces a new NFT instance
    /// @dev Creates a new instance of the NFT and adds the information to the storage contract
    /// @param _info Struct containing the details of the new NFT instance
    /// @return nft The address of the created NFT instance
    function produce(InstanceInfo calldata _info) external returns (NFT nft) {
        if ((bytes(_info.name)).length == 0) {
            revert EmptyNamePasted();
        }
        if ((bytes(_info.symbol)).length == 0) {
            revert EmptySymbolPasted();
        }

        if (
            !_isSignatureValid(
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

        address _storageContract = storageContract;

        NftParameters memory params = NftParameters({
            storageContract: _storageContract,
            info: _info,
            creator: msg.sender,
            platform: platformAddress
        });

        if (
            StorageContract(_storageContract).getInstance(
                keccak256(abi.encodePacked(_info.name, _info.symbol))
            ) != NFT(address(0))
        ) {
            revert NFTAlreadyExists();
        }

        nft = new NFT(params, transferValidator);

        uint256 id = StorageContract(_storageContract).addInstance(
            nft,
            msg.sender,
            _info.name,
            _info.symbol
        );

        emit NFTCreated(_info.name, _info.symbol, nft, id);
    }

    /// @notice Verifies if the signature is valid for the current signer address
    /// @dev This function checks the signature for the provided NFT data
    /// @param name Name of the new NFT instance
    /// @param symbol Symbol of the new NFT instance
    /// @param contractURI URI for the new contract
    /// @param feeNumerator Fee numerator for ERC2981 (royalties)
    /// @param feeReceiver Address to receive the fees
    /// @param signature The signature to validate
    /// @return bool Whether the signature is valid
    function _isSignatureValid(
        string calldata name,
        string calldata symbol,
        string calldata contractURI,
        uint96 feeNumerator,
        address feeReceiver,
        bytes calldata signature
    ) internal view returns (bool) {
        return
            signerAddress.isValidSignatureNow(
                keccak256(
                    abi.encodePacked(
                        name,
                        symbol,
                        contractURI,
                        feeNumerator,
                        feeReceiver,
                        block.chainid
                    )
                ),
                signature
            );
    }

    /// @notice Private function to set the storage address
    /// @param _storageContract The new storage address
    function _setStorageContract(
        address _storageContract
    ) private zeroAddressCheck(_storageContract) {
        storageContract = _storageContract;
        emit StorageContractSet(_storageContract);
    }

    /// @notice Private function to set the platform commission
    /// @param _platformCommission The new platform commission in BPs
    function _setPlatformCommission(uint8 _platformCommission) private {
        platformCommission = _platformCommission;
        emit PlatformComissionSet(_platformCommission);
    }

    /// @notice Private function to set the platform address
    /// @param _platformAddress The new platform address
    function _setPlatformAddress(
        address _platformAddress
    ) private zeroAddressCheck(_platformAddress) {
        platformAddress = _platformAddress;
        emit PlatformAddressSet(_platformAddress);
    }

    /// @notice Private function to set the signer address
    /// @param _signer The new signer address
    function _setSigner(address _signer) private zeroAddressCheck(_signer) {
        signerAddress = _signer;
        emit SignerSet(_signer);
    }

    /// @notice Private function to set the transfer validator contract
    /// @param validator The new transfer validator contract
    function _setTransferValidator(
        ITransferValidator721 validator
    ) private zeroAddressCheck(address(validator)) {
        transferValidator = validator;
        emit TransferValidatorSet(validator);
    }
}

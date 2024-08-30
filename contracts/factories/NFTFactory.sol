// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.25;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ECDSA} from "solady/src/utils/ECDSA.sol";

import {NFT} from "../NFT.sol";
import {StorageContract} from "../StorageContract.sol";
import {NftParameters, InstanceInfo} from "../Structures.sol";
import {ITransferValidator721} from "../interfaces/ITransferValidator721.sol";

error InvalidSignature();
error EmptyNamePasted();
error EmptySymbolPasted();
error NFTAlreadyExists();
error NFTCreationFailed();
error ZeroAddressPasted();

contract NFTFactory is OwnableUpgradeable {
    using ECDSA for bytes32;

    event NFTCreated(string name, string symbol, NFT instance, uint256 id);

    event SignerSet(address newSigner);
    event PlatformComissionSet(uint8 newComission);
    event PlatformAddressSet(address newPlatformAddress);
    event TransferValidatorSet(ITransferValidator721 newValidator);

    /**
     * Ethereum: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
     * BASE/OP: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
     * Polygon/Poygon zkEVM: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
     * BSC: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
     * Ethereum Sepolia: 0x721C0078c2328597Ca70F5451ffF5A7B38D4E947
     */
    ITransferValidator721 public transferValidator;

    address public platformAddress; // Address which is allowed to collect platform fee
    address public storageContract; // Storage contract address
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
        address _storageContract,
        ITransferValidator721 validator
    )
        external
        initializer
        zeroAddressCheck(_signer)
        zeroAddressCheck(_platformAddress)
        zeroAddressCheck(_storageContract)
    {
        __Ownable_init(msg.sender);

        signerAddress = _signer;
        platformAddress = _platformAddress;
        platformCommission = _platformCommission;
        storageContract = _storageContract;
        transferValidator = validator;

        emit SignerSet(_signer);
        emit PlatformComissionSet(_platformCommission);
        emit PlatformAddressSet(_platformAddress);
        emit TransferValidatorSet(validator);
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

    function setTransferValidator(
        ITransferValidator721 validator
    ) external onlyOwner zeroAddressCheck(address(validator)) {
        transferValidator = validator;
        emit TransferValidatorSet(validator);
    }

    /**
     * @notice Produces new NFT instance with defined name and symbol
     * @dev Creates a new instance of NFT and adds the info into the Storage contract
     * @param _info The new NFT's info
     * @return nft The new instance's address
     */
    function produce(InstanceInfo calldata _info) external returns (NFT nft) {
        if ((bytes(_info.name)).length == 0) {
            revert EmptyNamePasted();
        }
        if ((bytes(_info.symbol)).length == 0) {
            revert EmptySymbolPasted();
        }

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

        address _storageContract = storageContract;

        NftParameters memory params = NftParameters(
            _storageContract,
            _info,
            msg.sender
        );

        if (
            StorageContract(_storageContract).instancesByName(
                keccak256(abi.encodePacked(_info.name, _info.symbol))
            ) != NFT(address(0))
        ) {
            revert NFTAlreadyExists();
        }

        nft = new NFT(params, transferValidator);

        if (nft == NFT(address(0))) {
            revert NFTCreationFailed();
        }

        uint256 id = StorageContract(_storageContract).addNFT(
            nft,
            msg.sender,
            _info.name,
            _info.symbol
        );

        emit NFTCreated(_info.name, _info.symbol, nft, id);
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
}

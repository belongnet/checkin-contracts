// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {BaseERC721} from "../BaseERC721.sol";
import {InstanceInfo, NftParameters} from "../Structures.sol";

import {ITransferValidator721} from "../interfaces/ITransferValidator721.sol";

contract ERC721Mock is BaseERC721 {
    // constructor() {
    //     _disableInitializers();
    // }

    /**
     * @dev called by factory when instance deployed

     */
    function initialize(
        string calldata _name,
        string calldata _symbol,
        string calldata uri
    ) external initializer {
        InstanceInfo memory _info = InstanceInfo({
            name: _name,
            symbol: _symbol,
            contractURI: uri,
            payingToken: address(0),
            mintPrice: 0,
            whitelistMintPrice: 0,
            transferable: true,
            maxTotalSupply: 10000,
            feeNumerator: 1000,
            feeReceiver: msg.sender,
            collectionExpires: block.timestamp * 100,
            signature: bytes("")
        });
        NftParameters memory params = NftParameters({
            storageContract: address(0),
            info: _info,
            creator: msg.sender
        });

        __ERC721Base_init(
            params,
            ITransferValidator721(0x721C0078c2328597Ca70F5451ffF5A7B38D4E947)
        );
    }

    /**
     * @notice Mints new NFT
     * @dev Requires a signature from the trusted address
     * @param reciever Address that gets ERC721 token
     * @param tokenUri Metadata URI of the ERC721 token
     */
    function mint(
        uint256 tokenId,
        address reciever,
        string calldata tokenUri
    ) external {
        mint_(tokenId, reciever, tokenUri);
    }
}

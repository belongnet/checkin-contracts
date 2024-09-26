// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {BaseERC721} from "../BaseERC721.sol";
import {InstanceInfo, NftParameters} from "../Structures.sol";

import {ITransferValidator721} from "../interfaces/ITransferValidator721.sol";

contract ERC721Mock is BaseERC721 {
    InstanceInfo _info =
        InstanceInfo({
            name: "TestMock",
            symbol: "TSTMCK",
            contractURI: "ipfs://tbd/",
            payingToken: address(0),
            mintPrice: 0,
            whitelistMintPrice: 0,
            transferable: true,
            maxTotalSupply: 10000,
            feeNumerator: 1000,
            feeReceiver: msg.sender,
            collectionExpire: block.timestamp * 100,
            signature: bytes("")
        });
    NftParameters params =
        NftParameters({factory: msg.sender, info: _info, creator: msg.sender});

    /**
     * @dev called by factory when instance deployed

     */
    constructor()
        BaseERC721(
            params,
            ITransferValidator721(0x721C0078c2328597Ca70F5451ffF5A7B38D4E947)
        )
    {}

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
        _baseMint(tokenId, reciever, tokenUri);
    }
}

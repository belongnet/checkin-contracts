// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {BaseERC721} from "../BaseERC721.sol";

import {ITransferValidator721} from "../interfaces/ITransferValidator721.sol";

error TotalSupplyLimitReached();
error NotEnoughETHSent(uint256 ETHsent);
error NotTransferable();

contract ERC721Mock is BaseERC721 {
    // constructor() {
    //     _disableInitializers();
    // }

    /**
     * @dev called by factory when instance deployed

     */
    function initialize() external initializer {
        string[2] memory erc721Metadata = ["TestToken", "TST"];

        __ERC721Base_init(
            erc721Metadata,
            msg.sender,
            1000,
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

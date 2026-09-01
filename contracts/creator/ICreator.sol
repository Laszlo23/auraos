// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ICreatorCollection {
    function mintFromDesk(address to, uint256 tokenId) external;
    function totalMinted() external view returns (uint256);
    function maxSupply() external view returns (uint256);
    function mintDesk() external view returns (address);
}

enum CreatorMintAsset {
    USDG,
    ETH
}

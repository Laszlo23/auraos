// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Aura Relic — numbered collectible ERC-721. Max 7. Not AURA, not pAURA, not an investment.
 * Mint is server-gated (MINTER_ROLE only). No public mint, no voucher, no supply raise.
 *
 * Deploy on Base Sepolia first; mainnet only after review.
 */

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract AuraRelic is ERC721, AccessControl, Pausable {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant MAX_SUPPLY = 7;
    uint256 public totalMinted;
    string private _baseTokenURI;

    error SoldOut();
    error BadToken();
    error TokenTaken();

    constructor(address admin, string memory baseURI_) ERC721("Aura Relic", "RELIC") {
        require(admin != address(0), "admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        _baseTokenURI = baseURI_;
    }

    function maxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }

    function mint(address to, uint256 tokenId) external onlyRole(MINTER_ROLE) whenNotPaused {
        if (totalMinted >= MAX_SUPPLY) revert SoldOut();
        if (tokenId < 1 || tokenId > MAX_SUPPLY) revert BadToken();
        if (_ownerOf(tokenId) != address(0)) revert TokenTaken();
        totalMinted += 1;
        _safeMint(to, tokenId);
    }

    function setBaseURI(string calldata uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = uri;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

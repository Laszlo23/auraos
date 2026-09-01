// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Per-creator ERC-721 collection on Robinhood Chain.
 * Minted only through the paired AuraCreatorMintDesk (primary sales).
 */
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC2981} from "@openzeppelin/contracts/token/common/ERC2981.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

import {ICreatorCollection} from "./ICreator.sol";

contract AuraCreatorCollection is ERC721, ERC2981, AccessControl, Pausable, ICreatorCollection {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public immutable MAX_SUPPLY;
    uint256 public totalMinted;
    string private _baseTokenURI;
    bool public metadataFrozen;
    address public mintDesk;

    error SoldOut();
    error TokenTaken();
    error Frozen();
    error NotDesk();
    error ZeroAddress();

    event MetadataFrozen(string uri);
    event MintDeskSet(address indexed desk);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory baseURI_,
        uint256 maxSupply_,
        address admin,
        address royaltyRecipient,
        uint96 royaltyBps,
        address mintDesk_
    ) ERC721(name_, symbol_) {
        if (admin == address(0) || maxSupply_ == 0) revert ZeroAddress();
        MAX_SUPPLY = maxSupply_;
        _baseTokenURI = baseURI_;
        mintDesk = mintDesk_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        if (royaltyRecipient != address(0) && royaltyBps > 0) {
            _setDefaultRoyalty(royaltyRecipient, royaltyBps);
        }
        if (mintDesk_ != address(0)) {
            _grantRole(MINTER_ROLE, mintDesk_);
            emit MintDeskSet(mintDesk_);
        }
    }

    function maxSupply() external view returns (uint256) {
        return MAX_SUPPLY;
    }

    function setMintDesk(address desk) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (desk == address(0)) revert ZeroAddress();
        mintDesk = desk;
        _grantRole(MINTER_ROLE, desk);
        emit MintDeskSet(desk);
    }

    function mintFromDesk(address to, uint256 tokenId) external whenNotPaused {
        if (msg.sender != mintDesk) revert NotDesk();
        _mintLimited(to, tokenId);
    }

    function mint(address to, uint256 tokenId) external onlyRole(MINTER_ROLE) whenNotPaused {
        _mintLimited(to, tokenId);
    }

    function freezeMetadata(string calldata uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (metadataFrozen) revert Frozen();
        metadataFrozen = true;
        _baseTokenURI = uri;
        emit MetadataFrozen(uri);
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
        override(ERC721, ERC2981, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _mintLimited(address to, uint256 tokenId) internal {
        if (totalMinted >= MAX_SUPPLY) revert SoldOut();
        if (_ownerOf(tokenId) != address(0)) revert TokenTaken();
        _safeMint(to, tokenId);
        totalMinted++;
    }
}

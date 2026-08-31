// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Aura Hood / Genesis Passport — ERC-721 founding-circle utility.
 * Max 1,000. Supply cannot be raised. Metadata freezes one-way.
 * After the launch desk is set, every mint must be USDC-funded on-chain
 * (70% trapped in AuraLaunchEscrow, 30% to immutable ops).
 *
 * Not an investment product. Not the AURA token.
 */
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import {IAuraLaunchDesk} from "../launch/IAuraLaunch.sol";

contract GenesisPassport is ERC721, AccessControl, Pausable, EIP712 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MINT_VOUCHER_TYPEHASH =
        keccak256("MintVoucher(address to,uint256 tokenId,uint256 nonce,uint256 deadline)");

    uint256 public constant MAX_SUPPLY = 1000;
    uint256 public totalMinted;
    string private _baseTokenURI;
    bool public metadataFrozen;
    address public launchDesk;
    mapping(uint256 => bool) public usedNonces;

    error SoldOut();
    error BadDeadline();
    error NonceUsed();
    error BadSigner();
    error TokenTaken();
    error Frozen();
    error AlreadySet();
    error ZeroAddress();
    error NotFunded();
    error NotDesk();
    error BadToken();

    event LaunchDeskSet(address indexed desk);
    event MetadataFrozen(string uri);

    constructor(
        address admin,
        address launchDesk_,
        string memory baseURI_
    ) ERC721("Aura Genesis Passport", "AURAGEN") EIP712("AuraGenesisPassport", "1") {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        launchDesk = launchDesk_;
        _baseTokenURI = baseURI_;
        if (launchDesk_ != address(0)) emit LaunchDeskSet(launchDesk_);
    }

    function maxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }

    function setLaunchDesk(address desk) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (launchDesk != address(0)) revert AlreadySet();
        if (desk == address(0)) revert ZeroAddress();
        launchDesk = desk;
        emit LaunchDeskSet(desk);
    }

    function mintFromDesk(address to, uint256 tokenId) external whenNotPaused {
        if (msg.sender != launchDesk) revert NotDesk();
        _mintLimited(to, tokenId);
    }

    function mint(address to, uint256 tokenId) external onlyRole(MINTER_ROLE) whenNotPaused {
        _requireFunded(tokenId);
        _mintLimited(to, tokenId);
    }

    function mintWithVoucher(
        address to,
        uint256 tokenId,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused {
        if (block.timestamp > deadline) revert BadDeadline();
        if (usedNonces[nonce]) revert NonceUsed();

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(MINT_VOUCHER_TYPEHASH, to, tokenId, nonce, deadline))
        );
        address signer = ECDSA.recover(digest, signature);
        if (!hasRole(MINTER_ROLE, signer)) revert BadSigner();

        usedNonces[nonce] = true;
        _requireFunded(tokenId);
        _mintLimited(to, tokenId);
    }

    function freezeMetadata() external onlyRole(DEFAULT_ADMIN_ROLE) {
        metadataFrozen = true;
        emit MetadataFrozen(_baseTokenURI);
    }

    function setBaseURI(string calldata uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (metadataFrozen) revert Frozen();
        _baseTokenURI = uri;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function _requireFunded(uint256 tokenId) internal view {
        if (launchDesk == address(0)) return;
        if (!IAuraLaunchDesk(launchDesk).hoodFunded(tokenId)) revert NotFunded();
    }

    function _mintLimited(address to, uint256 tokenId) internal {
        if (tokenId < 1 || tokenId > MAX_SUPPLY) revert BadToken();
        if (totalMinted >= MAX_SUPPLY) revert SoldOut();
        if (_ownerOf(tokenId) != address(0)) revert TokenTaken();
        totalMinted += 1;
        _safeMint(to, tokenId);
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

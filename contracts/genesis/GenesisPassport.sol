// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Aura Genesis Passport — ERC-721 utility membership for founding companies.
 * Not an investment product. Mint is server-gated (MINTER_ROLE or EIP-712 voucher).
 *
 * Deploy on Base Sepolia first; mainnet only after review.
 */

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract GenesisPassport is ERC721, AccessControl, Pausable, EIP712 {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant MINT_VOUCHER_TYPEHASH =
        keccak256("MintVoucher(address to,uint256 tokenId,uint256 nonce,uint256 deadline)");

    uint256 public maxSupply;
    uint256 public totalMinted;
    string private _baseTokenURI;
    mapping(uint256 => bool) public usedNonces;

    error SoldOut();
    error BadDeadline();
    error NonceUsed();
    error BadSigner();
    error TokenTaken();

    constructor(
        address admin,
        uint256 maxSupply_,
        string memory baseURI_
    ) ERC721("Aura Genesis Passport", "AURAGEN") EIP712("AuraGenesisPassport", "1") {
        require(admin != address(0), "admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        maxSupply = maxSupply_;
        _baseTokenURI = baseURI_;
    }

    function mint(address to, uint256 tokenId) external onlyRole(MINTER_ROLE) whenNotPaused {
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
        _mintLimited(to, tokenId);
    }

    function _mintLimited(address to, uint256 tokenId) internal {
        if (totalMinted >= maxSupply) revert SoldOut();
        if (_ownerOf(tokenId) != address(0)) revert TokenTaken();
        totalMinted += 1;
        _safeMint(to, tokenId);
    }

    function setBaseURI(string calldata uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = uri;
    }

    function setMaxSupply(uint256 maxSupply_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(maxSupply_ >= totalMinted, "below minted");
        maxSupply = maxSupply_;
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

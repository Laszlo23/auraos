// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Aura Square — Base utility binder NFT. Cap 1,111 (not Hood's 1,000).
 * Each mint creates an ERC-6551 token-bound account that can hold AURA / USDC.
 * Not founding seats. Not on pAURA rails. No auto-airdrop of AURA.
 */
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

interface IERC20Usdc {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

interface IERC6551Registry {
    function createAccount(
        address implementation,
        bytes32 salt,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId
    ) external returns (address);
}

contract AuraSquare is ERC721, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    uint256 public constant MAX_SUPPLY = 1111;
    uint256 public totalMinted;
    uint256 public mintPriceUsdc;
    address public immutable usdc;
    address public immutable ops;
    address public immutable registry;
    address public immutable tbaImplementation;
    bytes32 public immutable tbaSalt;
    string private _baseTokenURI;

    error SoldOut();
    error ZeroAddress();
    error BadPayment();

    event SquareMinted(address indexed to, uint256 indexed tokenId, address tba);

    constructor(
        address admin,
        address usdc_,
        address ops_,
        address registry_,
        address tbaImplementation_,
        uint256 mintPriceUsdc_,
        string memory baseURI_
    ) ERC721("Aura Square", "AURASQ") {
        if (
            admin == address(0) ||
            usdc_ == address(0) ||
            ops_ == address(0) ||
            registry_ == address(0) ||
            tbaImplementation_ == address(0)
        ) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
        usdc = usdc_;
        ops = ops_;
        registry = registry_;
        tbaImplementation = tbaImplementation_;
        tbaSalt = bytes32(0);
        mintPriceUsdc = mintPriceUsdc_;
        _baseTokenURI = baseURI_;
    }

    function maxSupply() external pure returns (uint256) {
        return MAX_SUPPLY;
    }

    function mint() external returns (uint256 tokenId) {
        if (mintPriceUsdc == 0) revert BadPayment();
        bool ok = IERC20Usdc(usdc).transferFrom(msg.sender, ops, mintPriceUsdc);
        if (!ok) revert BadPayment();
        tokenId = _mintNext(msg.sender);
    }

    function mintTo(address to) external onlyRole(MINTER_ROLE) returns (uint256 tokenId) {
        tokenId = _mintNext(to);
    }

    function setBaseURI(string calldata uri) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _baseTokenURI = uri;
    }

    function setMintPriceUsdc(uint256 price) external onlyRole(DEFAULT_ADMIN_ROLE) {
        mintPriceUsdc = price;
    }

    function _mintNext(address to) internal returns (uint256 tokenId) {
        if (totalMinted >= MAX_SUPPLY) revert SoldOut();
        tokenId = ++totalMinted;
        _safeMint(to, tokenId);
        address tba = IERC6551Registry(registry).createAccount(
            tbaImplementation,
            tbaSalt,
            block.chainid,
            address(this),
            tokenId
        );
        emit SquareMinted(to, tokenId, tba);
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Locked AURA gifts for each Hood. No clawback. No owner withdraw.
 * 7,777 AURA per Hood, claimable 90 days after T-0. Buy-pressure bonuses vest the same.
 */
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {IAuraHood, IAuraHoodGiftLock} from "./IAuraLaunch.sol";

contract AuraHoodGiftLock is IAuraHoodGiftLock, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IAuraHood public immutable HOOD;
    uint256 public constant GIFT_PER_HOOD = 7_777 ether;
    uint256 public constant LOCK_DAYS = 90;

    address public desk;
    IERC20 public aura;
    uint64 public t0;

    mapping(uint256 => bool) public allocated;
    mapping(uint256 => bool) public claimed;
    mapping(uint256 => uint256) public bonusPaid;
    uint256 public allocatedCount;
    uint256 public accBonusPerHood;

    error ZeroAddress();
    error AlreadySet();
    error NotDesk();
    error Taken();
    error NotAllocated();
    error AlreadyClaimed();
    error StillLocked();
    error NotHoodOwner();
    error Unbound();

    event DeskSet(address indexed desk);
    event AuraBound(address indexed token, uint64 t0);
    event Allocated(uint256 indexed tokenId, address indexed desk);
    event BuyNotified(uint256 auraAmount, uint256 accBonusPerHood);
    event Claimed(uint256 indexed tokenId, address indexed to, uint256 amount);

    constructor(address hood_) {
        if (hood_ == address(0)) revert ZeroAddress();
        HOOD = IAuraHood(hood_);
    }

    function setDesk(address desk_) external {
        if (desk != address(0)) revert AlreadySet();
        if (desk_ == address(0)) revert ZeroAddress();
        desk = desk_;
        emit DeskSet(desk_);
    }

    function allocate(uint256 tokenId) external {
        if (msg.sender != desk) revert NotDesk();
        if (allocated[tokenId]) revert Taken();
        allocated[tokenId] = true;
        bonusPaid[tokenId] = accBonusPerHood;
        allocatedCount += 1;
        emit Allocated(tokenId, msg.sender);
    }

    function bindAura(address token) external {
        if (msg.sender != desk) revert NotDesk();
        if (address(aura) != address(0)) revert AlreadySet();
        if (token == address(0)) revert ZeroAddress();
        aura = IERC20(token);
        t0 = uint64(block.timestamp);
        emit AuraBound(token, t0);
    }

    function notifyBuy(uint256 auraAmount) external {
        if (msg.sender != desk) revert NotDesk();
        if (auraAmount == 0 || allocatedCount == 0) return;
        accBonusPerHood += auraAmount / allocatedCount;
        emit BuyNotified(auraAmount, accBonusPerHood);
    }

    function unlocksAt() public view returns (uint64) {
        if (t0 == 0) return 0;
        return t0 + uint64(LOCK_DAYS * 1 days);
    }

    function pending(uint256 tokenId) public view returns (uint256) {
        if (!allocated[tokenId] || claimed[tokenId]) return 0;
        return GIFT_PER_HOOD + (accBonusPerHood - bonusPaid[tokenId]);
    }

    function claim(uint256 tokenId) external nonReentrant {
        if (!allocated[tokenId]) revert NotAllocated();
        if (claimed[tokenId]) revert AlreadyClaimed();
        if (address(aura) == address(0) || t0 == 0) revert Unbound();
        if (block.timestamp < unlocksAt()) revert StillLocked();
        if (HOOD.ownerOf(tokenId) != msg.sender) revert NotHoodOwner();

        claimed[tokenId] = true;
        uint256 amount = GIFT_PER_HOOD + (accBonusPerHood - bonusPaid[tokenId]);
        aura.safeTransfer(msg.sender, amount);
        emit Claimed(tokenId, msg.sender, amount);
    }
}

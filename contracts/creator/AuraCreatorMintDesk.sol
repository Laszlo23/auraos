// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Primary sale desk for creator collections on Robinhood Chain.
 * Accepts USDG or native ETH; splits creator payout + platform fee.
 */
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {CreatorMintAsset, ICreatorCollection} from "./ICreator.sol";

contract AuraCreatorMintDesk is ReentrancyGuard {
    using SafeERC20 for IERC20;

    ICreatorCollection public immutable COLLECTION;
    IERC20 public immutable STABLE;
    address public immutable CREATOR;
    address public immutable PLATFORM;
    uint256 public immutable PRICE;
    CreatorMintAsset public immutable ASSET;
    uint256 public immutable PLATFORM_BPS;

    error ZeroAddress();
    error WrongPayment();
    error SoldOut();

    event MintPaid(
        address indexed payer,
        address indexed to,
        uint256 indexed tokenId,
        uint256 creatorAmount,
        uint256 platformAmount
    );

    constructor(
        address collection_,
        address stable_,
        address creator_,
        address platform_,
        uint256 price_,
        CreatorMintAsset asset_,
        uint256 platformBps_
    ) {
        if (collection_ == address(0) || creator_ == address(0) || platform_ == address(0)) {
            revert ZeroAddress();
        }
        COLLECTION = ICreatorCollection(collection_);
        STABLE = IERC20(stable_);
        CREATOR = creator_;
        PLATFORM = platform_;
        PRICE = price_;
        ASSET = asset_;
        PLATFORM_BPS = platformBps_;
    }

    function nextTokenId() public view returns (uint256) {
        return COLLECTION.totalMinted() + 1;
    }

    function mintPaid(address to) external payable nonReentrant returns (uint256 tokenId) {
        if (COLLECTION.totalMinted() >= COLLECTION.maxSupply()) revert SoldOut();
        tokenId = nextTokenId();
        uint256 platformAmount = (PRICE * PLATFORM_BPS) / 10_000;
        uint256 creatorAmount = PRICE - platformAmount;

        if (ASSET == CreatorMintAsset.ETH) {
            if (msg.value != PRICE) revert WrongPayment();
            (bool okCreator,) = CREATOR.call{value: creatorAmount}("");
            require(okCreator, "creator transfer failed");
            (bool okPlatform,) = PLATFORM.call{value: platformAmount}("");
            require(okPlatform, "platform transfer failed");
        } else {
            STABLE.safeTransferFrom(msg.sender, address(this), PRICE);
            STABLE.safeTransfer(CREATOR, creatorAmount);
            STABLE.safeTransfer(PLATFORM, platformAmount);
        }

        COLLECTION.mintFromDesk(to, tokenId);
        emit MintPaid(msg.sender, to, tokenId, creatorAmount, platformAmount);
    }
}

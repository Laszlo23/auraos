// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * AURA Private Sale receipt token (pAURA).
 * Not the launched AURA. At T-0, 1 pAURA converts to 1.11 AURA via AuraPauraRedeem.
 * USDC on Base is forwarded 100% to the immutable treasury. Cash credits are owner-only.
 */

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AuraPrivateSale is ERC20, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable USDC;
    address public immutable TREASURY;

    uint256 public constant AURA_SUPPLY = 777_777_777;
    uint256 public constant FDV_USDC = 1_000_000;
    uint256 public constant SALE_CAP = 231_231_200 ether;
    uint256 public constant MIN_USDC = 50e6;
    uint256 public constant LAUNCH_BONUS_BPS = 1100;

    uint256 public usdcRaised;
    bool public saleClosed;

    error ZeroAddress();
    error SaleIsClosed();
    error BelowMinimum();
    error CapExceeded();
    error ZeroAmount();

    constructor(address usdc_, address treasury_, address owner_)
        ERC20("AURA Private Sale", "pAURA")
        Ownable(owner_)
    {
        if (usdc_ == address(0) || treasury_ == address(0) || owner_ == address(0)) {
            revert ZeroAddress();
        }
        USDC = IERC20(usdc_);
        TREASURY = treasury_;
    }

    function remaining() public view returns (uint256) {
        return SALE_CAP - totalSupply();
    }

    function previewBuy(uint256 usdcAmount) public pure returns (uint256) {
        return usdcAmount * AURA_SUPPLY * 1e6;
    }

    function launchClaimAmount(uint256 pAuraAmount) public pure returns (uint256) {
        return (pAuraAmount * (10_000 + LAUNCH_BONUS_BPS)) / 10_000;
    }

    function buy(uint256 usdcAmount) external {
        buyFor(msg.sender, usdcAmount);
    }

    function buyFor(address recipient, uint256 usdcAmount)
        public
        whenNotPaused
        nonReentrant
    {
        if (saleClosed) revert SaleIsClosed();
        if (recipient == address(0)) revert ZeroAddress();
        if (usdcAmount < MIN_USDC) revert BelowMinimum();
        uint256 pAura = previewBuy(usdcAmount);
        if (pAura == 0) revert ZeroAmount();
        if (totalSupply() + pAura > SALE_CAP) revert CapExceeded();

        USDC.safeTransferFrom(msg.sender, TREASURY, usdcAmount);
        usdcRaised += usdcAmount;
        _mint(recipient, pAura);
    }

    function creditCash(address to, uint256 pAuraAmount) external onlyOwner whenNotPaused {
        if (to == address(0)) revert ZeroAddress();
        if (pAuraAmount == 0) revert ZeroAmount();
        if (totalSupply() + pAuraAmount > SALE_CAP) revert CapExceeded();
        _mint(to, pAuraAmount);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function closeSale() external onlyOwner {
        saleClosed = true;
    }

    receive() external payable {
        revert();
    }
}

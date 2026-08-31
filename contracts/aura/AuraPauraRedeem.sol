// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Redeem pAURA for AURA at T-0: 1 pAURA → 1.11 AURA (same math as AuraPrivateSale.launchClaimAmount).
 * Prefund this contract with the private-sale AURA reserve (open + project slices).
 * pAURA has no burn — redeemed receipts are sent to the dead address.
 */
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract AuraPauraRedeem is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable PAURA;
    IERC20 public immutable AURA;
    address public constant DEAD = 0x000000000000000000000000000000000000dEaD;

    uint256 public constant LAUNCH_BONUS_BPS = 1100;
    bool public open;

    error ZeroAddress();
    error ZeroAmount();
    error NotOpen();
    error AlreadyOpen();
    error InsufficientAura();
    error RedeemOpen();

    event RedeemOpened();
    event Redeemed(address indexed account, uint256 pAuraIn, uint256 auraOut);

    constructor(address paura_, address aura_, address owner_) Ownable(owner_) {
        if (paura_ == address(0) || aura_ == address(0) || owner_ == address(0)) {
            revert ZeroAddress();
        }
        PAURA = IERC20(paura_);
        AURA = IERC20(aura_);
    }

    function launchClaimAmount(uint256 pAuraAmount) public pure returns (uint256) {
        return (pAuraAmount * (10_000 + LAUNCH_BONUS_BPS)) / 10_000;
    }

    function openRedeem() external onlyOwner {
        if (open) revert AlreadyOpen();
        open = true;
        emit RedeemOpened();
    }

    function redeem(uint256 pAuraAmount) external nonReentrant {
        if (!open) revert NotOpen();
        if (pAuraAmount == 0) revert ZeroAmount();
        uint256 auraOut = launchClaimAmount(pAuraAmount);
        if (AURA.balanceOf(address(this)) < auraOut) revert InsufficientAura();

        PAURA.safeTransferFrom(msg.sender, DEAD, pAuraAmount);
        AURA.safeTransfer(msg.sender, auraOut);
        emit Redeemed(msg.sender, pAuraAmount, auraOut);
    }

    /// @dev Rescue mistaken tokens. AURA cannot be pulled while redeem is open.
    function rescueToken(address token, address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        if (token == address(AURA) && open) revert RedeemOpen();
        IERC20(token).safeTransfer(to, amount);
    }

    receive() external payable {
        revert();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * SKETCH ONLY — DO NOT DEPLOY.
 *
 * Base lockbox for Phase 4 RH wrapper (docs/AURA_RH_WRAPPER.md).
 * Locks canonical AURA on Base so a Robinhood-chain wrapper can mint 1:1.
 *
 * Not in the T-0 compile path. Not an official AURA CA.
 * Minter / relayer trust model is Option A (published multisig) until a
 * canonical Base↔RH messenger exists.
 */

interface IERC20Aura {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract AuraRhLockbox {
    /// @dev Official Base AURA — set once in constructor. Immutable.
    IERC20Aura public immutable aura;

    /// @dev Published multisig / relayer that may authorize unlocks after RH burn.
    address public unlocker;

    /// @dev Optional second key (timelock / guardian). Can be same as unlocker in v0.
    address public guardian;

    uint256 public totalLocked;

    mapping(address => uint256) public lockedOf;

    event Locked(address indexed from, uint256 amount, bytes32 indexed depositId, bytes metadata);
    event UnlockerUpdated(address indexed previous, address indexed next);
    event GuardianUpdated(address indexed previous, address indexed next);
    event Unlocked(address indexed to, uint256 amount, bytes32 indexed withdrawalId);

    error ZeroAddress();
    error ZeroAmount();
    error NotUnlocker();
    error NotGuardian();
    error InsufficientLock();

    modifier onlyUnlocker() {
        if (msg.sender != unlocker) revert NotUnlocker();
        _;
    }

    modifier onlyGuardian() {
        if (msg.sender != guardian) revert NotGuardian();
        _;
    }

    constructor(address auraToken, address initialUnlocker, address initialGuardian) {
        if (auraToken == address(0) || initialUnlocker == address(0) || initialGuardian == address(0)) {
            revert ZeroAddress();
        }
        aura = IERC20Aura(auraToken);
        unlocker = initialUnlocker;
        guardian = initialGuardian;
    }

    /**
     * Lock Base AURA. `depositId` should be unique per wrap intent (client-generated).
     * Relayer watches `Locked` and mints wAURA on RH.
     */
    function lock(uint256 amount, bytes32 depositId, bytes calldata metadata) external {
        if (amount == 0) revert ZeroAmount();
        bool ok = aura.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert();
        lockedOf[msg.sender] += amount;
        totalLocked += amount;
        emit Locked(msg.sender, amount, depositId, metadata);
    }

    /**
     * Release Base AURA after wAURA is burned on RH (attested by unlocker).
     * v0: unlocker is a multisig. v1: replace with messenger callback.
     */
    function unlock(address to, uint256 amount, bytes32 withdrawalId) external onlyUnlocker {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        if (amount > totalLocked) revert InsufficientLock();
        // Accounting: v0 treats lockbox as pooled backing (not per-user escrow).
        totalLocked -= amount;
        bool ok = aura.transfer(to, amount);
        if (!ok) revert();
        emit Unlocked(to, amount, withdrawalId);
    }

    function setUnlocker(address next) external onlyGuardian {
        if (next == address(0)) revert ZeroAddress();
        emit UnlockerUpdated(unlocker, next);
        unlocker = next;
    }

    function setGuardian(address next) external onlyGuardian {
        if (next == address(0)) revert ZeroAddress();
        emit GuardianUpdated(guardian, next);
        guardian = next;
    }

    /// @dev No ETH. No arbitrary rescue of AURA except via unlock().
    receive() external payable {
        revert();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * SKETCH ONLY — DO NOT DEPLOY.
 *
 * Robinhood Chain (4663) ERC-20 wrapper for Base AURA.
 * Label in all product copy: "wAURA — RH wrapper, not official CA".
 *
 * Official AURA CA remains on Base. This contract must never be set as
 * AURA_TOKEN_CA / VITE_AURA_TOKEN_CA.
 *
 * See docs/AURA_RH_WRAPPER.md.
 */

contract AuraRhWrapper {
    string public constant name = "Wrapped AURA (Robinhood)";
    string public constant symbol = "wAURA";
    uint8 public constant decimals = 18;

    /// @dev Human-readable pointer — not verified on-chain against Base.
    string public constant OFFICIAL_BASE_NOTE =
        "Official AURA is on Base. This token is a 1:1 wrapper only.";

    address public minter;
    address public guardian;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Minted(address indexed to, uint256 amount, bytes32 indexed depositId);
    event Burned(address indexed from, uint256 amount, bytes32 indexed withdrawalId);
    event MinterUpdated(address indexed previous, address indexed next);
    event GuardianUpdated(address indexed previous, address indexed next);

    error ZeroAddress();
    error ZeroAmount();
    error NotMinter();
    error NotGuardian();
    error InsufficientBalance();
    error InsufficientAllowance();

    modifier onlyMinter() {
        if (msg.sender != minter) revert NotMinter();
        _;
    }

    modifier onlyGuardian() {
        if (msg.sender != guardian) revert NotGuardian();
        _;
    }

    constructor(address initialMinter, address initialGuardian) {
        if (initialMinter == address(0) || initialGuardian == address(0)) revert ZeroAddress();
        minter = initialMinter;
        guardian = initialGuardian;
    }

    /// @dev Called by published relayer / multisig after Base lockbox `Locked` event.
    function mint(address to, uint256 amount, bytes32 depositId) external onlyMinter {
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0) revert ZeroAmount();
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
        emit Minted(to, amount, depositId);
    }

    /**
     * Burn wAURA to request Base unlock. Relayer watches `Burned` and calls
     * AuraRhLockbox.unlock on Base.
     */
    function burn(uint256 amount, bytes32 withdrawalId) external {
        if (amount == 0) revert ZeroAmount();
        uint256 bal = balanceOf[msg.sender];
        if (bal < amount) revert InsufficientBalance();
        balanceOf[msg.sender] = bal - amount;
        totalSupply -= amount;
        emit Transfer(msg.sender, address(0), amount);
        emit Burned(msg.sender, amount, withdrawalId);
    }

    function approve(address spender, uint256 value) external returns (bool) {
        if (spender == address(0)) revert ZeroAddress();
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed < value) revert InsufficientAllowance();
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - value;
        }
        _transfer(from, to, value);
        return true;
    }

    function setMinter(address next) external onlyGuardian {
        if (next == address(0)) revert ZeroAddress();
        emit MinterUpdated(minter, next);
        minter = next;
    }

    function setGuardian(address next) external onlyGuardian {
        if (next == address(0)) revert ZeroAddress();
        emit GuardianUpdated(guardian, next);
        guardian = next;
    }

    function _transfer(address from, address to, uint256 value) internal {
        if (to == address(0)) revert ZeroAddress();
        uint256 bal = balanceOf[from];
        if (bal < value) revert InsufficientBalance();
        balanceOf[from] = bal - value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}

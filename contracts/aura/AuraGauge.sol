// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Stake AURA (or later an LP NFT operator) to earn a share of published pool fees.
 * No promised APY. Rewards are whatever the fee split actually forwards here.
 */
interface IERC20Gauge {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function transfer(address to, uint256 value) external returns (bool);
}

contract AuraGauge {
    IERC20Gauge public immutable aura;
    address public immutable rewardSource;

    mapping(address => uint256) public staked;
    uint256 public totalStaked;

    event Staked(address indexed account, uint256 amount);
    event Unstaked(address indexed account, uint256 amount);
    event Claimed(address indexed account, uint256 amount);

    constructor(address auraToken, address rewards) {
        if (auraToken == address(0) || rewards == address(0)) revert();
        aura = IERC20Gauge(auraToken);
        rewardSource = rewards;
    }

    function stake(uint256 amount) external {
        if (amount == 0) revert();
        bool ok = aura.transferFrom(msg.sender, address(this), amount);
        if (!ok) revert();
        staked[msg.sender] += amount;
        totalStaked += amount;
        emit Staked(msg.sender, amount);
    }

    function unstake(uint256 amount) external {
        if (amount == 0 || staked[msg.sender] < amount) revert();
        staked[msg.sender] -= amount;
        totalStaked -= amount;
        bool ok = aura.transfer(msg.sender, amount);
        if (!ok) revert();
        emit Unstaked(msg.sender, amount);
    }

    /// @dev Pulls AURA the fee-split already sent to this contract (minus still-staked principal).
    function claim() external {
        uint256 bal = _balance();
        uint256 principal = totalStaked;
        if (bal <= principal) revert();
        uint256 pot = bal - principal;
        uint256 mine = (pot * staked[msg.sender]) / principal;
        if (mine == 0) revert();
        bool ok = aura.transfer(msg.sender, mine);
        if (!ok) revert();
        emit Claimed(msg.sender, mine);
    }

    function _balance() internal view returns (uint256) {
        (bool ok, bytes memory data) = address(aura).staticcall(
            abi.encodeWithSignature("balanceOf(address)", address(this))
        );
        if (!ok || data.length < 32) revert();
        return abi.decode(data, (uint256));
    }

    receive() external payable {
        revert();
    }
}

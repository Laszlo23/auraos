// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Dead-end for AURA (and any ERC-20) taken as swap-burn / fee-split burn.
 * No withdraw, no owner, no rescue. Prefer this over a silent EOA.
 */
interface IERC20BurnLike {
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}

contract AuraBurnSink {
    event Burned(address indexed token, address indexed from, uint256 amount);

    function sink(address token, uint256 amount) external {
        if (amount == 0) revert();
        bool ok = IERC20BurnLike(token).transferFrom(msg.sender, address(this), amount);
        if (!ok) revert();
        emit Burned(token, msg.sender, amount);
    }

    receive() external payable {
        revert();
    }
}

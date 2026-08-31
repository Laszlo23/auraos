// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Platform AURA — fixed supply, no owner mint, no tax, no pause.
 * Deploy from a fresh empty wallet at T-0. Distribute via script, then never mint again.
 */
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AuraToken is ERC20 {
    /// @dev Whole tokens: 777,777,777 with 18 decimals.
    uint256 public constant MAX_SUPPLY = 777_777_777 ether;

    constructor() ERC20("AURA Token", "AURA") {
        _mint(msg.sender, MAX_SUPPLY);
    }
}

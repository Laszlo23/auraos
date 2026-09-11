// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Platform AURA — the official DexScreener token.
 * Fixed supply, no owner, no extra mint, no tax, no pause, no blacklist, no proxy.
 * Buy/sell fees live on the Uni v4 pool, not on transfers (GoPlus 0% token tax).
 * Deploy this bytecode first at T-0. Never use ClankerTokenV4 as official AURA.
 * Deploy from a fresh empty wallet. Distribute via script, then never mint again.
 */
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract AuraToken is ERC20 {
    /// @dev Whole tokens: 777,777,777 with 18 decimals.
    uint256 public constant MAX_SUPPLY = 777_777_777 ether;

    constructor() ERC20("AURA Token", "AURA") {
        _mint(msg.sender, MAX_SUPPLY);
    }
}

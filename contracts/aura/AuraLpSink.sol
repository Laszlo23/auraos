// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Permanent LP sink. Send Uni v2 LP tokens here — there is no withdraw, no owner, no rescue.
 * Prefer this over a bare EOA so explorers show a verified "locked forever" contract.
 */
contract AuraLpSink {
    receive() external payable {
        revert();
    }
}

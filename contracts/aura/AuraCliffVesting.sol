// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Concrete cliff vesting for team / advisors.
 * startTimestamp = T-0; cliffSeconds = 12 months; durationSeconds = 12mo cliff + 36mo linear
 * (cliff is inside duration per OZ VestingWalletCliff).
 */
import {VestingWallet} from "@openzeppelin/contracts/finance/VestingWallet.sol";
import {VestingWalletCliff} from "@openzeppelin/contracts/finance/VestingWalletCliff.sol";

contract AuraCliffVesting is VestingWalletCliff {
    constructor(
        address beneficiary,
        uint64 startTimestamp,
        uint64 durationSeconds,
        uint64 cliffSeconds
    ) VestingWallet(beneficiary, startTimestamp, durationSeconds) VestingWalletCliff(cliffSeconds) {}
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Shared launch interfaces. Hood USDC and Hood gifts never sit in a team wallet.
 */
interface IAuraLaunchDesk {
    function hoodFunded(uint256 tokenId) external view returns (bool);
}

interface IAuraHood {
    function mintFromDesk(address to, uint256 tokenId) external;
    function ownerOf(uint256 tokenId) external view returns (address);
    function totalMinted() external view returns (uint256);
    function MAX_SUPPLY() external view returns (uint256);
}

interface IAuraHoodGiftLock {
    function allocate(uint256 tokenId) external;
    function bindAura(address token) external;
    function notifyBuy(uint256 auraAmount) external;
}

interface IAuraMarketAdapter {
    /// Spend `usdcAmount` already sitting on the adapter. Send bought AURA to `giftLock`.
    function buyUsdcForAura(
        address usdc,
        address aura,
        uint256 usdcAmount,
        address giftLock
    ) external returns (uint256 auraOut);
}

interface IUniV2Pair {
    function token0() external view returns (address);
    function token1() external view returns (address);
    function factory() external view returns (address);
    function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast);
    function swap(uint256 amount0Out, uint256 amount1Out, address to, bytes calldata data) external;
}

interface IUniV2Factory {
    function getPair(address tokenA, address tokenB) external view returns (address);
}

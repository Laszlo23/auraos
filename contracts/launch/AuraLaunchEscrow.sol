// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Hood mint desk. 70% of each $299 USDC is trapped here until T-0.
 * Then it can only buy AURA on the committed fair-launch pair and lock those
 * tokens in AuraHoodGiftLock. No owner withdraw. No rescue of USDC.
 *
 * Gift mints still seed the book: the sponsor pays the $209.30 LP slice.
 */
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {
    IAuraHood,
    IAuraHoodGiftLock,
    IAuraMarketAdapter,
    IUniV2Factory,
    IUniV2Pair
} from "./IAuraLaunch.sol";

contract AuraLaunchEscrow is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant FUNDER_ROLE = keccak256("FUNDER_ROLE");
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE");

    IERC20 public immutable USDC;
    address public immutable OPS;
    IAuraHood public immutable HOOD;
    IAuraHoodGiftLock public immutable GIFTS;

    uint256 public constant PRICE_USDC = 299e6;
    uint256 public constant LP_BPS = 7_000;
    uint256 public constant OPS_BPS = 3_000;
    uint256 public constant TIMELOCK = 72 hours;

    mapping(uint256 => bool) public funded;

    enum MarketKind {
        Unset,
        UniV2,
        Adapter
    }

    address public proposedAura;
    address public proposedMarket;
    MarketKind public proposedKind;
    uint64 public proposeAt;

    address public aura;
    address public market;
    MarketKind public marketKind;
    bool public launched;

    error ZeroAddress();
    error Taken();
    error Unfunded();
    error AlreadyLaunched();
    error NotProposed();
    error Timelock();
    error BadPair();
    error EmptyBook();
    error AlreadyFunded();

    event HoodFunded(uint256 indexed tokenId, address indexed payer, address indexed to, bool gift, uint256 lpUsdc);
    event HoodMinted(uint256 indexed tokenId, address indexed to, bool gift);
    event MarketProposed(address indexed aura, address indexed market, MarketKind kind, uint64 executeAfter);
    event MarketExecuted(address indexed aura, address indexed market, MarketKind kind);
    event PoolBuy(uint256 usdcIn, uint256 auraOut);

    constructor(
        address usdc_,
        address ops_,
        address hood_,
        address gifts_,
        address guardian_
    ) {
        if (
            usdc_ == address(0) ||
            ops_ == address(0) ||
            hood_ == address(0) ||
            gifts_ == address(0) ||
            guardian_ == address(0)
        ) {
            revert ZeroAddress();
        }
        USDC = IERC20(usdc_);
        OPS = ops_;
        HOOD = IAuraHood(hood_);
        GIFTS = IAuraHoodGiftLock(gifts_);
        _grantRole(DEFAULT_ADMIN_ROLE, guardian_);
        _grantRole(GUARDIAN_ROLE, guardian_);
        _grantRole(FUNDER_ROLE, guardian_);
    }

    function hoodFunded(uint256 tokenId) external view returns (bool) {
        return funded[tokenId];
    }

    function lpSlice() public pure returns (uint256) {
        return (PRICE_USDC * LP_BPS) / 10_000;
    }

    function opsSlice() public pure returns (uint256) {
        return PRICE_USDC - lpSlice();
    }

    function bookUsdc() public view returns (uint256) {
        return USDC.balanceOf(address(this));
    }

    /// Public: pay $299 USDC, 70% trapped here, 30% to immutable ops, Hood + locked gift.
    function mintPaid(address to, uint256 tokenId) external nonReentrant {
        _collectPaid(msg.sender, tokenId);
        _mint(to, tokenId, false);
    }

    /// Sponsor a gift Hood. Only the LP slice ($209.30) — all of it stays in the book.
    function mintGift(address to, uint256 tokenId) external onlyRole(FUNDER_ROLE) nonReentrant {
        _collectGift(msg.sender, tokenId);
        _mint(to, tokenId, true);
    }

    /// Fiat / server path: deposit first, then the Hood contract mints.
    function fundPaid(uint256 tokenId) external onlyRole(FUNDER_ROLE) nonReentrant {
        _collectPaid(msg.sender, tokenId);
    }

    function fundGift(uint256 tokenId) external onlyRole(FUNDER_ROLE) nonReentrant {
        _collectGift(msg.sender, tokenId);
    }

    function proposeV2Market(address aura_, address pair_) external onlyRole(GUARDIAN_ROLE) {
        _propose(aura_, pair_, MarketKind.UniV2);
    }

    function proposeAdapter(address aura_, address adapter_) external onlyRole(GUARDIAN_ROLE) {
        _propose(aura_, adapter_, MarketKind.Adapter);
    }

    function executeMarket() external nonReentrant {
        if (launched) revert AlreadyLaunched();
        if (proposeAt == 0) revert NotProposed();
        if (block.timestamp < proposeAt + TIMELOCK) revert Timelock();
        if (proposedKind == MarketKind.UniV2) {
            _requireUsdcAuraPair(proposedMarket, proposedAura);
        } else if (proposedKind == MarketKind.Adapter) {
            if (proposedMarket.code.length == 0) revert BadPair();
        } else {
            revert NotProposed();
        }

        aura = proposedAura;
        market = proposedMarket;
        marketKind = proposedKind;
        launched = true;
        GIFTS.bindAura(proposedAura);
        emit MarketExecuted(aura, market, marketKind);
        if (USDC.balanceOf(address(this)) > 0) {
            _buyAndLock();
        }
    }

    /// Anyone can push leftover USDC into the same committed market after T-0
    /// (extra Hood mints that land after the first buy).
    function sweepBook() external nonReentrant {
        if (!launched) revert NotProposed();
        _buyAndLock();
    }

    function _propose(address aura_, address market_, MarketKind kind) internal {
        if (launched) revert AlreadyLaunched();
        if (aura_ == address(0) || market_ == address(0)) revert ZeroAddress();
        proposedAura = aura_;
        proposedMarket = market_;
        proposedKind = kind;
        proposeAt = uint64(block.timestamp);
        emit MarketProposed(aura_, market_, kind, proposeAt + uint64(TIMELOCK));
    }

    function _collectPaid(address payer, uint256 tokenId) internal {
        if (funded[tokenId]) revert AlreadyFunded();
        USDC.safeTransferFrom(payer, address(this), PRICE_USDC);
        USDC.safeTransfer(OPS, opsSlice());
        funded[tokenId] = true;
        GIFTS.allocate(tokenId);
        emit HoodFunded(tokenId, payer, address(0), false, lpSlice());
    }

    function _collectGift(address payer, uint256 tokenId) internal {
        if (funded[tokenId]) revert AlreadyFunded();
        uint256 lp = lpSlice();
        USDC.safeTransferFrom(payer, address(this), lp);
        funded[tokenId] = true;
        GIFTS.allocate(tokenId);
        emit HoodFunded(tokenId, payer, address(0), true, lp);
    }

    function _mint(address to, uint256 tokenId, bool gift) internal {
        if (to == address(0)) revert ZeroAddress();
        if (!funded[tokenId]) revert Unfunded();
        HOOD.mintFromDesk(to, tokenId);
        emit HoodMinted(tokenId, to, gift);
    }

    function _buyAndLock() internal {
        uint256 usdcIn = USDC.balanceOf(address(this));
        if (usdcIn == 0) revert EmptyBook();

        uint256 beforeBal = IERC20(aura).balanceOf(address(GIFTS));
        if (marketKind == MarketKind.UniV2) {
            _swapV2(usdcIn);
        } else {
            USDC.safeTransfer(market, usdcIn);
            IAuraMarketAdapter(market).buyUsdcForAura(address(USDC), aura, usdcIn, address(GIFTS));
        }
        uint256 auraOut = IERC20(aura).balanceOf(address(GIFTS)) - beforeBal;
        GIFTS.notifyBuy(auraOut);
        emit PoolBuy(usdcIn, auraOut);
    }

    function _swapV2(uint256 amountIn) internal {
        IUniV2Pair pair = IUniV2Pair(market);
        (uint112 r0, uint112 r1, ) = pair.getReserves();
        address token0 = pair.token0();
        bool usdcIs0 = token0 == address(USDC);
        uint256 reserveIn = usdcIs0 ? uint256(r0) : uint256(r1);
        uint256 reserveOut = usdcIs0 ? uint256(r1) : uint256(r0);
        uint256 amountOut = _getAmountOut(amountIn, reserveIn, reserveOut);
        USDC.safeTransfer(market, amountIn);
        if (usdcIs0) {
            pair.swap(0, amountOut, address(GIFTS), "");
        } else {
            pair.swap(amountOut, 0, address(GIFTS), "");
        }
    }

    function _requireUsdcAuraPair(address pair_, address aura_) internal view {
        if (pair_.code.length == 0) revert BadPair();
        IUniV2Pair pair = IUniV2Pair(pair_);
        address token0 = pair.token0();
        address token1 = pair.token1();
        bool matchUsdc =
            (token0 == address(USDC) && token1 == aura_) ||
            (token0 == aura_ && token1 == address(USDC));
        if (!matchUsdc) revert BadPair();
        address factory = pair.factory();
        if (IUniV2Factory(factory).getPair(address(USDC), aura_) != pair_) revert BadPair();
    }

    function _getAmountOut(
        uint256 amountIn,
        uint256 reserveIn,
        uint256 reserveOut
    ) internal pure returns (uint256) {
        if (amountIn == 0 || reserveIn == 0 || reserveOut == 0) revert BadPair();
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        return numerator / denominator;
    }

    receive() external payable {
        revert();
    }
}

/**
 * Official Uniswap v4 AURA/USDC book — encoding only.
 * Pool id / hook / CA come from published env. Never invent an AURA CA.
 */

import { encodeAbiParameters, encodePacked, keccak256, getAddress, type Address, type Hex } from "viem";

import { BASE_USDC } from "@/lib/private-sale";

/** Uniswap canonical Base deployments — not AURA. */
export const UNISWAP_V4_BASE = {
  poolManager: getAddress("0x498581ff718922c3f8e6A244956aF099B2652b2b"),
  universalRouter: getAddress("0x6ff5693b99212da76ad316178a184ab56d299b43"),
  quoter: getAddress("0x0d5e0F971ed27FBFf6c2837bf31316121532048D"),
  permit2: getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3"),
} as const;

/** Dynamic-fee flag used by Uni v4 / Clanker Dynamic3. */
export const UNI_V4_DYNAMIC_FEE = 0x800000;
export const UNI_V4_DEFAULT_TICK_SPACING = 200;

export const UNI_V4_ACTIONS = {
  SWAP_EXACT_IN_SINGLE: 0x06,
  SETTLE: 0x0b,
  SETTLE_ALL: 0x0c,
  TAKE: 0x0e,
  TAKE_ALL: 0x0f,
} as const;

export const UNI_V4_COMMAND_V4_SWAP = 0x10;

export type AuraV4PoolKey = {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
};

export function sortAuraUsdcPair(
  aura: Address,
  usdc: Address = BASE_USDC,
): { currency0: Address; currency1: Address; zeroForOneUsdcIn: boolean } {
  const a = aura.toLowerCase();
  const u = usdc.toLowerCase();
  if (u < a) {
    return { currency0: usdc, currency1: aura, zeroForOneUsdcIn: true };
  }
  return { currency0: aura, currency1: usdc, zeroForOneUsdcIn: false };
}

export function auraV4PoolKey(input: {
  aura: Address;
  hooks: Address;
  fee?: number;
  tickSpacing?: number;
  usdc?: Address;
}): AuraV4PoolKey {
  const pair = sortAuraUsdcPair(input.aura, input.usdc ?? BASE_USDC);
  return {
    currency0: pair.currency0,
    currency1: pair.currency1,
    fee: input.fee ?? UNI_V4_DYNAMIC_FEE,
    tickSpacing: input.tickSpacing ?? UNI_V4_DEFAULT_TICK_SPACING,
    hooks: input.hooks,
  };
}

export function auraV4PoolId(key: AuraV4PoolKey): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        {
          type: "tuple",
          components: [
            { name: "currency0", type: "address" },
            { name: "currency1", type: "address" },
            { name: "fee", type: "uint24" },
            { name: "tickSpacing", type: "int24" },
            { name: "hooks", type: "address" },
          ],
        },
      ],
      [
        {
          currency0: key.currency0,
          currency1: key.currency1,
          fee: key.fee,
          tickSpacing: key.tickSpacing,
          hooks: key.hooks,
        },
      ],
    ),
  );
}

export function assertPublishedPoolId(key: AuraV4PoolKey, published: string): Hex {
  const computed = auraV4PoolId(key);
  if (computed.toLowerCase() !== published.toLowerCase()) {
    throw new Error("Published AURA_POOL_USDC does not match the configured v4 pool key.");
  }
  return computed;
}

export function encodeV4ExactInSingleInput(input: {
  key: AuraV4PoolKey;
  zeroForOne: boolean;
  amountIn: bigint;
  amountOutMinimum: bigint;
  hookData?: Hex;
}): Hex {
  const actions = encodePacked(
    ["uint8", "uint8", "uint8"],
    [UNI_V4_ACTIONS.SWAP_EXACT_IN_SINGLE, UNI_V4_ACTIONS.SETTLE_ALL, UNI_V4_ACTIONS.TAKE_ALL],
  );
  const swapParams = encodeAbiParameters(
    [
      {
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
          { name: "zeroForOne", type: "bool" },
          { name: "amountIn", type: "uint128" },
          { name: "amountOutMinimum", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    [
      {
        poolKey: {
          currency0: input.key.currency0,
          currency1: input.key.currency1,
          fee: input.key.fee,
          tickSpacing: input.key.tickSpacing,
          hooks: input.key.hooks,
        },
        zeroForOne: input.zeroForOne,
        amountIn: input.amountIn,
        amountOutMinimum: input.amountOutMinimum,
        hookData: input.hookData ?? "0x",
      },
    ],
  );
  const currencyIn = input.zeroForOne ? input.key.currency0 : input.key.currency1;
  const currencyOut = input.zeroForOne ? input.key.currency1 : input.key.currency0;
  const settle = encodeAbiParameters(
    [{ type: "address" }, { type: "uint128" }],
    [currencyIn, input.amountIn],
  );
  const take = encodeAbiParameters(
    [{ type: "address" }, { type: "uint128" }],
    [currencyOut, input.amountOutMinimum],
  );
  return encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actions, [swapParams, settle, take]],
  );
}

export const UNIVERSAL_ROUTER_ABI = [
  {
    type: "function",
    name: "execute",
    stateMutability: "payable",
    inputs: [
      { name: "commands", type: "bytes" },
      { name: "inputs", type: "bytes[]" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const V4_QUOTER_ABI = [
  {
    type: "function",
    name: "quoteExactInputSingle",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "params",
        type: "tuple",
        components: [
          {
            name: "poolKey",
            type: "tuple",
            components: [
              { name: "currency0", type: "address" },
              { name: "currency1", type: "address" },
              { name: "fee", type: "uint24" },
              { name: "tickSpacing", type: "int24" },
              { name: "hooks", type: "address" },
            ],
          },
          { name: "zeroForOne", type: "bool" },
          { name: "exactAmount", type: "uint128" },
          { name: "hookData", type: "bytes" },
        ],
      },
    ],
    outputs: [
      { name: "amountOut", type: "uint256" },
      { name: "gasEstimate", type: "uint256" },
    ],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
] as const;

export const PERMIT2_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "spender", type: "address" },
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
    ],
    outputs: [],
  },
] as const;

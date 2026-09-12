export type SimpleTradePhase = "pick" | "start" | "done";

export type SimpleDeskReady = {
  hasApprovedStrategy?: boolean;
  hasBacktest?: boolean;
  armed?: boolean;
};

export function simpleTradePhase(r: SimpleDeskReady | undefined): SimpleTradePhase {
  if (!r) return "pick";
  const hasStrategy = Boolean(r.hasApprovedStrategy || r.hasBacktest);
  if (!hasStrategy) return "pick";
  if (!r.armed) return "start";
  return "done";
}

/** Hide session-key jargon — the simple path issues that key for you. */
export function plainDeskBlockReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  if (/session key|trade permission/i.test(reason)) return null;
  if (/deposit at least|convert native/i.test(reason)) {
    return "Add at least $5 USDC on Wallet first (or convert ETH there).";
  }
  if (/approve a strategy|pick a preset/i.test(reason)) return "Pick a trading style first.";
  return reason;
}

export function writeGrowPathQuery(path: "trade" | "liquidity" | "pulse" | null) {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (path) url.searchParams.set("path", path);
  else url.searchParams.delete("path");
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next);
}

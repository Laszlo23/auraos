/**
 * Pulse — 3-minute ETH up/down game (paper bankroll v1).
 * Rounds align to wall-clock slots; settlement uses Binance ETHUSDT mark.
 */
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rateLimitConsume } from "@/lib/rate-limit.server";

export const PULSE_ROUND_MS = 180_000;
export const PULSE_LOCK_MS = 12_000;
export const PULSE_PAYOUT_MULT = 1.85;
export const PULSE_MIN_STAKE = 1;
export const PULSE_MAX_STAKE = 50;
export const PULSE_SEED_BANKROLL = 100;
export const PULSE_SYMBOL = "WETH/USDC";

type RoundRow = {
  id: string;
  slot: number;
  symbol: string;
  opens_at: string;
  locks_at: string;
  closes_at: string;
  open_price: number | null;
  close_price: number | null;
  result: "up" | "down" | "flat" | "void" | null;
  status: "open" | "locked" | "settled" | "void";
  price_source: string | null;
};

type BetRow = {
  id: string;
  company_id: string;
  round_id: string;
  side: "up" | "down";
  stake_usdc: number;
  payout_mult: number;
  payout_usdc: number | null;
  status: "pending" | "won" | "lost" | "refunded" | "void";
  paper: boolean;
  created_at: string;
  settled_at: string | null;
};

function slotAt(ms: number) {
  return Math.floor(ms / PULSE_ROUND_MS);
}

function windowForSlot(slot: number) {
  const opensMs = slot * PULSE_ROUND_MS;
  const closesMs = opensMs + PULSE_ROUND_MS;
  const locksMs = closesMs - PULSE_LOCK_MS;
  return {
    opens_at: new Date(opensMs).toISOString(),
    locks_at: new Date(locksMs).toISOString(),
    closes_at: new Date(closesMs).toISOString(),
  };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertOwnsCompany(companyId: string, userId: string) {
  const db = await admin();
  const { data } = await db
    .from("companies")
    .select("id, owner_id, pulse_paper_usdc")
    .eq("id", companyId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (!data) throw new Error("You do not own this company.");
  return data as { id: string; owner_id: string; pulse_paper_usdc: number | null };
}

async function fetchMark() {
  const { fetchMarkPrice } = await import("@/lib/trading/market-data.server");
  return fetchMarkPrice(PULSE_SYMBOL);
}

async function ensureRound(slot: number): Promise<RoundRow> {
  const db = await admin();
  const { data: existing } = await db
    .from("pulse_rounds")
    .select("*")
    .eq("slot", slot)
    .maybeSingle();
  if (existing) return existing as RoundRow;

  const win = windowForSlot(slot);
  let openPrice: number | null = null;
  let source: string | null = null;
  try {
    const mark = await fetchMark();
    openPrice = mark.price;
    source = mark.source;
  } catch {
    /* open price filled on first poll / bet */
  }

  const { data, error } = await db
    .from("pulse_rounds")
    .insert({
      slot,
      symbol: PULSE_SYMBOL,
      ...win,
      open_price: openPrice,
      price_source: source,
      status: "open",
    } as never)
    .select("*")
    .single();

  if (error) {
    // Race: another writer created the row.
    const { data: again } = await db.from("pulse_rounds").select("*").eq("slot", slot).single();
    if (again) return again as RoundRow;
    throw error;
  }
  return data as RoundRow;
}

async function lockAndSettleDue() {
  const db = await admin();
  const now = Date.now();
  const currentSlot = slotAt(now);

  // Ensure current + previous exist so we can settle.
  await ensureRound(currentSlot);
  if (currentSlot > 0) await ensureRound(currentSlot - 1);

  const { data: due } = await db
    .from("pulse_rounds")
    .select("*")
    .in("status", ["open", "locked"])
    .lte("closes_at", new Date(now).toISOString())
    .order("slot", { ascending: true })
    .limit(8);

  for (const raw of due ?? []) {
    const round = raw as RoundRow;
    try {
      let openPrice = Number(round.open_price);
      let source = round.price_source;
      if (!Number.isFinite(openPrice) || openPrice <= 0) {
        const mark = await fetchMark();
        openPrice = mark.price;
        source = mark.source;
      }
      const mark = await fetchMark();
      const closePrice = mark.price;
      let result: "up" | "down" | "flat" = "flat";
      if (closePrice > openPrice) result = "up";
      else if (closePrice < openPrice) result = "down";

      await db
        .from("pulse_rounds")
        .update({
          open_price: openPrice,
          close_price: closePrice,
          result,
          status: "settled",
          price_source: source ?? mark.source,
        } as never)
        .eq("id", round.id)
        .in("status", ["open", "locked"]);

      const { data: bets } = await db
        .from("pulse_bets")
        .select("*")
        .eq("round_id", round.id)
        .eq("status", "pending");

      for (const betRaw of bets ?? []) {
        const bet = betRaw as BetRow;
        let status: BetRow["status"] = "lost";
        let payout = 0;
        if (result === "flat") {
          status = "refunded";
          payout = Number(bet.stake_usdc);
        } else if (bet.side === result) {
          status = "won";
          payout = Number(bet.stake_usdc) * Number(bet.payout_mult || PULSE_PAYOUT_MULT);
        }

        await db
          .from("pulse_bets")
          .update({
            status,
            payout_usdc: payout,
            settled_at: new Date().toISOString(),
          } as never)
          .eq("id", bet.id)
          .eq("status", "pending");

        if (bet.paper && payout > 0) {
          const { data: company } = await db
            .from("companies")
            .select("pulse_paper_usdc")
            .eq("id", bet.company_id)
            .maybeSingle();
          const bal = Number(
            (company as { pulse_paper_usdc?: number | null } | null)?.pulse_paper_usdc ?? 0,
          );
          await db
            .from("companies")
            .update({ pulse_paper_usdc: bal + payout } as never)
            .eq("id", bet.company_id);
        }
      }
    } catch (err) {
      console.error("[pulse] settle failed", round.id, err);
    }
  }

  // Soft-lock current round near end.
  const { data: current } = await db
    .from("pulse_rounds")
    .select("*")
    .eq("slot", currentSlot)
    .maybeSingle();
  if (current && (current as RoundRow).status === "open") {
    const locksAt = new Date((current as RoundRow).locks_at).getTime();
    if (now >= locksAt) {
      await db
        .from("pulse_rounds")
        .update({ status: "locked" } as never)
        .eq("id", (current as RoundRow).id);
    }
  }
}

async function seedPaperIfNeeded(companyId: string, current: number | null) {
  if (current != null && Number.isFinite(Number(current))) return Number(current);
  const db = await admin();
  await db
    .from("companies")
    .update({ pulse_paper_usdc: PULSE_SEED_BANKROLL } as never)
    .eq("id", companyId)
    .is("pulse_paper_usdc", null);
  return PULSE_SEED_BANKROLL;
}

export const getPulseDeskState = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: { companyId: string }) => {
    if (!input.companyId) throw new Error("Company is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const company = await assertOwnsCompany(data.companyId, context.userId);
    await lockAndSettleDue();

    const now = Date.now();
    const round = await ensureRound(slotAt(now));
    // Fill open price if missing.
    if (round.open_price == null) {
      try {
        const mark = await fetchMark();
        const db = await admin();
        await db
          .from("pulse_rounds")
          .update({ open_price: mark.price, price_source: mark.source } as never)
          .eq("id", round.id)
          .is("open_price", null);
        round.open_price = mark.price;
        round.price_source = mark.source;
      } catch {
        /* ignore */
      }
    }

    const paperUsdc = await seedPaperIfNeeded(data.companyId, company.pulse_paper_usdc);
    const db = await admin();
    const { data: myBet } = await db
      .from("pulse_bets")
      .select("*")
      .eq("company_id", data.companyId)
      .eq("round_id", round.id)
      .maybeSingle();

    const { data: recentRounds } = await db
      .from("pulse_rounds")
      .select("id, slot, open_price, close_price, result, status, closes_at")
      .eq("status", "settled")
      .order("slot", { ascending: false })
      .limit(12);

    const { data: recentBets } = await db
      .from("pulse_bets")
      .select("id, side, stake_usdc, payout_usdc, status, created_at, round_id, settled_at")
      .eq("company_id", data.companyId)
      .order("created_at", { ascending: false })
      .limit(12);

    let livePrice: number | null = null;
    let liveSource: string | null = null;
    try {
      const mark = await fetchMark();
      livePrice = mark.price;
      liveSource = mark.source;
    } catch {
      livePrice = round.open_price != null ? Number(round.open_price) : null;
    }

    const openPrice = round.open_price != null ? Number(round.open_price) : null;
    const deltaPct =
      livePrice != null && openPrice != null && openPrice > 0
        ? ((livePrice - openPrice) / openPrice) * 100
        : null;

    const locksAt = new Date(round.locks_at).getTime();
    const closesAt = new Date(round.closes_at).getTime();
    const bettingOpen = round.status === "open" && now < locksAt;

    return {
      symbol: PULSE_SYMBOL,
      roundMs: PULSE_ROUND_MS,
      payoutMult: PULSE_PAYOUT_MULT,
      minStake: PULSE_MIN_STAKE,
      maxStake: PULSE_MAX_STAKE,
      paperUsdc,
      paper: true,
      livePrice,
      liveSource,
      openPrice,
      deltaPct,
      bettingOpen,
      msToLock: Math.max(0, locksAt - now),
      msToClose: Math.max(0, closesAt - now),
      round: {
        id: round.id,
        slot: Number(round.slot),
        status: round.status,
        opensAt: round.opens_at,
        locksAt: round.locks_at,
        closesAt: round.closes_at,
        result: round.result,
      },
      myBet: myBet
        ? {
            id: (myBet as BetRow).id,
            side: (myBet as BetRow).side,
            stakeUsdc: Number((myBet as BetRow).stake_usdc),
            status: (myBet as BetRow).status,
            payoutUsdc:
              (myBet as BetRow).payout_usdc != null ? Number((myBet as BetRow).payout_usdc) : null,
          }
        : null,
      recentRounds: (recentRounds ?? []).map((r) => ({
        id: r.id as string,
        result: r.result as string | null,
        openPrice: r.open_price != null ? Number(r.open_price) : null,
        closePrice: r.close_price != null ? Number(r.close_price) : null,
        closesAt: r.closes_at as string,
      })),
      recentBets: (recentBets ?? []).map((b) => ({
        id: b.id as string,
        side: b.side as "up" | "down",
        stakeUsdc: Number(b.stake_usdc),
        payoutUsdc: b.payout_usdc != null ? Number(b.payout_usdc) : null,
        status: b.status as string,
        createdAt: b.created_at as string,
      })),
    };
  });

export const placePulseBet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { companyId: string; side: "up" | "down"; stakeUsdc: number }) => {
    if (!input.companyId) throw new Error("Company is required.");
    if (input.side !== "up" && input.side !== "down") throw new Error("Pick UP or DOWN.");
    const stake = Number(input.stakeUsdc);
    if (!Number.isFinite(stake) || stake < PULSE_MIN_STAKE) {
      throw new Error(`Minimum stake is $${PULSE_MIN_STAKE}.`);
    }
    if (stake > PULSE_MAX_STAKE) throw new Error(`Maximum stake is $${PULSE_MAX_STAKE}.`);
    return {
      companyId: input.companyId,
      side: input.side,
      stakeUsdc: Math.round(stake * 100) / 100,
    };
  })
  .handler(async ({ data, context }) => {
    const limited = rateLimitConsume(`pulse-bet:${context.userId}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!limited.ok) {
      throw new Error(`Slow down — try again in ${limited.retryAfterSec}s.`);
    }

    const company = await assertOwnsCompany(data.companyId, context.userId);
    await lockAndSettleDue();

    const now = Date.now();
    const round = await ensureRound(slotAt(now));
    if (round.status !== "open" || now >= new Date(round.locks_at).getTime()) {
      throw new Error("Betting is locked for this round. Wait for the next 3-minute Pulse.");
    }

    if (round.open_price == null) {
      const mark = await fetchMark();
      const db = await admin();
      await db
        .from("pulse_rounds")
        .update({ open_price: mark.price, price_source: mark.source } as never)
        .eq("id", round.id);
    }

    const paperUsdc = await seedPaperIfNeeded(data.companyId, company.pulse_paper_usdc);
    if (data.stakeUsdc > paperUsdc + 1e-9) {
      throw new Error(`Not enough Pulse bankroll ($${paperUsdc.toFixed(2)} left).`);
    }

    const db = await admin();
    const { data: existing } = await db
      .from("pulse_bets")
      .select("id")
      .eq("company_id", data.companyId)
      .eq("round_id", round.id)
      .maybeSingle();
    if (existing) throw new Error("You already played this round.");

    const nextBal = Math.round((paperUsdc - data.stakeUsdc) * 100) / 100;
    const { error: balErr } = await db
      .from("companies")
      .update({ pulse_paper_usdc: nextBal } as never)
      .eq("id", data.companyId);
    if (balErr) throw balErr;

    const { data: bet, error } = await db
      .from("pulse_bets")
      .insert({
        company_id: data.companyId,
        user_id: context.userId,
        round_id: round.id,
        side: data.side,
        stake_usdc: data.stakeUsdc,
        payout_mult: PULSE_PAYOUT_MULT,
        status: "pending",
        paper: true,
      } as never)
      .select("*")
      .single();

    if (error) {
      // Refund bankroll on insert failure.
      await db
        .from("companies")
        .update({ pulse_paper_usdc: paperUsdc } as never)
        .eq("id", data.companyId);
      if (error.message?.includes("pulse_bets_one_per_round") || error.code === "23505") {
        throw new Error("You already played this round.");
      }
      throw error;
    }

    await db.from("app_events").insert({
      user_id: context.userId,
      company_id: data.companyId,
      event: "pulse_bet_placed",
      props: {
        round_id: round.id,
        side: data.side,
        stake_usdc: data.stakeUsdc,
        paper: true,
      },
    });

    return {
      bet: {
        id: (bet as BetRow).id,
        side: (bet as BetRow).side,
        stakeUsdc: Number((bet as BetRow).stake_usdc),
        status: (bet as BetRow).status,
      },
      paperUsdc: nextBal,
      roundId: round.id,
      locksAt: round.locks_at,
      closesAt: round.closes_at,
    };
  });

export const topUpPulsePaper = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: { companyId: string }) => {
    if (!input.companyId) throw new Error("Company is required.");
    return input;
  })
  .handler(async ({ data, context }) => {
    const limited = rateLimitConsume(`pulse-topup:${context.userId}`, {
      limit: 2,
      windowMs: 24 * 60 * 60 * 1000,
    });
    if (!limited.ok) {
      throw new Error(`Demo top-up is limited. Try again in ${limited.retryAfterSec}s.`);
    }
    await assertOwnsCompany(data.companyId, context.userId);
    const db = await admin();
    const { data: row } = await db
      .from("companies")
      .select("pulse_paper_usdc")
      .eq("id", data.companyId)
      .maybeSingle();
    const bal = Number((row as { pulse_paper_usdc?: number | null } | null)?.pulse_paper_usdc ?? 0);
    if (bal >= 25) {
      throw new Error("Top-up only when your Pulse bankroll is under $25.");
    }
    const next = Math.min(PULSE_SEED_BANKROLL, bal + 50);
    await db
      .from("companies")
      .update({ pulse_paper_usdc: next } as never)
      .eq("id", data.companyId);
    return { paperUsdc: next };
  });

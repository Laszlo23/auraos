export type QuantStance = "BULLISH" | "BEARISH" | "NEUTRAL";
export type QuantRiskLabel = "LOW" | "MEDIUM" | "HIGH";
export type QuantRegime = "TRENDING" | "RANGE" | "VOLATILE";
export type QuantRecommendation =
  "MAINTAIN_POSITION" | "WAIT_FOR_ENTRY" | "REDUCE_EXPOSURE" | "REVIEW_STRATEGY" | "NO_CLEAR_SETUP";

export type QuantCheck = {
  id: "trend" | "momentum" | "liquidity" | "volatility";
  label: string;
  ok: boolean;
  warn: boolean;
};

export type QuantView = {
  stance: QuantStance;
  /** Plain-language mood for the UI (e.g. "Sideways"). */
  stanceLabel: string;
  blurb: string;
  confidence: number;
  risk: QuantRiskLabel;
  riskLabel: string;
  regime: QuantRegime;
  regimeLabel: string;
  checks: QuantCheck[];
  recommendation: QuantRecommendation;
  recommendationTitle: string;
  recommendationBody: string;
  whatIdDo: string;
  whatWouldChange: string[];
  /** Primary CTA label for the Quant panel. */
  actionLabel: string;
};

type DeriveInput = {
  change24hPct: number;
  high24h: number;
  low24h: number;
  price: number;
  volumeQuote: number;
  armed: boolean;
  paper: boolean;
  hasOpenPosition: boolean;
  openPnl: number;
  exposurePct: number;
  maxRiskPct: number;
  hasApprovedStrategy: boolean;
  backtest:
    | {
        total_return_pct?: number;
        max_drawdown_pct?: number;
        trade_count?: number;
      }
    | null
    | undefined;
  pendingSignals: number;
};

function stanceLabelOf(stance: QuantStance): string {
  switch (stance) {
    case "BULLISH":
      return "Leaning up";
    case "BEARISH":
      return "Leaning down";
    case "NEUTRAL":
      return "Sideways";
    default: {
      const _exhaustive: never = stance;
      return _exhaustive;
    }
  }
}

function riskLabelOf(risk: QuantRiskLabel): string {
  switch (risk) {
    case "LOW":
      return "Calm";
    case "MEDIUM":
      return "Watchful";
    case "HIGH":
      return "Elevated";
    default: {
      const _exhaustive: never = risk;
      return _exhaustive;
    }
  }
}

function regimeLabelOf(regime: QuantRegime): string {
  switch (regime) {
    case "TRENDING":
      return "Trending";
    case "RANGE":
      return "Chop / range";
    case "VOLATILE":
      return "Whippy";
    default: {
      const _exhaustive: never = regime;
      return _exhaustive;
    }
  }
}

function recommendationCopy(rec: QuantRecommendation): {
  title: string;
  body: string;
  whatIdDo: string;
  actionLabel: string;
} {
  switch (rec) {
    case "MAINTAIN_POSITION":
      return {
        title: "Hold what you have",
        body: "Your open size still fits the plan. Let stop & target do the work.",
        whatIdDo: "Don’t add size. Check the chart levels on the left.",
        actionLabel: "See trade history",
      };
    case "WAIT_FOR_ENTRY":
      return {
        title: "Wait for a cleaner entry",
        body: "Tape has a lean, but Quant wants confirmation before buying.",
        whatIdDo: "Stay flat — or buy a small spot size yourself below if you want exposure now.",
        actionLabel: "Review strategies",
      };
    case "REDUCE_EXPOSURE":
      return {
        title: "Trim risk",
        body: "Drawdown or size is hot vs your caps. Protect the account first.",
        whatIdDo: "Disarm new entries, or sell some ETH back to USDC with the ticket below.",
        actionLabel: "Manage position",
      };
    case "REVIEW_STRATEGY":
      return {
        title: "Pick / approve a strategy first",
        body: "Autopilot needs an approved plan before it can hunt entries for you.",
        whatIdDo: "Open strategies, backtest, then approve — or trade spot manually below.",
        actionLabel: "Open strategies",
      };
    case "NO_CLEAR_SETUP":
      return {
        title: "No strong setup right now",
        body: "Market is mixed. Forcing a trade here is usually noise, not edge.",
        whatIdDo: "Sit on hands for autopilot — or use Buy/Sell ETH below if you have a view.",
        actionLabel: "Browse strategies",
      };
    default: {
      const _exhaustive: never = rec;
      return _exhaustive;
    }
  }
}

/** Deterministic Quant presentation from live desk state — no LLM. */
export function deriveQuantView(input: DeriveInput): QuantView {
  const rangePct = input.price > 0 ? ((input.high24h - input.low24h) / input.price) * 100 : 0;
  const chg = input.change24hPct;
  const absChg = Math.abs(chg);

  let stance: QuantStance = "NEUTRAL";
  if (chg >= 0.8) stance = "BULLISH";
  else if (chg <= -0.8) stance = "BEARISH";

  let regime: QuantRegime = "RANGE";
  if (rangePct >= 4.5 || absChg >= 3) regime = "VOLATILE";
  else if (absChg >= 1) regime = "TRENDING";

  const trendOk = stance !== "NEUTRAL";
  const momentumOk = absChg >= 0.5;
  const liquidityOk = input.volumeQuote > 100_000_000;
  const volWarn = regime === "VOLATILE";

  const checks: QuantCheck[] = [
    {
      id: "trend",
      label:
        stance === "BULLISH" ? "Trend up" : stance === "BEARISH" ? "Trend down" : "No clear trend",
      ok: trendOk && stance === "BULLISH",
      warn: stance === "BEARISH",
    },
    {
      id: "momentum",
      label: chg > 0.5 ? "Buyers active" : chg < -0.5 ? "Sellers active" : "Flat momentum",
      ok: momentumOk && chg > 0,
      warn: momentumOk && chg < 0,
    },
    {
      id: "liquidity",
      label: liquidityOk ? "Liquid enough" : "Thin tape",
      ok: liquidityOk,
      warn: !liquidityOk,
    },
    {
      id: "volatility",
      label: volWarn ? "Whippy moves" : "Vol contained",
      ok: !volWarn,
      warn: volWarn,
    },
  ];

  const bt = input.backtest;
  const dd = bt?.max_drawdown_pct ?? 0;
  const exposureHot = input.exposurePct > input.maxRiskPct * 0.75;
  const losingOpen = input.hasOpenPosition && input.openPnl < 0 && Math.abs(input.openPnl) > 5;

  let risk: QuantRiskLabel = "LOW";
  if (volWarn || exposureHot || dd > 12) risk = "MEDIUM";
  if ((exposureHot && (volWarn || losingOpen)) || dd > 20) risk = "HIGH";

  let confidence = 48;
  if (trendOk) confidence += 12;
  if (momentumOk) confidence += 10;
  if (liquidityOk) confidence += 8;
  if (input.hasApprovedStrategy) confidence += 6;
  if (input.armed) confidence += 4;
  if (volWarn) confidence -= 10;
  if (!input.hasApprovedStrategy) confidence -= 8;
  confidence = Math.max(28, Math.min(88, confidence));

  let recommendation: QuantRecommendation = "NO_CLEAR_SETUP";
  if (
    !input.hasApprovedStrategy ||
    (bt && (bt.total_return_pct ?? 0) < -8 && (bt.trade_count ?? 0) > 3)
  ) {
    recommendation = "REVIEW_STRATEGY";
  } else if (input.hasOpenPosition && (risk === "HIGH" || losingOpen)) {
    recommendation = "REDUCE_EXPOSURE";
  } else if (input.hasOpenPosition && risk !== "HIGH") {
    recommendation = "MAINTAIN_POSITION";
  } else if (input.armed && stance !== "NEUTRAL" && !volWarn) {
    recommendation = "WAIT_FOR_ENTRY";
  } else if (!input.armed && input.hasApprovedStrategy) {
    recommendation = "WAIT_FOR_ENTRY";
  } else {
    recommendation = "NO_CLEAR_SETUP";
  }

  const copy = recommendationCopy(recommendation);

  const blurbParts: string[] = [];
  if (stance === "BULLISH") blurbParts.push("Momentum remains positive.");
  else if (stance === "BEARISH") blurbParts.push("Pressure is to the downside.");
  else blurbParts.push("No strong directional edge right now.");
  if (volWarn) blurbParts.push("Volatility is elevated.");
  else blurbParts.push("Volatility is contained.");
  if (input.hasOpenPosition) {
    blurbParts.push(
      input.openPnl >= 0
        ? "Current exposure is within limits."
        : "Open position is underwater — watch risk.",
    );
  } else {
    blurbParts.push(
      input.armed
        ? "Quant is armed and scanning for entries."
        : "Desk is monitoring — arm when ready.",
    );
  }

  return {
    stance,
    stanceLabel: stanceLabelOf(stance),
    blurb: blurbParts.join(" "),
    confidence,
    risk,
    riskLabel: riskLabelOf(risk),
    regime,
    regimeLabel: regimeLabelOf(regime),
    checks,
    recommendation,
    recommendationTitle: copy.title,
    recommendationBody: copy.body,
    whatIdDo: copy.whatIdDo,
    actionLabel: copy.actionLabel,
    whatWouldChange:
      stance === "BULLISH"
        ? ["Trend reversal", "Momentum breakdown"]
        : stance === "BEARISH"
          ? ["Trend reclaim", "Momentum flip higher"]
          : ["Clear break of range", "Volatility spike"],
  };
}

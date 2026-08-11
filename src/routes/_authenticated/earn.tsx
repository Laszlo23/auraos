import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Check, Copy, Gift, Loader2, Share2, Sparkles, TrendingUp, Users } from "lucide-react";
import { toast } from "sonner";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { ShareBar, ShareLink } from "@/components/aura/share";
import { Counter } from "@/components/aura/counter";
import { Chip, DataRow, Meter, PageHeader, Panel, Shimmer } from "@/components/aura/primitives";
import {
  REFERRAL_MAX,
  REFERRAL_TIERS,
  useClaimEarnings,
  useEarnings,
  useFoundingInvite,
  useReferralCode,
  useReferrals,
  type Referral,
} from "@/hooks/use-earn";
import { SITE_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/earn")({
  head: () => ({
    meta: [
      { title: "Earn — your one invite | Aura OS" },
      {
        name: "description",
        content:
          "Share your single founding invite. Earn in-app AURA when they pay the seat, publish, and start compute — not cash, not token launch.",
      },
      { property: "og:title", content: "Earn — your one invite" },
      {
        property: "og:description",
        content: "One invite per founder. Rewards are in-app AURA for your company reserve.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EarnPage,
});

const STAGE_INDEX: Record<string, number> = { joined: 1, activated: 2, subscribed: 3 };

function StageTrail({ stage }: { stage: string }) {
  const reached = STAGE_INDEX[stage] ?? 1;
  return (
    <div className="flex items-center gap-1.5">
      {REFERRAL_TIERS.map((tier, i) => (
        <span
          key={tier.stage}
          title={tier.label}
          className={cn(
            "h-1.5 w-7 rounded-full transition-colors",
            i < reached ? "bg-primary" : "bg-foreground/10",
          )}
        />
      ))}
    </div>
  );
}

function ReferralRow({ referral }: { referral: Referral }) {
  const earned = REFERRAL_TIERS.slice(0, STAGE_INDEX[referral.stage] ?? 1).reduce(
    (n, t) => n + t.aura,
    0,
  );
  return (
    <div className="flex items-center gap-4 border-b border-border/40 py-3 last:border-0">
      <div className="glass-soft flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold text-primary">
        {(referral.referred_email ?? "F").slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">
          {referral.referred_email ?? "Founder joined via your invite"}
        </p>
        <div className="mt-1.5">
          <StageTrail stage={referral.stage} />
        </div>
      </div>
      <span className="num shrink-0 text-sm font-semibold text-gold">
        +{earned.toLocaleString()}
      </span>
    </div>
  );
}

function EarnPage() {
  const { data: code, isLoading: codeLoading } = useReferralCode();
  const { data: foundingInvite } = useFoundingInvite();
  const { data: referrals = [] } = useReferrals();
  const { data: earnings = [] } = useEarnings();
  const claim = useClaimEarnings();

  const [copied, setCopied] = useState(false);
  const [burst, setBurst] = useState(0);
  const [xp, setXp] = useState<{ label: string; amount: number } | null>(null);

  const inviteUsed = Boolean(foundingInvite?.used) || (code != null && code.uses >= 1);
  const link = useMemo(() => {
    if (!code?.code) return "";
    return `${SITE_URL}/auth?invite=${code.code}`;
  }, [code?.code]);

  const claimable = earnings
    .filter((e) => e.status === "claimable")
    .reduce((n, e) => n + e.amount, 0);
  const lifetime = earnings.reduce((n, e) => n + e.amount, 0);
  const activated = referrals.filter((r) => r.stage !== "joined").length;

  const copy = async (value: string, what: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast.success(`${what} copied`);
    } catch {
      toast.error("Copy failed — select the text manually.");
    }
  };

  const share = async () => {
    const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({
          title: "Aura OS",
          text: "I'm running an online business on Aura. Here's my one invite to buy a founding seat.",
          url: link,
        });
        return;
      } catch {
        /* dismissed */
      }
    }
    void copy(link, "Invite link");
  };

  const onClaim = async () => {
    try {
      const amount = await claim.mutateAsync();
      if (amount > 0) {
        setBurst((n) => n + 1);
        setXp({ label: "Earnings claimed", amount });
        window.setTimeout(() => setXp(null), 2600);
        toast.success(`${amount.toLocaleString()} AURA moved into your reserve.`);
      } else {
        toast.info("Nothing to claim yet — share your invite when someone pays.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Claim failed.");
    }
  };

  return (
    <div className="pb-24">
      <Celebrate trigger={burst} />
      <XpToast label={xp?.label ?? ""} amount={xp?.amount ?? 0} show={Boolean(xp)} />

      <PageHeader
        eyebrow="Growth engine"
        title="Your only invite."
        description="Each seated founder gets one invite — the right for a friend to buy a $99 founding seat. You earn in-app AURA (company compute reserve) on paid conversions — not cash, and not part of the token launch."
        actions={
          <button
            onClick={() => void onClaim()}
            disabled={claim.isPending || claimable === 0}
            className="glass-soft hover-lift inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-gold disabled:opacity-40"
          >
            {claim.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Gift className="h-4 w-4" />
            )}
            Claim {claimable.toLocaleString()} AURA
          </button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
        <div className="space-y-5">
          <Panel label={inviteUsed ? "Invite used" : "Your only invite"} glow>
            {codeLoading ? (
              <Shimmer className="h-24" />
            ) : !code?.code ? (
              <p className="text-[13px] text-muted-foreground">
                Your single invite appears after you hold a paid founding seat.
              </p>
            ) : (
              <>
                {inviteUsed ? (
                  <p className="mb-3 text-[13px] text-muted-foreground">
                    This invite has been used. No second invite in v1 — rewards still track below.
                  </p>
                ) : (
                  <p className="mb-3 text-[13px] text-muted-foreground">
                    Share once. They still pay $99 — your invite is attribution, not a gate.
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => void copy(code.code, "Invite")}
                    disabled={inviteUsed}
                    className="glass-soft hover-lift group flex items-center gap-3 rounded-2xl px-5 py-4 disabled:opacity-50"
                  >
                    <span className="num text-2xl font-semibold tracking-[0.14em] text-primary">
                      {code.code}
                    </span>
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    )}
                  </button>
                  {!inviteUsed ? (
                    <button
                      onClick={() => void share()}
                      className="glass-soft hover-lift inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium"
                    >
                      <Share2 className="h-4 w-4 text-primary" />
                      Share invite
                    </button>
                  ) : (
                    <Chip tone="gold">Used</Chip>
                  )}
                </div>
                {link && !inviteUsed ? (
                  <div className="mt-4 space-y-3">
                    <ShareLink url={link} />
                    <ShareBar
                      url={link}
                      text="I'm running an online business on Aura. Here's my invite to buy a founding seat."
                      placement="earn"
                      compact
                    />
                  </div>
                ) : null}
              </>
            )}
          </Panel>

          <Panel label="Reward schedule">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Paid conversions only. Claimed AURA lands in your company reserve for compute — separate
              from any token launch.
            </p>
            <div className="mt-5 space-y-3">
              {REFERRAL_TIERS.map((tier, i) => (
                <div key={tier.stage} className="glass-soft rounded-2xl px-4 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="num text-[11px] text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="text-[13px] font-medium">{tier.label}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Chip tone="gold">+{tier.aura.toLocaleString()} AURA</Chip>
                      <Chip tone="primary">+{tier.xp} XP</Chip>
                    </div>
                  </div>
                  <div className="mt-3">
                    <Meter value={((i + 1) / REFERRAL_TIERS.length) * 100} tone="gold" />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12px] text-muted-foreground">
              Maximum {REFERRAL_MAX.toLocaleString()} AURA per founder · invitee welcome 1,000 AURA on
              paid seat.
            </p>
          </Panel>

          <Panel label="Founders you brought in">
            {referrals.length === 0 ? (
              <div className="py-10 text-center">
                <Users className="mx-auto h-6 w-6 text-muted-foreground/50" />
                <p className="mt-3 text-[13px] text-muted-foreground">
                  No paid conversions yet. Send your one invite to another online business.
                </p>
              </div>
            ) : (
              referrals.map((r) => <ReferralRow key={r.id} referral={r} />)
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel label="Earnings" glow>
            <div className="text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
                Claimable now
              </p>
              <p className="num mt-2 text-4xl font-semibold text-gold">
                <Counter value={claimable} />
              </p>
            </div>
            <div className="mt-6 space-y-0.5">
              <DataRow label="Lifetime earned" value={lifetime.toLocaleString()} tone="gold" />
              <DataRow label="Founders invited" value={referrals.length} />
              <DataRow label="Reached launch" value={activated} tone="primary" />
              <DataRow label="Invite status" value={inviteUsed ? "Used" : code ? "Open" : "—"} />
            </div>
          </Panel>

          <Panel label="Ledger">
            {earnings.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                Your reward history will appear here.
              </p>
            ) : (
              <div className="max-h-[420px] space-y-0 overflow-y-auto">
                {earnings.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 border-b border-border/40 py-2.5 last:border-0"
                  >
                    {e.status === "claimed" ? (
                      <Check className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-gold" />
                    )}
                    <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
                      {e.reason}
                    </span>
                    <span
                      className={cn(
                        "num shrink-0 text-[12px] font-semibold",
                        e.status === "claimed" ? "text-muted-foreground" : "text-gold",
                      )}
                    >
                      +{e.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel label="Why this works">
            <div className="flex gap-3">
              <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                AURA here is compute fuel for online businesses on Aura OS — not a token sale payout.
                Growing the cohort extends runway without ads.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { LanguageToggle } from "@/components/aura/language-toggle";
import { FoundingCohort, MarketingWaveScarcity } from "@/components/aura/scarcity";
import { FoundingSeatCard } from "@/components/aura/economics";
import { Chip, Panel, Pulse } from "@/components/aura/primitives";
import { ShareMoment } from "@/components/aura/share";
import { SiteFooter } from "@/components/aura/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { startFoundingSeatCheckout } from "@/lib/founding-seat";
import { FOUNDING_SEATS_TOTAL } from "@/lib/marketing-scarcity";
import { ogCampaignMeta } from "@/lib/og-campaign";
import { LAUNCH_SHARE_TEXT, SITE_URL } from "@/lib/site";
import { trackTeaser } from "@/lib/teaser-track";
import { num } from "@/lib/format";
import { useLocale } from "@/hooks/use-locale";

export const Route = createFileRoute("/access")({
  validateSearch: (search: Record<string, unknown>) => {
    const out: { invite?: string; seat?: "cancel" | "success" } = {};
    if (typeof search["invite"] === "string") out.invite = search["invite"];
    if (search["seat"] === "cancel" || search["seat"] === "success") {
      out.seat = search["seat"];
    }
    return out;
  },
  head: () => ({
    meta: [
      { title: "Founding seats — Aura OS" },
      {
        name: "description",
        content: "Buy a founding seat. $99 one-time · 1000 companies · live Stripe checkout.",
      },
      { property: "og:title", content: "Founding seats — Aura OS" },
      {
        property: "og:description",
        content: "Paid founding seats are open. $99 unlocks your AI company on Aura OS.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${SITE_URL}/access` },
      ...ogCampaignMeta("access"),
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/access` }],
  }),
  component: AccessPage,
});

function AccessPage() {
  const navigate = useNavigate();
  const { t } = useLocale();
  const { invite: inviteFromLink, seat } = Route.useSearch();
  const [invite, setInvite] = useState(inviteFromLink?.toUpperCase() ?? "");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [waitlisted, setWaitlisted] = useState(false);

  useEffect(() => {
    if (inviteFromLink) setInvite(inviteFromLink.toUpperCase());
  }, [inviteFromLink]);

  useEffect(() => {
    if (seat === "cancel") toast.message(t("access.checkoutCancel"));
  }, [seat, t]);

  const buySeat = async () => {
    // Friend code from ?invite= is attribution only — never blocks checkout.
    let attribution = invite.trim().toUpperCase() || null;
    setBusy(true);
    try {
      if (attribution) {
        const { data: ok, error } = await supabase.rpc("check_invite_code", { _code: attribution });
        if (error) console.warn("check_invite_code", error.message);
        if (!ok) {
          setInvite("");
          attribution = null;
        }
      }

      trackTeaser("cta_click", {
        placement: attribution ? "access_invite_buy" : "access_open_buy",
      });

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: hasSeat } = await supabase.rpc("user_has_company_seat");
        if (hasSeat) {
          navigate({ to: "/console" });
          return;
        }
        const url = await startFoundingSeatCheckout(attribution);
        window.location.href = url;
        return;
      }

      navigate({
        to: "/auth",
        search: {
          mode: "signup",
          buy: "seat",
          ...(attribution ? { invite: attribution } : {}),
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start checkout");
    } finally {
      setBusy(false);
    }
  };

  const joinWaitlist = async () => {
    const value = email.trim().toLowerCase();
    if (!value.includes("@")) {
      toast.error(t("landing.emailBad"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("waitlist_signups").insert({
        email: value,
        source: "access_founding",
      });
      if (error && !/duplicate|unique/i.test(error.message)) throw error;
      setWaitlisted(true);
      trackTeaser("cta_click", { placement: "access_waitlist" });
      toast.success(t("landing.emailOk"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("landing.emailFail"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden">
      <header className="border-b border-white/5 bg-background/40 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-3.5 sm:px-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("access.home")}
          </Link>
          <LanguageToggle className="ml-auto" />
          <Chip>{t("access.openTag")}</Chip>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-6 sm:py-16">
        <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
          <Pulse /> {t("access.foundingLive")}
        </p>
        <h1 className="font-display text-[clamp(2rem,6vw,3.2rem)] leading-[0.98] tracking-tight">
          {t("access.title")}
          <span className="block text-primary">{t("access.subtitle")}</span>
        </h1>
        <p className="mt-3 text-[12px] font-semibold uppercase tracking-[0.22em] text-gold">
          {t("access.priceTag", { total: num(FOUNDING_SEATS_TOTAL) })}
        </p>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          {t("access.blurb")}
        </p>
        {invite ? (
          <p className="mt-3 text-[12px] text-muted-foreground">
            {t("access.friendCode")} · <span className="font-semibold text-foreground">{invite}</span>
          </p>
        ) : null}

        <div className="mt-8 space-y-6">
          <FoundingSeatCard />
          <MarketingWaveScarcity />
          <FoundingCohort />
        </div>

        <Panel label={t("access.buyLabel")} className="mt-10" glow>
          <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
            {t("access.buyBlurb")}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void buySeat()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-3.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-40 sm:w-auto"
          >
            {busy ? t("access.buyOpening") : t("access.buyCta")}{" "}
            <ArrowRight className="h-4 w-4" />
          </button>
        </Panel>

        <Panel label={t("access.shareLabel")} className="mt-8">
          <ShareMoment
            url={`${SITE_URL}/access`}
            text={`Aura OS founding seats — $99, hard-capped at ${num(FOUNDING_SEATS_TOTAL)}. Live checkout.`}
            title="Aura OS founding seats"
            placement="access_share"
            label="Share founding seats"
            showKit={false}
          />
        </Panel>

        <Panel label={t("access.updatesLabel")} className="mt-6">
          {waitlisted ? (
            <p className="text-[13px] text-muted-foreground">
              {t("access.updatesJoined")}
            </p>
          ) : (
            <>
              <p className="mb-3 text-[12px] text-muted-foreground">
                {t("access.updatesBlurb")}
              </p>
              <div className="flex flex-wrap gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("access.updatesEmail")}
                  autoComplete="email"
                  className="min-w-[12rem] flex-1 rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none placeholder:text-muted-foreground/60"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void joinWaitlist()}
                  className="rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold disabled:opacity-40"
                >
                  {t("access.updatesCta")}
                </button>
              </div>
            </>
          )}
        </Panel>
      </div>

      <SiteFooter
        share={{
          url: `${SITE_URL}/access`,
          text: LAUNCH_SHARE_TEXT,
          placement: "access_footer",
        }}
      />
    </main>
  );
}

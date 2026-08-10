import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Link2, Loader2, Sparkles } from "lucide-react";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { FoundingCohort } from "@/components/aura/scarcity";
import { VideoBackdrop } from "@/components/aura/video-bg";
import { Chip, Meter, Pulse } from "@/components/aura/primitives";
import { useCompany } from "@/hooks/use-aura";
import { useConnectChannel, type SocialProvider } from "@/hooks/use-connections";
import { useAwardXp, useCompleteOnboarding, useProgress } from "@/hooks/use-progress";
import { useAdvanceReferral, useProvisionSmartWallet } from "@/hooks/use-earn";
import { useMyHandle } from "@/hooks/use-identity";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapFunnelCompany, bootstrapOnboardingProduct } from "@/lib/bootstrap-product";
import { LOCAL_DE_NICHES } from "@/lib/boost-packs";
import { funnelById, isFunnelId, type FunnelId } from "@/lib/funnels";
import { cn } from "@/lib/utils";
import { toast as notify } from "sonner";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Wake your company — Aura OS onboarding" },
      {
        name: "description",
        content:
          "Four quiet steps: name the company, choose its first autonomous product, connect its channels, claim your founding seat.",
      },
      { property: "og:title", content: "Wake your company | Aura OS" },
      {
        property: "og:description",
        content: "Name it, give it a product, connect its voice. Then let it run.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Onboarding,
});

const PRODUCTS = [
  {
    id: "trading",
    glyph: "⟁",
    name: "Quant Trading Desk",
    blurb: "Hires Quant + Ledger. You fund, pick a preset, and arm under hard USDC caps.",
    tag: "Recommended",
  },
  {
    id: "commerce",
    glyph: "◍",
    name: "Commerce Engine",
    blurb: "Hires Iris, Vela, Juno. Creates a product + landing draft for your approval.",
  },
  {
    id: "studio",
    glyph: "❖",
    name: "Content Studio",
    blurb: "Hires Vela, Orin, Iris. Drafts brand voice — nothing publishes without you.",
  },
];

const CHANNELS = [
  { id: "x", name: "X", glyph: "𝕏" },
  { id: "meta", name: "Meta", glyph: "∞" },
  { id: "linkedin", name: "LinkedIn", glyph: "in" },
  { id: "tiktok", name: "TikTok", glyph: "♪" },
  { id: "farcaster", name: "Farcaster", glyph: "FC" },
];

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const entryFunnel: FunnelId =
    company?.entry_funnel && isFunnelId(company.entry_funnel) ? company.entry_funnel : "os";
  const funnelDef = funnelById(entryFunnel);
  const isLokalDe = entryFunnel === "local" && company?.ui_locale === "de";
  const skipProductPicker = funnelDef.bootstrap.skipProductPicker;
  const { data: progress } = useProgress();
  const award = useAwardXp();
  const complete = useCompleteOnboarding();
  const { data: myHandle } = useMyHandle();
  const provisionWallet = useProvisionSmartWallet();
  const advanceReferral = useAdvanceReferral();
  const connectChannel = useConnectChannel();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [niche, setNiche] = useState("");
  const [isLocal, setIsLocal] = useState(true);
  const [product, setProduct] = useState("trading");
  const [picked, setPicked] = useState<string[]>(["x", "linkedin"]);
  const [connecting, setConnecting] = useState(false);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<{ label: string; amount: number } | null>(null);
  const [finishing, setFinishing] = useState(false);

  const pop = (label: string, amount: number, quest?: string) => {
    setBurst((n) => n + 1);
    setToast({ label, amount });
    setTimeout(() => setToast(null), 2200);
    award.mutate({ amount, quest });
  };

  const next = () => setStep((s) => Math.min(3, s + 1));

  const saveName = async () => {
    if (company && name.trim().length > 1) {
      await supabase
        .from("companies")
        .update({
          name: name.trim(),
          city: city.trim() || null,
          niche: niche.trim() || null,
          is_local_business: isLocal || isLokalDe,
          network_backlink: isLocal || isLokalDe,
          ...(isLokalDe ? { ui_locale: "de" } : {}),
        })
        .eq("id", company.id);
      await qc.invalidateQueries({ queryKey: ["company"] });
    }
    pop("Company named", 100, "onboard:name");
    next();
  };

  const saveProduct = async () => {
    if (!company) {
      notify.error("Company not ready yet — wait a moment and try again.");
      return;
    }
    try {
      if (skipProductPicker) {
        const res = await bootstrapFunnelCompany(
          company.id,
          entryFunnel,
          name.trim() || company.name,
          { city: city.trim() || null, niche: niche.trim() || null },
        );
        await qc.invalidateQueries({ queryKey: ["company"] });
        await qc.invalidateQueries({ queryKey: ["table", "agents"] });
        await qc.invalidateQueries({ queryKey: ["table", "products"] });
        await qc.invalidateQueries({ queryKey: ["table", "tasks"] });
        await qc.invalidateQueries({ queryKey: ["table", "knowledge_items"] });
        await qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
        await qc.invalidateQueries({ queryKey: ["table", "akquise_campaigns"] });
        await qc.invalidateQueries({ queryKey: ["revenue-missions"] });
        pop(`${res.lead} hired`, 150, "onboard:product");
        notify.success("Sales department seeded — review Missions and Lead hunter next.");
        next();
        return;
      }
      const res = await bootstrapOnboardingProduct(
        company.id,
        product,
        name.trim() || company.name,
      );
      await qc.invalidateQueries({ queryKey: ["company"] });
      await qc.invalidateQueries({ queryKey: ["table", "agents"] });
      await qc.invalidateQueries({ queryKey: ["table", "products"] });
      await qc.invalidateQueries({ queryKey: ["table", "tasks"] });
      await qc.invalidateQueries({ queryKey: ["table", "knowledge_items"] });
      await qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
      pop(`${res.meta.name} hired`, 150, "onboard:product");
      notify.success(
        `${res.lead} filed a starter brief — approve it on Tasks to put them to work.`,
      );
      next();
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Could not hire the product team.");
    }
  };

  const saveChannels = async () => {
    if (!company || picked.length === 0) return next();
    setConnecting(true);
    let linked = 0;
    for (const provider of picked as SocialProvider[]) {
      try {
        await connectChannel.mutateAsync(provider);
        linked += 1;
      } catch (e) {
        notify.error(
          e instanceof Error
            ? e.message
            : `Could not connect ${provider}. You can finish this on Channels.`,
        );
      }
    }
    setConnecting(false);
    if (linked > 0)
      pop(`${linked} channel${linked === 1 ? "" : "s"} live`, 200, "onboard:channels");
    next();
  };

  const finish = async () => {
    setFinishing(true);
    pop(entryFunnel === "os" ? "Founding seat claimed" : "Company ready", 300, "onboard:seat");
    await complete.mutateAsync();

    // Give the founder a working wallet and pay whoever invited them. Neither
    // is allowed to block the celebration.
    if (myHandle?.id) {
      try {
        await provisionWallet.mutateAsync(myHandle.id);
      } catch {
        /* wallet can be provisioned later from Identity */
      }
    }
    try {
      await advanceReferral.mutateAsync("activated");
    } catch {
      /* no referrer, or already credited */
    }

    const dest =
      isLokalDe || (entryFunnel === "local" && company?.ui_locale === "de")
        ? "/heute"
        : entryFunnel === "local"
          ? "/business"
          : entryFunnel !== "os"
            ? "/missions"
            : product === "trading"
              ? "/trading"
              : "/console";
    setTimeout(() => navigate({ to: dest }), 1200);
  };

  const steps = skipProductPicker
    ? ["Identity", "Department", "Voice", "Go"]
    : ["Identity", "First product", "Voice", "Seat"];

  return (
    <div className="relative -mx-1 min-h-[76vh]">
      <VideoBackdrop intensity={0.4} />
      <Celebrate trigger={burst} />
      <XpToast label={toast?.label ?? ""} amount={toast?.amount ?? 0} show={Boolean(toast)} />

      <div className="mx-auto max-w-3xl">
        <div className="mb-10 flex items-center gap-3">
          {steps.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col gap-2">
              <Meter
                value={i < step ? 100 : i === step ? 45 : 0}
                tone={i <= step ? "primary" : "gold"}
              />
              <span
                className={cn(
                  "text-[10px] uppercase tracking-[0.22em]",
                  i === step ? "text-primary" : "text-muted-foreground/60",
                )}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -14, filter: "blur(8px)" }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 0 && (
              <section>
                <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-primary">
                  {isLokalDe ? "Schritt 1" : "Step one"}
                </p>
                <h1 className="text-gradient text-4xl font-semibold leading-[1.05] md:text-5xl">
                  {isLokalDe ? "Wie heißt dein Betrieb?" : "Name the online business."}
                </h1>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  {isLokalDe
                    ? "Friseur, Beauty, Gastro, Immobilien oder Handwerk — kurz und klar."
                    : "Prefer local / niche businesses — published landings can join the founding backlink network. Token launch is separate from this seat."}
                </p>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveName()}
                  placeholder={
                    isLokalDe
                      ? "z. B. Salon Mira"
                      : company?.name && company.name !== "Untitled company"
                        ? company.name
                        : "e.g. Northwind Labs"
                  }
                  className="glass mt-8 w-full rounded-3xl px-6 py-5 text-2xl outline-none placeholder:text-muted-foreground/40 focus:ring-1 focus:ring-primary/40"
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={isLokalDe ? "Stadt" : "City (optional)"}
                    className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/40"
                  />
                  {!isLokalDe ? (
                    <input
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="Niche (e.g. dental, café)"
                      className="glass w-full rounded-2xl px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/40"
                    />
                  ) : null}
                </div>
                {isLokalDe ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {LOCAL_DE_NICHES.map((n) => (
                      <button
                        key={n.id}
                        type="button"
                        onClick={() => {
                          setNiche(n.label);
                          setIsLocal(true);
                        }}
                        className={cn(
                          "rounded-2xl border px-3 py-2 text-xs font-semibold transition-colors",
                          niche === n.label
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-border/50 text-muted-foreground",
                        )}
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <label className="mt-4 flex cursor-pointer items-center gap-3 text-[13px] text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={isLocal}
                      onChange={(e) => setIsLocal(e.target.checked)}
                      className="h-4 w-4 rounded border-border"
                    />
                    Local / niche online business — opt into founding network backlinks after publish
                  </label>
                )}
                <StepAction
                  onClick={saveName}
                  label={isLokalDe ? "Weiter" : "Wake the company"}
                />
              </section>
            )}

            {step === 1 && skipProductPicker && (
              <section>
                <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-primary">
                  Step two
                </p>
                <h1 className="text-gradient text-4xl font-semibold leading-[1.05] md:text-5xl">
                  Hire your AI department.
                </h1>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  {funnelDef.subhead}
                </p>
                <div className="glass mt-8 rounded-3xl p-5">
                  <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    First mission
                  </p>
                  <p className="mt-2 text-[15px] font-medium leading-relaxed">
                    {funnelDef.bootstrap.missionGoal}
                  </p>
                  <p className="mt-4 text-[12px] text-muted-foreground">
                    Agents: {funnelDef.bootstrap.agents.join(" · ")}
                  </p>
                </div>
                <StepAction onClick={() => void saveProduct()} label="Hire the team" />
              </section>
            )}

            {step === 1 && !skipProductPicker && (
              <section>
                <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-primary">
                  Step two
                </p>
                <h1 className="text-gradient text-4xl font-semibold leading-[1.05] md:text-5xl">
                  Choose its first product.
                </h1>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  One product, fully autonomous. You can add more once this one earns.
                </p>
                <div className="mt-8 space-y-3">
                  {PRODUCTS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setProduct(p.id)}
                      className={cn(
                        "glass flex w-full items-start gap-4 rounded-3xl p-5 text-left transition-all",
                        product === p.id
                          ? "ring-1 ring-primary/45"
                          : "opacity-70 hover:opacity-100",
                      )}
                    >
                      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/14 text-lg text-primary">
                        {p.glyph}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-[15px] font-semibold">{p.name}</span>
                          {p.tag ? <Chip tone="gold">{p.tag}</Chip> : null}
                        </span>
                        <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
                          {p.blurb}
                        </span>
                      </span>
                      {product === p.id ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" />
                      ) : null}
                    </button>
                  ))}
                </div>
                <StepAction onClick={() => void saveProduct()} label="Hire the team" />
              </section>
            )}

            {step === 2 && (
              <section>
                <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-primary">
                  Step three
                </p>
                <h1 className="text-gradient text-4xl font-semibold leading-[1.05] md:text-5xl">
                  Give it a voice.
                </h1>
                <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                  Connect the channels your company will speak through. It drafts; nothing publishes
                  without your standing instruction.
                </p>
                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {CHANNELS.map((c) => {
                    const on = picked.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        onClick={() =>
                          setPicked((p) => (on ? p.filter((x) => x !== c.id) : [...p, c.id]))
                        }
                        className={cn(
                          "glass flex flex-col items-center gap-3 rounded-3xl px-4 py-7 transition-all",
                          on ? "ring-1 ring-primary/45" : "opacity-65 hover:opacity-100",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-12 w-12 place-items-center rounded-2xl text-lg font-semibold",
                            on
                              ? "bg-primary/16 text-primary"
                              : "bg-foreground/6 text-muted-foreground",
                          )}
                        >
                          {c.glyph}
                        </span>
                        <span className="text-sm font-medium">{c.name}</span>
                        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          {on ? (
                            <>
                              <Pulse /> selected
                            </>
                          ) : (
                            <>
                              <Link2 className="h-3 w-3" /> connect
                            </>
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <StepAction
                  onClick={saveChannels}
                  label={connecting ? "Authorising…" : "Connect channels"}
                  busy={connecting}
                />
              </section>
            )}

            {step === 3 && (
              <section>
                <p className="mb-3 text-[10px] uppercase tracking-[0.32em] text-gold">Final step</p>
                {entryFunnel === "os" ? (
                  <>
                    <h1 className="text-gradient text-4xl font-semibold leading-[1.05] md:text-5xl">
                      Claim seat #{progress?.seat_number ?? "—"}.
                    </h1>
                    <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                      Founding companies keep their token rate for life, and their agents get priority
                      compute during peak hours.
                    </p>
                    <div className="glass mt-8 rounded-3xl p-6">
                      <FoundingCohort seat={progress?.seat_number} />
                    </div>
                    <div className="mt-6 flex items-center gap-2 text-[13px] text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-gold" />
                      Your seat number is your place in the founding cohort — no inflated counters.
                    </div>
                    <StepAction
                      onClick={finish}
                      label={finishing ? "Opening your company…" : "Claim my seat"}
                      busy={finishing}
                      tone="gold"
                    />
                  </>
                ) : (
                  <>
                    <h1 className="text-gradient text-4xl font-semibold leading-[1.05] md:text-5xl">
                      Open your company.
                    </h1>
                    <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                      {funnelDef.headline} Pick an outcome plan on Billing when you&apos;re ready —
                      no founding-seat invite required for this funnel.
                    </p>
                    <div className="glass mt-8 rounded-3xl p-6">
                      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Funnel
                      </p>
                      <p className="mt-2 text-[15px] font-medium">{funnelDef.audience}</p>
                      <p className="mt-2 text-[13px] text-muted-foreground">{funnelDef.subhead}</p>
                    </div>
                    <StepAction
                      onClick={finish}
                      label={finishing ? "Opening…" : "Enter Aura OS"}
                      busy={finishing}
                      tone="gold"
                    />
                  </>
                )}
              </section>
            )}
          </motion.div>
        </AnimatePresence>

        <button
          onClick={() => {
            void complete.mutateAsync();
            navigate({ to: "/console" });
          }}
          className="mt-10 text-[12px] text-muted-foreground/60 transition-colors hover:text-foreground"
        >
          Skip — I'll explore first
        </button>
      </div>
    </div>
  );
}

function StepAction({
  onClick,
  label,
  busy,
  tone = "primary",
}: {
  onClick: () => void;
  label: string;
  busy?: boolean;
  tone?: "primary" | "gold";
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={busy}
      className={cn(
        "mt-9 flex items-center gap-2.5 rounded-2xl px-6 py-3.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60",
        tone === "gold"
          ? "bg-gold text-background shadow-[0_0_40px_-10px_var(--gold)]"
          : "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]",
      )}
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      {label}
    </motion.button>
  );
}

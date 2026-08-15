import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { toast as notify } from "sonner";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { Chip, Meter } from "@/components/aura/primitives";
import { useCompany } from "@/hooks/use-aura";
import { useLocale } from "@/hooks/use-locale";
import { useAwardXp, useCompleteOnboarding } from "@/hooks/use-progress";
import { useAdvanceReferral, useProvisionSmartWallet } from "@/hooks/use-earn";
import { useClaimHandle, useMyHandle } from "@/hooks/use-identity";
import { supabase } from "@/integrations/supabase/client";
import { peekFunnel, rememberFunnel } from "@/lib/attribution";
import { bootstrapFunnelCompany, bootstrapOnboardingProduct } from "@/lib/bootstrap-product";
import { funnelById, isFunnelId, type FunnelId } from "@/lib/funnels";
import {
  interpretBusiness,
  LOKAL_GOALS,
  ONBOARD_EXAMPLES,
  type LokalImproveGoal,
  type OnboardBrief,
} from "@/lib/onboard-brief";
import { createRevenueMission, startRevenueMission } from "@/lib/revenue-mission.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "What should Aura build? — Aura OS" },
      {
        name: "description",
        content: "Describe your business. Aura wakes the company. You give the first mission.",
      },
      { property: "og:title", content: "Wake your company | Aura OS" },
    ],
  }),
  component: Onboarding,
});

const PHASES = ["Describe", "Build", "Mission", "Approve"] as const;
const PHASES_DE = ["Beschreiben", "Bauen", "Mission", "Freigeben"] as const;
const WAKE_TICKS = [
  "Company identity",
  "CEO activated",
  "Employees assigned",
  "Company memory initialized",
  "Mission system ready",
  "Approval controls enabled",
];
const WAKE_TICKS_DE = [
  "Firmenidentität",
  "CEO aktiv",
  "Mitarbeiter zugewiesen",
  "Firmengedächtnis bereit",
  "Missionssystem bereit",
  "Freigabe-Kontrolle an",
];

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: company } = useCompany();
  const { locale, setLocale } = useLocale();
  const de = locale === "de";
  const entryFunnel: FunnelId =
    company?.entry_funnel && isFunnelId(company.entry_funnel) ? company.entry_funnel : peekFunnel();
  const isLokal = entryFunnel === "local";
  const award = useAwardXp();
  const complete = useCompleteOnboarding();
  const { data: myHandle } = useMyHandle();
  const claimHandle = useClaimHandle();
  const provisionWallet = useProvisionSmartWallet();
  const advanceReferral = useAdvanceReferral();

  const [phase, setPhase] = useState(0);
  const [prompt, setPrompt] = useState("");
  const [brief, setBrief] = useState<OnboardBrief | null>(null);
  const [shopName, setShopName] = useState("");
  const [lokalGoal, setLokalGoal] = useState<LokalImproveGoal>("reviews");
  const [mission, setMission] = useState("");
  const [busy, setBusy] = useState(false);
  const [wakeTick, setWakeTick] = useState(0);
  const [missionId, setMissionId] = useState<string | null>(null);
  const [planSteps, setPlanSteps] = useState<string[]>([]);
  const [estCost, setEstCost] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);
  const [toast, setToast] = useState<{ label: string; amount: number } | null>(null);
  const [firstWin, setFirstWin] = useState(false);

  useEffect(() => {
    if (isLokal) setLocale("de");
  }, [isLokal, setLocale]);

  const pop = (label: string, amount: number, quest?: string) => {
    setBurst((n) => n + 1);
    setToast({ label, amount });
    setTimeout(() => setToast(null), 2200);
    award.mutate({ amount, quest });
  };

  const invalidateCompany = async () => {
    await qc.invalidateQueries({ queryKey: ["company"] });
    await qc.invalidateQueries({ queryKey: ["table", "agents"] });
    await qc.invalidateQueries({ queryKey: ["table", "tasks"] });
    await qc.invalidateQueries({ queryKey: ["table", "activity_events"] });
    await qc.invalidateQueries({ queryKey: ["revenue-missions"] });
  };

  const persistIdentity = async (
    name: string,
    extra?: { city?: string | null; niche?: string | null; local?: boolean },
  ) => {
    if (!company) throw new Error(de ? "Betrieb noch nicht bereit." : "Company not ready yet.");
    await supabase
      .from("companies")
      .update({
        name,
        city: extra?.city ?? null,
        niche: extra?.niche ?? null,
        is_local_business: Boolean(extra?.local || isLokal),
        network_backlink: Boolean(extra?.local || isLokal),
        ...(isLokal || extra?.local ? { ui_locale: "de", entry_funnel: "local" } : {}),
      })
      .eq("id", company.id);
  };

  const finishTo = async (dest: string) => {
    await complete.mutateAsync();
    try {
      let handleId = myHandle?.id;
      if (!handleId && company?.name) {
        const base =
          company.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "")
            .slice(0, 16) || "founder";
        for (const candidate of [base, `${base}${Math.floor(Math.random() * 90 + 10)}`]) {
          try {
            const row = await claimHandle.mutateAsync({
              handle: candidate,
              display_name: company.name,
            });
            handleId = row.id;
            break;
          } catch {
            /* taken */
          }
        }
      }
      if (handleId) await provisionWallet.mutateAsync(handleId);
    } catch {
      /* later */
    }
    try {
      await advanceReferral.mutateAsync("activated");
    } catch {
      /* none */
    }
    navigate({ to: dest });
  };

  const startWake = async (nextBrief: OnboardBrief) => {
    if (!company) return;
    setBusy(true);
    setPhase(1);
    setWakeTick(0);
    try {
      await persistIdentity(nextBrief.name, {
        city: nextBrief.city,
        niche: nextBrief.industry,
        local: nextBrief.local,
      });
      if (nextBrief.local || isLokal) {
        rememberFunnel("local");
        await bootstrapFunnelCompany(company.id, "local", nextBrief.name, {
          city: nextBrief.city,
          niche: nextBrief.industry,
        });
      } else if (entryFunnel !== "os") {
        await bootstrapFunnelCompany(company.id, entryFunnel, nextBrief.name, {
          city: nextBrief.city,
          niche: nextBrief.industry,
        });
      } else {
        await bootstrapOnboardingProduct(company.id, nextBrief.product, nextBrief.name);
      }
      await invalidateCompany();
      pop(de ? "Firma wacht auf" : "Company waking", 150, "onboard:product");
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Could not wake the company.");
      setBusy(false);
      return;
    }
    setBusy(false);
  };

  useEffect(() => {
    if (phase !== 1) return;
    if (wakeTick >= WAKE_TICKS.length) {
      const t = window.setTimeout(() => setPhase(2), 700);
      return () => window.clearTimeout(t);
    }
    const t = window.setTimeout(() => setWakeTick((n) => n + 1), 380);
    return () => window.clearTimeout(t);
  }, [phase, wakeTick]);

  const submitDescribe = () => {
    if (prompt.trim().length < 4) {
      notify.error(
        de ? "Erzähl kurz, was du machst." : "Tell Aura what you do — one sentence is enough.",
      );
      return;
    }
    const next = interpretBusiness(prompt);
    setBrief(next);
    setMission(next.missions[0] ?? "");
    setPhase(0.5 as unknown as number);
  };

  const submitLokalName = () => {
    if (shopName.trim().length < 2) {
      notify.error("Bitte Betriebsname eingeben.");
      return;
    }
    const next = interpretBusiness(`${shopName} salon Wien`);
    next.name = shopName.trim();
    next.local = true;
    setBrief(next);
    setPhase(0.5 as unknown as number);
  };

  const confirmUnderstand = () => {
    if (!brief) return;
    void startWake(brief);
  };

  const submitMission = async () => {
    const goal = mission.trim();
    if (goal.length < 4) {
      notify.error(
        de
          ? "Sag, was die Firma zuerst schaffen soll."
          : "What should the company accomplish first?",
      );
      return;
    }
    if (!company || !brief) return;
    setBusy(true);
    setPlanSteps(brief.planSteps);
    setEstCost(12);
    try {
      const row = await createRevenueMission({
        data: {
          goal,
          industry: brief.industry,
          location: brief.city,
          risk: "medium",
        },
      });
      const id = (row as { id?: string })?.id;
      if (id) setMissionId(id);
      const steps = (row as { plan?: { steps?: { label?: string; title?: string }[] } })?.plan
        ?.steps;
      if (Array.isArray(steps) && steps.length) {
        setPlanSteps(steps.map((s) => s.label || s.title || "").filter(Boolean));
      }
      const cost = (row as { projected?: { cost_usdc?: number } })?.projected?.cost_usdc;
      if (typeof cost === "number" && cost > 0) setEstCost(Math.round(cost));
      pop(de ? "Plan bereit" : "Plan ready", 150, "onboard:mission");
      setPhase(3);
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Could not draft the plan.");
      setPhase(3);
    } finally {
      setBusy(false);
    }
  };

  const approvePlan = async () => {
    setBusy(true);
    try {
      if (missionId) {
        await startRevenueMission({ data: { missionId } });
      }
      pop(de ? "Firma arbeitet" : "Company is working", 300, "onboard:seat");
      setFirstWin(true);
      await new Promise((r) => window.setTimeout(r, 1400));
      await finishTo(isLokal || brief?.local ? "/kunden" : "/console");
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Could not start the mission.");
      setBusy(false);
    }
  };

  const finishLokalFirstWin = async () => {
    setBusy(true);
    try {
      pop("Reputation live", 300, "onboard:seat");
      setFirstWin(true);
      await new Promise((r) => window.setTimeout(r, 1400));
      await finishTo("/kunden");
    } catch (e) {
      notify.error(e instanceof Error ? e.message : "Konnte nicht öffnen.");
      setBusy(false);
    }
  };

  const phaseIndex = phase === 0.5 ? 0 : phase === 1 ? 1 : phase === 2 ? 2 : phase >= 3 ? 3 : 0;
  const labels = de ? PHASES_DE : PHASES;
  const understand = phase === 0.5;

  return (
    <div className="relative mx-auto min-h-[78vh] max-w-3xl px-1">
      <Celebrate trigger={burst} />
      <XpToast label={toast?.label ?? ""} amount={toast?.amount ?? 0} show={Boolean(toast)} />

      <div className="mb-10 flex items-center gap-3">
        {labels.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-2">
            <Meter
              value={i < phaseIndex ? 100 : i === phaseIndex ? 50 : 0}
              tone={i <= phaseIndex ? "primary" : "gold"}
            />
            <span
              className={cn(
                "text-[10px] uppercase tracking-[0.22em]",
                i === phaseIndex ? "text-primary" : "text-muted-foreground/60",
              )}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={firstWin ? "win" : String(phase) + (understand ? "-u" : "")}
          initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -12, filter: "blur(8px)" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {phase === 0 && !understand && isLokal ? (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
                Aura Lokal
              </p>
              <h1 className="mt-3 font-display text-[clamp(2.2rem,7vw,3.6rem)] font-semibold leading-[1.02] tracking-tight">
                Grow my local business
              </h1>
              <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
                Wie heißt der Betrieb? Aura erkennt den Rest.
              </p>
              <input
                autoFocus
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitLokalName()}
                placeholder="z. B. Körperglanz & Shape-Line"
                className="glass mt-8 w-full rounded-2xl px-5 py-4 text-lg outline-none"
              />
              <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Was willst du verbessern?
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {LOKAL_GOALS.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setLokalGoal(g.id)}
                    className={cn(
                      "rounded-2xl border px-4 py-3 text-left",
                      lokalGoal === g.id
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/40 bg-card/30",
                    )}
                  >
                    <p className="font-semibold">{g.title}</p>
                    <p className="mt-1 text-[12px] text-muted-foreground">{g.body}</p>
                  </button>
                ))}
              </div>
              <Primary onClick={submitLokalName} label="Weiter" />
            </section>
          ) : null}

          {phase === 0 && !understand && !isLokal ? (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
                {de ? "Dein Unternehmen" : "Your company"}
              </p>
              <h1 className="mt-3 font-display text-[clamp(2.2rem,7vw,3.8rem)] font-semibold leading-[1.02] tracking-tight">
                {de ? "Was soll Aura für dich bauen?" : "What do you want Aura to build for you?"}
              </h1>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                {de
                  ? "Ein Satz reicht. Du bist der Owner. Aura versteht den Rest."
                  : "One sentence is enough. You are the owner. Aura understands the rest."}
              </p>
              <textarea
                autoFocus
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder={ONBOARD_EXAMPLES[0]}
                className="glass mt-8 w-full resize-none rounded-3xl px-5 py-4 text-lg leading-relaxed outline-none"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {ONBOARD_EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="rounded-full border border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    {ex}
                  </button>
                ))}
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Primary
                  onClick={submitDescribe}
                  label={de ? "Firma bauen →" : "Build my company →"}
                />
                <button
                  type="button"
                  onClick={() => {
                    setPrompt(ONBOARD_EXAMPLES[2]);
                    const next = interpretBusiness(ONBOARD_EXAMPLES[2]);
                    setBrief(next);
                    setMission(next.missions[0] ?? "");
                    setPhase(0.5 as unknown as number);
                  }}
                  className="text-sm font-semibold text-muted-foreground hover:text-foreground"
                >
                  {de ? "Beispiel ansehen" : "Explore an example"}
                </button>
              </div>
            </section>
          ) : null}

          {understand && brief ? (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
                {de ? "Ich verstehe." : "I understand."}
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
                {brief.name}
              </h1>
              <dl className="mt-6 space-y-2 text-[15px]">
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {de ? "Geschäft" : "Business"}
                  </dt>
                  <dd className="font-medium">
                    {brief.industry}
                    {brief.city ? ` · ${brief.city}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    {de ? "Ziel" : "Primary goal"}
                  </dt>
                  <dd className="text-muted-foreground">{brief.goal}</dd>
                </div>
              </dl>
              {brief.local || isLokal ? (
                <p className="mt-4 text-[13px] text-muted-foreground">
                  {de
                    ? "Google-Profil bestätigst du später selbst. Aura erfindet keine Sterne und keine Reviews."
                    : "You’ll confirm the Google profile yourself. Aura never invents ratings or reviews."}
                </p>
              ) : null}
              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {de ? "Erste Belegschaft" : "First workforce"}
              </p>
              <ul className="mt-3 space-y-2">
                {brief.roles.map((r) => (
                  <li
                    key={r.key}
                    className="rounded-2xl border border-border/40 bg-card/30 px-4 py-3"
                  >
                    <p className="text-[11px] uppercase tracking-[0.16em] text-primary">
                      {r.title}
                    </p>
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-[13px] text-muted-foreground">{r.blurb}</p>
                  </li>
                ))}
              </ul>
              <Primary
                onClick={confirmUnderstand}
                label={de ? "Firma wecken →" : "Wake my company →"}
              />
            </section>
          ) : null}

          {phase === 1 ? (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
                {de ? "Firma entsteht" : "Creating company…"}
              </p>
              <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight">
                {brief?.name ?? (de ? "Dein Unternehmen" : "Your company")}
              </h1>
              <ul className="mt-8 space-y-3">
                {(de ? WAKE_TICKS_DE : WAKE_TICKS).map((label, i) => (
                  <li key={label} className="flex items-center gap-3 text-[15px]">
                    <span
                      className={cn(
                        "grid h-6 w-6 place-items-center rounded-full border",
                        i < wakeTick
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border/50 text-muted-foreground",
                      )}
                    >
                      {i < wakeTick ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span className={i < wakeTick ? "text-foreground" : "text-muted-foreground"}>
                      {label}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {phase === 2 &&
          !firstWin &&
          brief &&
          (isLokal || brief.local) &&
          lokalGoal === "reviews" ? (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
                {de ? "Deine Firma ist bereit." : "Your company is ready."}
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {["Geschäft", "CEO", "Mitarbeiter"].map((label) => (
                  <li key={label} className="flex items-center gap-2 text-[13px]">
                    <span className="grid h-5 w-5 place-items-center rounded-full border border-primary bg-primary/20 text-primary">
                      <Check className="h-3 w-3" />
                    </span>
                    {label}
                  </li>
                ))}
                <li className="flex items-center gap-2 text-[13px] text-muted-foreground">
                  <span className="grid h-5 w-5 place-items-center rounded-full border border-border/50 text-[10px]">
                    0%
                  </span>
                  Erste Review-Anfrage
                </li>
              </ul>
              <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">
                {de ? "Erste echte Review-Anfrage" : "Get your first genuine review request sent."}
              </h1>
              <p className="mt-4 max-w-xl text-[15px] text-muted-foreground">
                Besuch → Check-in → Erlaubnis → Einladung. Der Gast schreibt selbst. Aura erzeugt
                keine Reviews.
              </p>
              <ol className="mt-6 space-y-2 text-[14px] text-muted-foreground">
                <li>01 Check-in-QR im Laden</li>
                <li>02 Gast kommt — du bestätigst den Besuch</li>
                <li>03 Aura bereitet die Einladung vor</li>
                <li>04 Du gibst frei — der Gast schreibt auf Google</li>
              </ol>
              <Primary
                onClick={() => void finishLokalFirstWin()}
                label={busy ? "Öffnen…" : "Reputation starten →"}
                busy={busy}
              />
            </section>
          ) : null}

          {phase === 2 &&
          !firstWin &&
          brief &&
          !((isLokal || brief.local) && lokalGoal === "reviews") ? (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
                {de ? "Deine Firma ist bereit." : "Your company is ready."}
              </p>
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {(de
                  ? [
                      ["Geschäft", true],
                      ["CEO", true],
                      ["Mitarbeiter", true],
                      ["Erste Mission", false],
                    ]
                  : [
                      ["Business", true],
                      ["CEO", true],
                      ["Employees", true],
                      ["First mission", false],
                    ]
                ).map(([label, done]) => (
                  <li key={String(label)} className="flex items-center gap-2 text-[13px]">
                    <span
                      className={cn(
                        "grid h-5 w-5 place-items-center rounded-full border text-[10px]",
                        done
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border/50 text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : "0%"}
                    </span>
                    {label}
                  </li>
                ))}
              </ul>
              <h1 className="mt-6 font-display text-[clamp(2rem,6vw,3.2rem)] font-semibold leading-[1.05] tracking-tight">
                {de ? "Gib ihr eine Mission →" : "Give it a mission →"}
              </h1>
              <textarea
                autoFocus
                value={mission}
                onChange={(e) => setMission(e.target.value)}
                rows={3}
                className="glass mt-8 w-full resize-none rounded-3xl px-5 py-4 text-lg outline-none"
              />
              <div className="mt-4 flex flex-wrap gap-2">
                {brief.missions.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMission(m)}
                    className="rounded-full border border-border/40 px-3 py-1.5 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  >
                    {m}
                  </button>
                ))}
              </div>
              <Primary
                onClick={() => void submitMission()}
                label={
                  busy ? (de ? "Plant…" : "Planning…") : de ? "Plan zeigen →" : "Show the plan →"
                }
                busy={busy}
              />
            </section>
          ) : null}

          {firstWin ? (
            <section className="text-center">
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
                {de ? "Erster Win" : "First win"}
              </p>
              <h1 className="mt-3 font-display text-[clamp(2rem,6vw,3.4rem)] font-semibold tracking-tight">
                {de ? "Deine erste Firmen-Mission läuft." : "Your first company mission is live."}
              </h1>
              <p className="mt-4 text-[15px] text-muted-foreground">
                {de
                  ? "Proof kommt, sobald echte Arbeit fertig ist."
                  : "Proof appears when real work finishes."}
              </p>
            </section>
          ) : null}

          {phase === 3 && !firstWin ? (
            <section>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-primary">
                {de ? "Auras Plan" : "Aura's plan"}
              </p>
              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{mission}</h1>
              <ol className="mt-8 space-y-2">
                {planSteps.map((s, i) => (
                  <li
                    key={s}
                    className="flex gap-3 rounded-2xl border border-border/40 bg-card/25 px-4 py-3"
                  >
                    <span className="font-display text-lg text-gold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[15px]">{s}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 flex flex-wrap gap-3">
                <Chip tone="gold">
                  {de ? "Geschätzte Kosten" : "Estimated cost"}: €{estCost ?? 12}
                </Chip>
                <Chip>{de ? "Freigabe nötig" : "Approval required"}: Yes</Chip>
              </div>
              <p className="mt-4 text-[13px] text-muted-foreground">
                {de
                  ? "Nichts Öffentliches und kein Geld ohne deine Freigabe."
                  : "Nothing public and no spend without your approval."}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Primary
                  onClick={() => void approvePlan()}
                  label={
                    busy
                      ? de
                        ? "Startet…"
                        : "Starting…"
                      : de
                        ? "Freigeben & ausführen"
                        : "Approve & execute"
                  }
                  busy={busy}
                />
                <button
                  type="button"
                  onClick={() => setPhase(2)}
                  className="rounded-2xl border border-border/50 px-5 py-3 text-sm font-semibold"
                >
                  {de ? "Plan ändern" : "Edit plan"}
                </button>
              </div>
            </section>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <p className="mt-16 text-[12px] text-muted-foreground">
        {funnelById(entryFunnel).headline} ·{" "}
        <button
          type="button"
          onClick={() => void finishTo(isLokal ? "/kunden" : "/console")}
          className="text-primary"
        >
          {de ? "Später öffnen" : "Skip for now"}
        </button>
      </p>
    </div>
  );
}

function Primary({ onClick, label, busy }: { onClick: () => void; label: string; busy?: boolean }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
      {label}
    </button>
  );
}

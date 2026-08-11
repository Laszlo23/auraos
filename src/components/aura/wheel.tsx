import { motion } from "motion/react";
import { useRef, useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";

import { Celebrate, XpToast } from "@/components/aura/celebrate";
import { useSpinWheel, useTodaySpin, type Spin } from "@/hooks/use-wheel";
import { shortTx } from "@/lib/chain";
import { WHEEL_PRIZES } from "@/lib/gamify";
import { cn } from "@/lib/utils";

const SEGMENTS = WHEEL_PRIZES.length;
const STEP = 360 / SEGMENTS;
const R = 108;

const segmentFill = (tone: "primary" | "gold", i: number) => {
  const base = tone === "gold" ? "var(--gold)" : "var(--primary)";
  const alpha = tone === "gold" ? (i % 2 ? 34 : 26) : i % 2 ? 16 : 9;
  return `color-mix(in oklab, ${base} ${alpha}%, transparent)`;
};

/** Pointer is at top (12 o'clock). Segment i is centered at this absolute angle. */
function landingAngle(prizeIndex: number) {
  const center = prizeIndex * STEP + STEP / 2;
  // Rotate wheel so segment center sits under the top pointer.
  return (360 - center + 360) % 360;
}

/**
 * The daily reserve drop. One spin per company per day, drawn and settled
 * server-side. Rendered as a tilted 3D disc with a machined rim.
 */
export function DailyWheel() {
  const { data: today } = useTodaySpin();
  const spin = useSpinWheel();
  const [angle, setAngle] = useState(0);
  const [burst, setBurst] = useState(0);
  const [won, setWon] = useState<Spin | null>(null);
  const [spinning, setSpinning] = useState(false);
  const angleRef = useRef(0);

  const spent = Boolean(today) && !spinning;
  const result = today ?? won;
  const busy = spinning || spin.isPending;

  const pull = async () => {
    if (spent || busy) return;

    setSpinning(true);
    // Immediate visual spin — don't wait on the network.
    const windup = angleRef.current + 360 * 6;
    angleRef.current = windup;
    setAngle(windup);

    try {
      const drop = await spin.mutateAsync();
      let index = WHEEL_PRIZES.findIndex((p) => p.label === drop.label);
      if (index < 0) {
        index = WHEEL_PRIZES.findIndex((p) => p.kind === drop.prize_kind);
      }
      index = Math.max(0, index);

      const target = landingAngle(index);
      const currentMod = ((angleRef.current % 360) + 360) % 360;
      let delta = target - currentMod;
      if (delta < 0) delta += 360;
      // Extra full turns so the landing still feels like a spin.
      const final = angleRef.current + 360 * 3 + delta;
      angleRef.current = final;
      setAngle(final);
      setWon(drop);
      window.setTimeout(() => setBurst((n) => n + 1), 3200);
      window.setTimeout(() => setSpinning(false), 3600);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Spin failed — try again.");
      // Ease back a little so a failed pull doesn't leave a wild angle.
      const reset = angleRef.current - (angleRef.current % 360);
      angleRef.current = reset;
      setAngle(reset);
      setSpinning(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <Celebrate trigger={burst} />
      <XpToast
        label={won ? `Reserve drop — ${won.label}` : ""}
        amount={won?.xp_awarded ?? 0}
        show={Boolean(won)}
      />

      <div className="relative" style={{ perspective: "900px" }}>
        <span className="pointer-events-none absolute -bottom-3 left-1/2 h-8 w-44 -translate-x-1/2 rounded-[100%] bg-black/50 blur-xl" />

        {/* Tilt wrapper separate from the spinning node (avoids transform fights). */}
        <div
          className="relative grid h-60 w-60 place-items-center"
          style={{ transform: "rotateX(24deg)", transformStyle: "preserve-3d" }}
        >
          <span
            className="absolute h-56 w-56 rounded-full"
            style={{
              transform: "translateZ(-14px)",
              background: "linear-gradient(180deg, oklch(0.34 0.02 230), oklch(0.15 0.02 240))",
              boxShadow: "0 24px 60px -18px rgba(0,0,0,0.85)",
            }}
          />

          <motion.div
            animate={{ rotate: angle }}
            initial={false}
            transition={{
              duration: spinning ? 3.4 : 0.6,
              ease: spinning ? [0.12, 0.75, 0.08, 1] : "easeOut",
            }}
            className="relative h-56 w-56 rounded-full"
            style={{ willChange: "transform" }}
          >
            <svg
              viewBox="0 0 240 240"
              className="h-full w-full drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            >
              <defs>
                <radialGradient id="wheelGloss" cx="34%" cy="24%" r="78%">
                  <stop offset="0%" stopColor="white" stopOpacity="0.22" />
                  <stop offset="46%" stopColor="white" stopOpacity="0.04" />
                  <stop offset="100%" stopColor="black" stopOpacity="0.34" />
                </radialGradient>
                <linearGradient id="wheelRim" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="white" stopOpacity="0.5" />
                  <stop offset="50%" stopColor="white" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="white" stopOpacity="0.3" />
                </linearGradient>
              </defs>

              {WHEEL_PRIZES.map((p, i) => {
                const a0 = ((i * STEP - 90) * Math.PI) / 180;
                const a1 = (((i + 1) * STEP - 90) * Math.PI) / 180;
                const x0 = 120 + R * Math.cos(a0);
                const y0 = 120 + R * Math.sin(a0);
                const x1 = 120 + R * Math.cos(a1);
                const y1 = 120 + R * Math.sin(a1);
                return (
                  <path
                    key={p.label}
                    d={`M120 120 L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z`}
                    fill={segmentFill(p.tone, i)}
                    stroke="color-mix(in oklab, var(--foreground) 10%, transparent)"
                    strokeWidth="0.6"
                  />
                );
              })}

              <circle cx="120" cy="120" r={R} fill="url(#wheelGloss)" />
              <circle cx="120" cy="120" r={R} fill="none" stroke="url(#wheelRim)" strokeWidth="6" />
              <circle
                cx="120"
                cy="120"
                r={R - 7}
                fill="none"
                stroke="color-mix(in oklab, var(--primary) 30%, transparent)"
                strokeWidth="0.8"
              />
            </svg>

            {WHEEL_PRIZES.map((p, i) => {
              const a = ((i * STEP + STEP / 2 - 90) * Math.PI) / 180;
              return (
                <span
                  key={p.label}
                  className={cn(
                    "absolute left-1/2 top-1/2 whitespace-nowrap text-[10px] font-semibold tabular-nums tracking-[0.08em]",
                    p.tone === "gold" ? "text-gold" : "text-foreground/75",
                  )}
                  style={{
                    transform: `translate(calc(-50% + ${(70 * Math.cos(a)).toFixed(1)}px), calc(-50% + ${(70 * Math.sin(a)).toFixed(1)}px))`,
                  }}
                >
                  {p.short}
                </span>
              );
            })}
          </motion.div>

          <button
            type="button"
            onClick={() => void pull()}
            disabled={spent || busy}
            style={{ transform: "translateZ(26px)" }}
            className={cn(
              "absolute grid h-[68px] w-[68px] place-items-center rounded-full text-[10px] font-bold uppercase tracking-[0.16em] transition-all",
              "bg-[radial-gradient(circle_at_32%_26%,color-mix(in_oklab,var(--primary)_88%,white),var(--primary))] text-primary-foreground",
              "shadow-[0_10px_24px_-6px_rgba(0,0,0,0.7),inset_0_1px_0_rgba(255,255,255,0.45)]",
              "hover:brightness-110 active:translate-y-[1px] disabled:opacity-45 disabled:hover:brightness-100",
            )}
          >
            {busy ? "···" : spent ? "Done" : "Spin"}
          </button>
        </div>

        <span className="absolute left-1/2 top-1 z-20 h-0 w-0 -translate-x-1/2 border-x-[8px] border-t-[14px] border-x-transparent border-t-gold drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]" />
      </div>

      <div className="text-center">
        {result ? (
          <>
            <p className="text-sm font-semibold text-foreground">{result.label}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              <Link2 className="h-3 w-3" />
              {result.tx_hash
                ? `${result.chain_status === "anchored" ? result.chain_network : "dev chain"} · ${shortTx(result.tx_hash)}`
                : "Prize credited · chain stamp pending"}
            </p>
          </>
        ) : (
          <p className="max-w-[15rem] text-[11px] leading-relaxed text-muted-foreground">
            One drop per day. Drawn and settled on the ledger.
          </p>
        )}
      </div>
    </div>
  );
}

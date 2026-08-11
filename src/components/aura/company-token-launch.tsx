import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Rocket, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import {
  deployCompanyToken,
  draftCompanyToken,
  getCompanyTokenLaunch,
  markCompanyTokenReady,
} from "@/lib/company-token.functions";
import { COMPANY_TOKEN_PRESETS } from "@/lib/company-token-presets";
import { cn } from "@/lib/utils";

export function CompanyTokenLaunchPanel() {
  const qc = useQueryClient();
  const stateQ = useQuery({
    queryKey: ["company-token-launch"],
    queryFn: () => getCompanyTokenLaunch(),
  });

  const state = stateQ.data;
  const launch = state?.launch as
    | {
        id: string;
        status: string;
        name: string;
        symbol: string;
        image_url?: string | null;
        preset_id?: string;
        token_address?: string | null;
        clanker_tx_hash?: string | null;
        error?: string | null;
        spec?: Record<string, unknown>;
      }
    | null
    | undefined;

  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [presetId, setPresetId] = useState("community_standard");
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    if (!state) return;
    if (launch) {
      setName(launch.name);
      setSymbol(launch.symbol);
      setImageUrl(launch.image_url ?? "");
      setPresetId(launch.preset_id ?? "community_standard");
    } else if (state.suggested) {
      setName(state.suggested.name);
      setSymbol(state.suggested.symbol);
    }
  }, [state?.companyId, launch?.id, state?.suggested?.symbol]);

  const refresh = () => void qc.invalidateQueries({ queryKey: ["company-token-launch"] });

  const draftMut = useMutation({
    mutationFn: () =>
      draftCompanyToken({
        data: { name, symbol, imageUrl: imageUrl || undefined, presetId },
      }),
    onSuccess: () => {
      toast.success("Draft saved");
      setPreview(null);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const readyMut = useMutation({
    mutationFn: () => markCompanyTokenReady({ data: { launchId: launch!.id } }),
    onSuccess: (res) => {
      toast.success("Preview ready — review then deploy");
      setPreview(res.preview as Record<string, unknown>);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deployMut = useMutation({
    mutationFn: () => deployCompanyToken({ data: { launchId: launch!.id, confirm: true } }),
    onSuccess: () => {
      toast.success("Token live on Base");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (stateQ.isLoading && !state) {
    return (
      <Panel label="Company token" glow>
        <p className="text-[13px] text-muted-foreground">Loading launch desk…</p>
      </Panel>
    );
  }

  if (!state?.companyId) {
    return (
      <Panel label="Company token" glow>
        <p className="text-[13px] text-muted-foreground">
          Create your company first, then you can draft a Base token for it.
        </p>
      </Panel>
    );
  }

  const isLive = launch?.status === "live";
  const explorerBase =
    state.chainId === 84532 ? "https://sepolia.basescan.org" : "https://basescan.org";

  return (
    <Panel label="Company Token Launch Desk" glow data-tour="company-token-launch">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="text-[15px] font-semibold tracking-tight">
            Tokenize this business — Clanker on Base
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
            Draft → preview → deploy. Utility / community token for your company OS — not an
            investment, not compute AURA, not the platform fair launch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Chip tone={state.clankerEnabled ? "primary" : "neutral"}>
            {state.clankerEnabled ? "Deploy on" : "Draft only"}
          </Chip>
          <Chip tone={state.hasWallet ? "gold" : "danger"}>
            {state.hasWallet ? "Wallet ready" : "Need wallet"}
          </Chip>
          <Chip tone={state.hasSeat ? "gold" : "neutral"}>
            {state.hasSeat ? "Seat" : "No seat row"}
          </Chip>
        </div>
      </div>

      {isLive && launch?.token_address ? (
        <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/[0.07] p-4">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-primary">Live</p>
          <p className="mt-1 text-[18px] font-semibold">
            {launch.name} · ${launch.symbol}
          </p>
          <p className="mt-2 break-all font-mono text-[12px] text-muted-foreground">
            {launch.token_address}
          </p>
          <a
            href={`${explorerBase}/token/${launch.token_address}`}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-primary"
          >
            Basescan <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block text-[11px] font-medium text-muted-foreground">
              Token name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-[13px]"
                maxLength={64}
              />
            </label>
            <label className="block text-[11px] font-medium text-muted-foreground">
              Symbol
              <input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="mt-1.5 w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 font-mono text-[13px]"
                maxLength={10}
              />
            </label>
            <label className="block text-[11px] font-medium text-muted-foreground sm:col-span-2">
              Image URL (optional)
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://… or ipfs://"
                className="mt-1.5 w-full rounded-xl border border-border/60 bg-background/50 px-3 py-2 text-[13px]"
              />
            </label>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {COMPANY_TOKEN_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPresetId(p.id)}
                className={cn(
                  "rounded-2xl border p-3 text-left transition",
                  presetId === p.id
                    ? "border-primary/50 bg-primary/[0.08]"
                    : "border-border/40 bg-foreground/[0.02]",
                )}
              >
                <p className="text-[13px] font-semibold">{p.name}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{p.tagline}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={draftMut.isPending}
              onClick={() => draftMut.mutate()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-4 py-2 text-[12px] font-semibold"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {draftMut.isPending ? "Saving…" : "Save draft"}
            </button>
            <button
              type="button"
              disabled={!launch?.id || readyMut.isPending || launch.status === "deploying"}
              onClick={() => readyMut.mutate()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 px-4 py-2 text-[12px] font-semibold disabled:opacity-40"
            >
              Preview (Ready)
            </button>
            <button
              type="button"
              disabled={
                !launch?.id ||
                launch.status !== "ready" ||
                !state.clankerEnabled ||
                !state.hasSeat ||
                deployMut.isPending
              }
              onClick={() => {
                if (
                  !window.confirm(
                    `Deploy $${symbol} on Base via Clanker? This spends ETH for gas` +
                      (presetId === "growth_devbuy" ? " + 0.01 ETH starter buy" : "") +
                      ".",
                  )
                ) {
                  return;
                }
                deployMut.mutate();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2 text-[12px] font-semibold text-background disabled:opacity-40"
            >
              <Rocket className="h-3.5 w-3.5" />
              {deployMut.isPending ? "Deploying…" : "Deploy live"}
            </button>
          </div>

          {launch?.status === "failed" && launch.error ? (
            <p className="mt-3 text-[12px] text-destructive">{launch.error}</p>
          ) : null}

          {!state.clankerEnabled ? (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Live deploy is gated (`CLANKER_ENABLED`). You can still draft and preview.
            </p>
          ) : null}

          {state.ethBalanceEth != null ? (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Owner ETH (gas): {Number(state.ethBalanceEth).toFixed(4)} · platform fee{" "}
              {(state.platformFeeBps / 100).toFixed(1)}% of LP rewards
            </p>
          ) : null}
        </>
      )}

      {preview && !isLive ? (
        <div className="mt-5 rounded-2xl border border-border/50 bg-foreground/[0.03] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Clanker preview
          </p>
          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] text-muted-foreground">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      ) : null}
    </Panel>
  );
}

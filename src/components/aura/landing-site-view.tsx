import { useState } from "react";
import { toast } from "sonner";

import type { LandingTemplateId, SiteContent } from "@/lib/sites/templates";
import { captureSiteLead, createSiteCheckout } from "@/lib/sites.public.functions";
import { cn } from "@/lib/utils";

export function LandingSiteView({
  slug,
  templateId,
  content,
  product,
  interactive = true,
  preview = false,
  networkPeers,
  showNetworkStrip = false,
}: {
  slug: string;
  templateId: LandingTemplateId;
  content: SiteContent;
  product?: { name: string; amount_cents: number | null; interval: string } | null;
  interactive?: boolean;
  preview?: boolean;
  networkPeers?: { slug: string; company_name: string; city: string | null; niche: string | null }[];
  showNetworkStrip?: boolean;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const needsCheckout =
    templateId === "subscription_daily" || templateId === "ebook_product";
  const needsLead =
    templateId === "lead_magnet" || templateId === "service_offer";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!interactive || preview) {
      toast.message(preview ? "Preview only — publish to go live." : "Disabled");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      toast.error("Enter a valid email");
      return;
    }
    setBusy(true);
    try {
      if (needsCheckout) {
        const { url } = await createSiteCheckout({ data: { slug, email: trimmed } });
        window.location.href = url;
        return;
      }
      if (needsLead) {
        await captureSiteLead({
          data: {
            slug,
            email: trimmed,
            ...(name.trim() ? { name: name.trim() } : {}),
          },
        });
        toast.success("You're on the list");
        setEmail("");
        setName("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const priceLabel =
    content.pricing ||
    (product?.amount_cents != null
      ? `$${(product.amount_cents / 100).toFixed(2)} / ${product.interval}`
      : null);

  return (
    <div className="relative min-h-full overflow-hidden bg-[oklch(0.14_0.02_265)] text-[oklch(0.96_0.01_95)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            content.accent === "rose"
              ? "radial-gradient(ellipse 70% 50% at 20% -10%, oklch(0.7 0.12 20 / 0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, oklch(0.65 0.08 320 / 0.12), transparent 50%)"
              : content.accent === "sky"
                ? "radial-gradient(ellipse 70% 50% at 20% -10%, oklch(0.72 0.1 230 / 0.22), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, oklch(0.7 0.08 180 / 0.1), transparent 50%)"
                : "radial-gradient(ellipse 70% 50% at 20% -10%, oklch(0.72 0.1 85 / 0.18), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, oklch(0.65 0.08 200 / 0.1), transparent 50%)",
        }}
      />

      <div className="relative mx-auto max-w-2xl px-6 py-16 text-center sm:py-24">
        {preview ? (
          <p className="mb-6 text-[10px] uppercase tracking-[0.35em] text-amber-200/80">
            Draft preview
          </p>
        ) : null}
        <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">{content.brand}</p>
        <h1 className="mt-5 font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          {content.hero}
        </h1>
        <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-white/65">
          {content.subhead}
        </p>
        {content.offer || priceLabel ? (
          <p className="mt-4 text-sm text-amber-100/80">
            {[content.offer, priceLabel].filter(Boolean).join(" · ")}
          </p>
        ) : null}

        <form onSubmit={onSubmit} className="mx-auto mt-10 max-w-md space-y-3 text-left">
          {needsLead ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (optional)"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none ring-amber-200/30 placeholder:text-white/35 focus:ring-2"
            />
          ) : null}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none ring-amber-200/30 placeholder:text-white/35 focus:ring-2"
          />
          <button
            type="submit"
            disabled={busy || !interactive}
            className={cn(
              "w-full rounded-2xl bg-[oklch(0.82_0.12_85)] px-4 py-3 text-sm font-semibold text-[oklch(0.22_0.03_70)] transition-opacity hover:opacity-90 disabled:opacity-50",
            )}
          >
            {busy ? "Working…" : content.cta}
          </button>
        </form>

        {content.faq && content.faq.length > 0 ? (
          <div className="mx-auto mt-16 max-w-md space-y-4 text-left">
            {content.faq.map((item) => (
              <div key={item.q}>
                <p className="text-sm font-semibold text-white/90">{item.q}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-white/55">{item.a}</p>
              </div>
            ))}
          </div>
        ) : null}

        {showNetworkStrip && networkPeers && networkPeers.length > 0 ? (
          <div className="mx-auto mt-16 max-w-md border-t border-white/10 pt-10 text-left">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/40">
              Founding network
            </p>
            <p className="mt-2 text-[13px] text-white/55">
              Other local online businesses on Aura OS — reciprocal links, opt-in.
            </p>
            <ul className="mt-4 space-y-2">
              {networkPeers.map((peer) => (
                <li key={peer.slug}>
                  <a
                    href={`/s/${peer.slug}`}
                    className="text-sm text-amber-100/85 underline-offset-2 hover:underline"
                  >
                    {peer.company_name}
                    {peer.city || peer.niche
                      ? ` · ${[peer.city, peer.niche].filter(Boolean).join(" · ")}`
                      : ""}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <p className="mt-16 text-[11px] text-white/30">Powered by Aura OS</p>
      </div>
    </div>
  );
}

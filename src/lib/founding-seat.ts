import { supabase } from "@/integrations/supabase/client";

/** Start Stripe Checkout for the founding seat (auth required). */
export async function startFoundingSeatCheckout(invite?: string | null): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sign in first to buy a founding seat.");

  const res = await fetch("/api/billing/founding-seat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ invite: invite?.trim().toUpperCase() || undefined }),
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) {
    throw new Error(body.error || "Could not start founding seat checkout");
  }
  return body.url;
}

/** Start NOWPayments crypto checkout for the founding seat (auth required). */
export async function startFoundingCryptoCheckout(opts: {
  invite?: string | null;
  asset: string;
}): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("Sign in first to buy a founding seat.");

  const res = await fetch("/api/billing/founding-crypto", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      invite: opts.invite?.trim().toUpperCase() || undefined,
      asset: opts.asset,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !body.url) {
    throw new Error(body.error || "Could not start founding seat crypto checkout");
  }
  return body.url;
}

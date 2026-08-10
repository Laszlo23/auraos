import { supabase } from "@/integrations/supabase/client";

/** Start Stripe Checkout for the $99 founding seat (auth required). */
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

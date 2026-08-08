import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { AuthChangeEvent } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { captureAttribution } from "@/lib/attribution";
import { trackTeaser } from "@/lib/teaser-track";
import { trackAppEvent } from "@/lib/app-track";
import { Pulse } from "@/components/aura/primitives";
import { StreamText } from "@/components/aura/stream-text";
import { SiteFooter } from "@/components/aura/site-footer";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

type AuthMode = "signin" | "signup" | "forgot" | "reset" | "magic";

const SAFE_NEXT = new Set(["/console", "/missions", "/akquise", "/trading", "/onboarding"]);

function safeNextPath(next?: string): "/console" | "/missions" | "/akquise" | "/trading" | "/onboarding" {
  if (next && SAFE_NEXT.has(next)) {
    return next as "/console" | "/missions" | "/akquise" | "/trading" | "/onboarding";
  }
  return "/console";
}

/** Short founder invite codes — not Supabase PKCE `code` values (long opaque strings). */
function looksLikeInviteCode(value: string): boolean {
  return /^[A-Za-z0-9_]{3,32}$/.test(value.trim());
}

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { invite?: string; code?: string; ref?: string; mode?: AuthMode; next?: string } => {
    const inviteRaw =
      typeof search["invite"] === "string"
        ? search["invite"]
        : typeof search["code"] === "string" && looksLikeInviteCode(search["code"])
          ? search["code"]
          : undefined;
    return {
      ...(inviteRaw ? { invite: inviteRaw } : {}),
      // Keep raw `code` when it is a PKCE auth code (not an invite) for session exchange.
      ...(typeof search["code"] === "string" && !looksLikeInviteCode(search["code"])
        ? { code: search["code"] }
        : {}),
      ...(typeof search["ref"] === "string" ? { ref: search["ref"] as string } : {}),
      ...(typeof search["mode"] === "string" &&
      ["signin", "signup", "forgot", "reset", "magic"].includes(search["mode"] as string)
        ? { mode: search["mode"] as AuthMode }
        : {}),
      ...(typeof search["next"] === "string" ? { next: search["next"] as string } : {}),
    };
  },
  head: () => ({
    meta: [
      { title: "Enter Aura OS — AI Company Operating System" },
      {
        name: "description",
        content:
          "Sign in to Aura OS and take command of a company staffed entirely by autonomous AI employees.",
      },
      { property: "og:title", content: "Enter Aura OS" },
      { property: "og:description", content: "Take command of an autonomous AI company." },
      { property: "og:url", content: `${SITE_URL}/auth` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/auth` }],
  }),
  component: AuthPage,
});

const REF_KEY = "aura:ref";
const INVITE_KEY = "aura:invite";

function rememberRef(ref?: string) {
  if (!ref) return;
  try {
    sessionStorage.setItem(REF_KEY, ref.trim().toUpperCase());
  } catch {
    /* private mode */
  }
}

function rememberInvite(code?: string) {
  if (!code) return;
  try {
    sessionStorage.setItem(INVITE_KEY, code.trim().toUpperCase());
  } catch {
    /* private mode */
  }
}

export function takeStoredRef() {
  try {
    const v = sessionStorage.getItem(REF_KEY);
    if (v) sessionStorage.removeItem(REF_KEY);
    return v;
  } catch {
    return null;
  }
}

function takeStoredInvite() {
  try {
    const v = sessionStorage.getItem(INVITE_KEY);
    if (v) sessionStorage.removeItem(INVITE_KEY);
    return v;
  } catch {
    return null;
  }
}

function authRedirectUrl(mode?: AuthMode) {
  // Prefer canonical production origin so magic-link / OAuth emails always hit the allowlist.
  // Localhost keeps window origin so local Docker auth still works.
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const origin =
    host === "localhost" || host === "127.0.0.1"
      ? window.location.origin
      : SITE_URL;
  const q = mode ? `?mode=${mode}` : "";
  return `${origin}/auth${q}`;
}

function AuthPage() {
  const navigate = useNavigate();
  const {
    invite: inviteFromLink,
    code: authCodeFromLink,
    ref: refFromLink,
    mode: modeFromLink,
    next: nextFromLink,
  } = Route.useSearch();
  const postAuthTo = safeNextPath(nextFromLink);
  const [invite, setInvite] = useState(inviteFromLink ?? "");
  const [mode, setMode] = useState<AuthMode>(modeFromLink ?? "signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  /** Magic link from signup creates users; from sign-in it must not. */
  const [magicCreatesUser, setMagicCreatesUser] = useState(true);

  useEffect(() => {
    if (modeFromLink) setMode(modeFromLink);
  }, [modeFromLink]);

  useEffect(() => {
    rememberRef(refFromLink);
    if (inviteFromLink) {
      setInvite(inviteFromLink);
      rememberInvite(inviteFromLink);
    }
    captureAttribution();
    trackTeaser("signup_view", { placement: "auth" });

    let cancelled = false;

    async function finishIfSession() {
      const { data } = await supabase.auth.getSession();
      if (cancelled || !data.session) return false;
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.includes("type=recovery") || modeFromLink === "reset") {
        setMode("reset");
        return true;
      }
      await burnInviteIfNeeded();
      await claimReferral();
      navigate({ to: postAuthTo });
      return true;
    }

    void (async () => {
      // Explicit PKCE exchange for magic-link / OAuth returns (`?code=` is NOT an invite).
      if (authCodeFromLink) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCodeFromLink);
        if (error) {
          console.warn("auth code exchange", error.message);
          toast.error("That sign-in link expired or was already used. Request a new magic link.");
        } else if (!cancelled) {
          // Drop the one-time code from the URL so refresh doesn't re-exchange.
          window.history.replaceState({}, "", `/auth${modeFromLink ? `?mode=${modeFromLink}` : ""}`);
        }
      }

      if (cancelled) return;
      if (await finishIfSession()) return;
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        toast.message("Choose a new password to finish recovery.");
        return;
      }
      if (event === "SIGNED_IN") {
        void finishIfSession();
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once for auth listener
  }, []);

  function peekStoredRef() {
    try {
      return sessionStorage.getItem(REF_KEY);
    } catch {
      return null;
    }
  }

  /** Validate invite/referral without burning invite uses. */
  async function passGate(): Promise<boolean> {
    const referral = (refFromLink ?? peekStoredRef() ?? "").trim().toUpperCase();
    if (referral) {
      rememberRef(referral);
      const { data } = await supabase.rpc("referral_code_valid", { _code: referral });
      if (data) return true;
    }
    const code = invite.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a valid invite code — or use a founder referral link.");
      return false;
    }
    const { data: ok, error } = await supabase.rpc("check_invite_code", { _code: code });
    if (error) {
      // Fallback if migration not applied yet
      const { data: redeemed, error: redeemErr } = await supabase.rpc("redeem_invite_code", {
        _code: code,
      });
      if (redeemErr) throw redeemErr;
      if (!redeemed) {
        toast.error("That invite code isn't valid — join the waitlist for a seat.");
        return false;
      }
      rememberInvite(code);
      return true;
    }
    if (!ok) {
      toast.error("That invite code isn't valid — join the waitlist for a seat.");
      return false;
    }
    rememberInvite(code);
    return true;
  }

  async function burnInviteIfNeeded() {
    const code = takeStoredInvite() || invite.trim().toUpperCase();
    if (!code) return;
    // Referral path doesn't need invite burn
    const referral = (refFromLink ?? "").trim().toUpperCase();
    if (referral) {
      const { data } = await supabase.rpc("referral_code_valid", { _code: referral });
      if (data) return;
    }
    const { error } = await supabase.rpc("redeem_invite_code", { _code: code });
    if (error) console.warn("invite redeem after signup", error.message);
  }

  async function claimReferral() {
    const referral = takeStoredRef() || (refFromLink ?? "").trim().toUpperCase() || null;
    if (!referral) return;
    const { data } = await supabase.rpc("attribute_referral", { _code: referral });
    if (data) toast.success("Invite applied — 1,000 AURA welcome bonus added.");
  }

  async function afterAuthenticated() {
    await burnInviteIfNeeded();
    await claimReferral();
    trackAppEvent("signup_complete", {});
    navigate({ to: postAuthTo });
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters.");
          return;
        }
        if (!(await passGate())) return;
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (error) throw error;
        if (data.session) {
          await afterAuthenticated();
          return;
        }
        toast.success("Check your email to confirm your account, then sign in.");
        setMode("signin");
        return;
      }

      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        await afterAuthenticated();
        return;
      }

      if (mode === "reset") {
        if (password.length < 6) {
          toast.error("Password must be at least 6 characters.");
          return;
        }
        if (password !== password2) {
          toast.error("Passwords do not match.");
          return;
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        toast.success("Password updated — you're in.");
        await afterAuthenticated();
        return;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink() {
    if (!email.trim()) {
      toast.error("Enter your email first.");
      return;
    }
    setBusy(true);
    try {
      if (magicCreatesUser) {
        if (!(await passGate())) return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: authRedirectUrl(magicCreatesUser ? "signup" : "signin"),
          shouldCreateUser: magicCreatesUser,
        },
      });
      if (error) throw error;
      toast.success("Magic link sent — open it on this device to finish signing in.");
      trackAppEvent("signup_complete", { method: "magic_link" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send magic link");
    } finally {
      setBusy(false);
    }
  }

  async function sendForgot() {
    if (!email.trim()) {
      toast.error("Enter your email first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: authRedirectUrl("reset"),
      });
      if (error) throw error;
      toast.success("Password reset email sent — open the link, then set a new password here.");
      setMode("signin");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    if (mode === "signup") {
      try {
        if (!(await passGate())) return;
      } catch {
        toast.error("Enter a valid invite code before continuing with Google.");
        return;
      }
    }
    rememberRef(refFromLink);
    rememberInvite(invite.trim().toUpperCase() || undefined);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authRedirectUrl(mode === "signup" ? "signup" : "signin"),
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
      // Browser navigates to Google; session is finished on return via getSession().
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed. Try email instead.");
      setBusy(false);
    }
  }

  const title =
    mode === "signup"
      ? "Create your company"
      : mode === "forgot"
        ? "Reset your password"
        : mode === "reset"
          ? "Choose a new password"
          : mode === "magic"
            ? "Magic link"
            : "Welcome back";

  const subtitle =
    mode === "signup"
      ? "Your agents will be hired and briefed the moment you arrive."
      : mode === "forgot"
        ? "We'll email you a link to set a new password."
        : mode === "reset"
          ? "You're recovering your account. Pick a strong password."
          : mode === "magic"
            ? "We'll email a one-click sign-in link. No password needed."
            : "Your agents kept working while you were away.";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden flex-col justify-between p-14 lg:flex">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/15 text-primary">
              ◎
            </span>
            <span className="text-sm font-semibold tracking-tight">Aura OS</span>
          </div>

          <div className="max-w-xl">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.34em] text-primary">
              The AI Company Operating System
            </p>
            <h1 className="text-gradient text-6xl font-semibold leading-[1.02]">
              Don't manage software.
              <br />
              Manage a company.
            </h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground">
              Eight autonomous employees. One shared memory. A business that keeps working while you
              sleep — and tells you what it decided when you wake up.
            </p>

            <div className="glass mt-10 max-w-md rounded-3xl p-5">
              <p className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                <Pulse /> Atlas · Chief Executive
              </p>
              <p className="text-sm leading-relaxed text-foreground/90">
                <StreamText text="Got it. I'm on it — your company is ready when you are." />
              </p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Encrypted. Isolated. Yours alone.</p>
        </div>

        <div className="flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="glass w-full max-w-sm rounded-[2rem] p-8"
          >
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

            {mode !== "forgot" && mode !== "reset" && mode !== "magic" ? (
              <button
                type="button"
                onClick={() => void google()}
                className="mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl border border-border bg-foreground/6 py-3 text-sm font-medium transition-colors hover:bg-foreground/10"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14Z"
                  />
                </svg>
                Continue with Google
              </button>
            ) : null}

            {mode !== "forgot" && mode !== "reset" && mode !== "magic" ? (
              <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-muted-foreground/70">
                <span className="h-px flex-1 bg-border" /> or{" "}
                <span className="h-px flex-1 bg-border" />
              </div>
            ) : (
              <div className="mt-7" />
            )}

            {mode === "forgot" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendForgot();
                }}
                className="space-y-3"
              >
                <input
                  id="auth-email-forgot"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  aria-label="Email"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Send reset link"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Back to sign in
                </button>
              </form>
            ) : mode === "magic" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendMagicLink();
                }}
                className="space-y-3"
              >
                {magicCreatesUser ? (
                  refFromLink ? (
                    <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3 text-sm">
                      <Pulse />
                      <span className="text-muted-foreground">
                        Invited by{" "}
                        <span className="font-semibold uppercase tracking-[0.14em] text-primary">
                          {refFromLink}
                        </span>
                      </span>
                    </div>
                  ) : (
                    <input
                      id="auth-invite-magic"
                      required
                      value={invite}
                      onChange={(e) => setInvite(e.target.value.toUpperCase())}
                      maxLength={32}
                      placeholder="INVITE CODE"
                      aria-label="Invite code"
                      className="w-full rounded-2xl border border-gold/30 bg-gold/8 px-4 py-3 text-sm uppercase tracking-[0.16em] outline-none focus:border-gold/60"
                    />
                  )
                ) : null}
                <input
                  id="auth-email-magic"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  aria-label="Email"
                  autoComplete="email"
                  className="w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40"
                />
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? "Sending…" : "Email me a magic link"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode(magicCreatesUser ? "signup" : "signin")}
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  Prefer password?
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => void submitPassword(e)} className="space-y-3">
                {mode === "signup" && refFromLink ? (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3 text-sm">
                    <Pulse />
                    <span className="text-muted-foreground">
                      Invited by{" "}
                      <span className="font-semibold uppercase tracking-[0.14em] text-primary">
                        {refFromLink}
                      </span>{" "}
                      — your seat is held.
                    </span>
                  </div>
                ) : mode === "signup" ? (
                  <input
                    id="auth-invite"
                    required
                    value={invite}
                    onChange={(e) => setInvite(e.target.value.toUpperCase())}
                    maxLength={32}
                    placeholder="INVITE CODE"
                    aria-label="Invite code"
                    autoComplete="one-time-code"
                    className="w-full rounded-2xl border border-gold/30 bg-gold/8 px-4 py-3 text-sm uppercase tracking-[0.16em] outline-none transition-colors placeholder:tracking-[0.16em] placeholder:text-muted-foreground/70 focus:border-gold/60"
                  />
                ) : null}

                {mode !== "reset" ? (
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    aria-label="Email"
                    autoComplete="email"
                    className="w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/40"
                  />
                ) : null}

                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "reset" ? "New password" : "Password"}
                  aria-label={mode === "reset" ? "New password" : "Password"}
                  autoComplete={mode === "signup" || mode === "reset" ? "new-password" : "current-password"}
                  className="w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary/40"
                />

                {mode === "reset" ? (
                  <input
                    id="auth-password2"
                    type="password"
                    required
                    minLength={6}
                    value={password2}
                    onChange={(e) => setPassword2(e.target.value)}
                    placeholder="Confirm new password"
                    aria-label="Confirm new password"
                    autoComplete="new-password"
                    className="w-full rounded-2xl border border-border bg-foreground/5 px-4 py-3 text-sm outline-none focus:border-primary/40"
                  />
                ) : null}

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  {busy
                    ? mode === "reset"
                      ? "Updating…"
                      : "Waking your agents…"
                    : mode === "signup"
                      ? "Start the company"
                      : mode === "reset"
                        ? "Save new password"
                        : "Sign in"}
                </button>
              </form>
            )}

            {mode === "signin" ? (
              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode("forgot")}
                  className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setMagicCreatesUser(false);
                    setMode("magic");
                  }}
                  className="w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                >
                  Email me a magic link instead
                </button>
              </div>
            ) : null}

            {mode === "signup" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMagicCreatesUser(true);
                  setMode("magic");
                }}
                className="mt-3 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                Prefer a magic link? Continue without a password
              </button>
            ) : null}

            {mode === "signup" || mode === "signin" ? (
              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="mt-5 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {mode === "signup"
                  ? "Already have a company? Sign in"
                  : "New here? Create your company"}
              </button>
            ) : null}

            {mode === "reset" ? (
              <button
                type="button"
                onClick={() => setMode("signin")}
                className="mt-5 w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Back to sign in
              </button>
            ) : null}
          </motion.div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}

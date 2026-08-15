import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import type { AuthChangeEvent, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import { captureAttribution, peekFunnel, rememberFunnel, rememberLocale } from "@/lib/attribution";
import { trackTeaser } from "@/lib/teaser-track";
import { trackAppEvent } from "@/lib/app-track";
import { AuraLogo } from "@/components/aura/aura-logo";
import { Pulse } from "@/components/aura/primitives";
import { StreamText } from "@/components/aura/stream-text";
import { SiteFooter } from "@/components/aura/site-footer";
import { startFoundingSeatCheckout } from "@/lib/founding-seat";
import { isFunnelId, type FunnelId } from "@/lib/funnels";
import { isSafeNachbarPath } from "@/lib/nachbar-play";
import { OG_IMAGE, SITE_URL } from "@/lib/site";

type AuthMode = "signin" | "signup" | "forgot" | "reset" | "magic";

const SAFE_NEXT = new Set(["/console", "/missions", "/akquise", "/trading", "/onboarding"]);
/** Accounts newer than this are treated as first-time signups for invite burn. */
const NEW_USER_WINDOW_MS = 2 * 60 * 1000;

type PostAuthDest =
  | "/console"
  | "/missions"
  | "/akquise"
  | "/trading"
  | "/onboarding"
  | `/nachbar${string}`
  | `/i/fc/${string}`
  | `/oauth/consent?${string}`;

function isNachbarNext(next?: string): next is `/nachbar${string}` {
  return isSafeNachbarPath(next);
}

function isBuilderInviteNext(next?: string): next is `/i/fc/${string}` {
  if (!next) return false;
  try {
    const u = new URL(next, SITE_URL);
    return /^\/i\/fc\/\d+$/.test(u.pathname);
  } catch {
    return false;
  }
}

/** Same-origin return to Supabase OAuth Server consent UI. */
function oauthConsentReturn(next?: string): PostAuthDest | null {
  if (!next || !next.startsWith("/oauth/consent")) return null;
  try {
    const url = new URL(next, SITE_URL);
    if (url.origin !== SITE_URL || url.pathname !== "/oauth/consent") return null;
    const id = url.searchParams.get("authorization_id");
    if (!id) return null;
    return `/oauth/consent?authorization_id=${encodeURIComponent(id)}`;
  } catch {
    return null;
  }
}

function safeNextPath(next?: string): PostAuthDest {
  const consent = oauthConsentReturn(next);
  if (consent) return consent;
  if (isNachbarNext(next)) return next;
  if (isBuilderInviteNext(next)) return next;
  if (next && SAFE_NEXT.has(next)) {
    return next as PostAuthDest;
  }
  return "/console";
}

function isNewUser(user: User): boolean {
  const created = Date.parse(user.created_at);
  if (Number.isNaN(created)) return false;
  return Date.now() - created < NEW_USER_WINDOW_MS;
}

/** Short founder invite codes — not Supabase PKCE `code` values (long opaque strings). */
function looksLikeInviteCode(value: string): boolean {
  return /^[A-Za-z0-9_]{3,32}$/.test(value.trim());
}

function defaultAuthMode(opts: {
  mode?: AuthMode;
  invite?: string;
  ref?: string;
  buy?: string;
}): AuthMode {
  if (opts.mode) return opts.mode;
  if (opts.invite || opts.ref || opts.buy === "seat") return "signup";
  return "signin";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    invite?: string;
    code?: string;
    ref?: string;
    mode?: AuthMode;
    next?: string;
    seat?: "success" | "cancel";
    funnel?: FunnelId;
    lang?: "de" | "en";
    buy?: "seat";
  } => {
    const inviteRaw =
      typeof search["invite"] === "string"
        ? search["invite"]
        : typeof search["code"] === "string" && looksLikeInviteCode(search["code"])
          ? search["code"]
          : undefined;
    const funnelRaw = typeof search["funnel"] === "string" ? search["funnel"] : undefined;
    const langRaw = typeof search["lang"] === "string" ? search["lang"].toLowerCase() : undefined;
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
      ...(search["seat"] === "success" || search["seat"] === "cancel"
        ? { seat: search["seat"] as "success" | "cancel" }
        : {}),
      ...(funnelRaw && isFunnelId(funnelRaw) ? { funnel: funnelRaw } : {}),
      ...(langRaw === "de" || langRaw === "en" ? { lang: langRaw } : {}),
      ...(search["buy"] === "seat" ? { buy: "seat" as const } : {}),
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

function peekStoredInvite() {
  try {
    return sessionStorage.getItem(INVITE_KEY);
  } catch {
    return null;
  }
}

function authRedirectUrl(mode?: AuthMode, next?: string) {
  // Prefer canonical production origin so magic-link / OAuth emails always hit the allowlist.
  // Localhost keeps window origin so local Docker auth still works.
  const host = typeof window !== "undefined" ? window.location.hostname : "";
  const origin = host === "localhost" || host === "127.0.0.1" ? window.location.origin : SITE_URL;
  const params = new URLSearchParams();
  if (mode) params.set("mode", mode);
  const consent = oauthConsentReturn(next);
  if (consent) params.set("next", consent);
  const q = params.toString();
  return q ? `${origin}/auth?${q}` : `${origin}/auth`;
}

async function resolvePostAuthPath(explicitNext?: string): Promise<PostAuthDest> {
  const consent = oauthConsentReturn(explicitNext);
  if (consent) return consent;

  // Patron app: never force company onboarding.
  if (isNachbarNext(explicitNext)) return explicitNext;
  if (isBuilderInviteNext(explicitNext)) return explicitNext;

  if (explicitNext && explicitNext !== "/console" && SAFE_NEXT.has(explicitNext)) {
    return explicitNext as PostAuthDest;
  }

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return safeNextPath(explicitNext);

  const { data: companies } = await supabase
    .from("companies")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1);

  const companyId = companies?.[0]?.id;
  if (!companyId) return "/onboarding";

  const { data: progress } = await supabase
    .from("founder_progress")
    .select("onboarded")
    .eq("company_id", companyId)
    .maybeSingle();

  if (!progress || !progress.onboarded) return "/onboarding";
  return safeNextPath(explicitNext);
}

function AuthPage() {
  const navigate = useNavigate();
  const {
    invite: inviteFromLink,
    code: authCodeFromLink,
    ref: refFromLink,
    mode: modeFromLink,
    next: nextFromLink,
    seat: seatFromLink,
    funnel: funnelFromLink,
    lang: langFromLink,
    buy: buyFromLink,
  } = Route.useSearch();
  const entryFunnel: FunnelId =
    funnelFromLink && isFunnelId(funnelFromLink) ? funnelFromLink : peekFunnel();
  /** Explicit ?funnel= from a /for/* CTA — skips founding-seat gate. Browsing alone does not. */
  const isFunnelEntry = Boolean(funnelFromLink && funnelFromLink !== "os");
  const isLokalEntry = entryFunnel === "local";
  const [invite, setInvite] = useState(inviteFromLink ?? "");
  const [mode, setMode] = useState<AuthMode>(() =>
    defaultAuthMode({
      ...(modeFromLink ? { mode: modeFromLink } : isFunnelEntry ? { mode: "signup" } : {}),
      ...(inviteFromLink ? { invite: inviteFromLink } : {}),
      ...(refFromLink ? { ref: refFromLink } : {}),
      ...(buyFromLink ? { buy: buyFromLink } : {}),
    }),
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [busy, setBusy] = useState(false);
  /** Magic link from signup creates users; from sign-in it must not. */
  const [magicCreatesUser, setMagicCreatesUser] = useState(
    Boolean(inviteFromLink || refFromLink || buyFromLink === "seat"),
  );
  /** Signed in without a seat — show checkout CTA (invite optional). */
  const [needsInviteToContinue, setNeedsInviteToContinue] = useState(false);

  const finishingRef = useRef(false);
  const postAuthDoneRef = useRef(false);
  const cancelledRef = useRef(false);
  const modeFromLinkRef = useRef(modeFromLink);
  const nextFromLinkRef = useRef(nextFromLink);
  const refFromLinkRef = useRef(refFromLink);
  modeFromLinkRef.current = modeFromLink;
  nextFromLinkRef.current = nextFromLink;
  refFromLinkRef.current = refFromLink;

  useEffect(() => {
    if (modeFromLink) setMode(modeFromLink);
  }, [modeFromLink]);

  useEffect(() => {
    rememberRef(refFromLink);
    if (inviteFromLink) {
      setInvite(inviteFromLink);
      rememberInvite(inviteFromLink);
    }
    if (funnelFromLink && isFunnelId(funnelFromLink)) {
      rememberFunnel(funnelFromLink);
    }
    if (funnelFromLink === "local") {
      rememberLocale(langFromLink === "en" ? "en" : "de");
    } else if (langFromLink === "de" || langFromLink === "en") {
      rememberLocale(langFromLink);
    }
    captureAttribution();
    trackTeaser("signup_view", { placement: isFunnelEntry ? `auth:${entryFunnel}` : "auth" });

    cancelledRef.current = false;

    void (async () => {
      // detectSessionInUrl already exchanges PKCE on init. Only retry if still no session.
      if (authCodeFromLink) {
        const { data: early } = await supabase.auth.getSession();
        if (!early.session) {
          const { error } = await supabase.auth.exchangeCodeForSession(authCodeFromLink);
          if (error) {
            console.warn("auth code exchange", error.message);
            const { data: after } = await supabase.auth.getSession();
            if (!after.session && !cancelledRef.current) {
              toast.error(
                "That sign-in link expired or was already used. Request a new magic link.",
              );
            }
          }
        }
        if (!cancelledRef.current) {
          window.history.replaceState(
            {},
            "",
            `/auth${modeFromLinkRef.current ? `?mode=${modeFromLinkRef.current}` : ""}`,
          );
        }
      }

      if (cancelledRef.current) return;
      await finishPostAuth("mount");
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event: AuthChangeEvent) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        toast.message("Choose a new password to finish recovery.");
        return;
      }
      if (event === "SIGNED_IN") {
        void finishPostAuth("signed_in");
      }
    });

    return () => {
      cancelledRef.current = true;
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

  /** Optional invite / founder link (open sale — checkout does not require a code). */
  async function passGate(): Promise<boolean> {
    if (isFunnelEntry) return true;
    const referral = (refFromLinkRef.current ?? peekStoredRef() ?? "").trim().toUpperCase();
    if (referral) {
      rememberRef(referral);
      const { data } = await supabase.rpc("referral_code_valid", { _code: referral });
      if (data) {
        rememberInvite(referral);
        return true;
      }
    }
    const code = invite.trim().toUpperCase();
    if (!code) return true;
    const { data: ok, error } = await supabase.rpc("check_invite_code", { _code: code });
    if (error) {
      console.warn("check_invite_code", error.message);
      toast.error("Could not validate invite — try again, or continue without one.");
      return false;
    }
    if (!ok) {
      toast.error("That invite isn't valid — clear it or buy without an invite.");
      return false;
    }
    rememberInvite(code);
    return true;
  }

  /**
   * Seat gate: paid founding seat (or legacy company).
   * Open sale — send new accounts to $99 Stripe checkout. Invite is optional attribution.
   */
  async function ensureSeatOrCheckout(user: User): Promise<"ok" | "need_invite" | "checkout"> {
    if (isFunnelEntry) {
      rememberFunnel(funnelFromLink!);
      takeStoredInvite();
      takeStoredRef();
      return "ok";
    }

    const { data: hasSeat } = await supabase.rpc("user_has_company_seat", { _uid: user.id });
    if (hasSeat) {
      return "ok";
    }

    const { data: existingCompany } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .limit(1)
      .maybeSingle();
    if (existingCompany) {
      return "ok";
    }

    const code =
      invite.trim().toUpperCase() ||
      peekStoredInvite() ||
      (refFromLinkRef.current ?? peekStoredRef() ?? "").trim().toUpperCase() ||
      "" ||
      null;

    if (code) {
      const { data: inviteOk } = await supabase.rpc("check_invite_code", { _code: code });
      const { data: refOk } = inviteOk
        ? { data: true }
        : await supabase.rpc("referral_code_valid", { _code: code });
      if (inviteOk || refOk) {
        rememberInvite(code);
      }
      // Invalid invite: still allow open checkout without burning a bad code.
    }

    try {
      const url = await startFoundingSeatCheckout(code);
      window.location.href = url;
      return "checkout";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start founding seat checkout");
      return "need_invite";
    }
  }

  async function finishPostAuth(reason: "mount" | "signed_in" | "submit") {
    if (postAuthDoneRef.current || finishingRef.current || cancelledRef.current) return false;
    finishingRef.current = true;
    try {
      const { data } = await supabase.auth.getSession();
      if (cancelledRef.current || !data.session?.user) return false;

      const user = data.session.user;
      const hash = typeof window !== "undefined" ? window.location.hash : "";
      if (hash.includes("type=recovery") || modeFromLinkRef.current === "reset") {
        setMode("reset");
        return true;
      }

      if (seatFromLink === "success") {
        // Webhook may lag a moment — poll seat briefly before gating again.
        for (let i = 0; i < 8; i++) {
          const { data: hasSeat } = await supabase.rpc("user_has_company_seat", {
            _uid: user.id,
          });
          if (hasSeat) break;
          await new Promise((r) => setTimeout(r, 500));
        }
        toast.success("Founding seat unlocked — welcome.");
      }

      const gate = await ensureSeatOrCheckout(user);
      if (gate === "checkout") return true;
      if (gate === "need_invite") {
        setNeedsInviteToContinue(true);
        setMode("signup");
        setMagicCreatesUser(true);
        toast.message("Complete $99 founding-seat checkout to open your company.");
        return false;
      }

      setNeedsInviteToContinue(false);
      const storedInvite = (
        invite.trim() ||
        peekStoredInvite() ||
        (refFromLinkRef.current ?? peekStoredRef() ?? "")
      )
        .trim()
        .toUpperCase();
      if (storedInvite && looksLikeInviteCode(storedInvite)) {
        const { error: redeemErr } = await supabase.rpc("redeem_invite_code", {
          _code: storedInvite,
        });
        if (redeemErr) console.warn("redeem_invite_code", redeemErr.message);
      }
      takeStoredInvite();
      takeStoredRef();
      if (isNewUser(user)) {
        trackAppEvent("signup_complete", { method: reason });
      }

      const dest = await resolvePostAuthPath(nextFromLinkRef.current);
      postAuthDoneRef.current = true;
      if (!cancelledRef.current) {
        if (dest.startsWith("/oauth/consent") || dest.startsWith("/i/fc/")) {
          window.location.assign(dest);
        } else {
          navigate({
            to: dest as "/console" | "/missions" | "/akquise" | "/trading" | "/onboarding",
          });
        }
      }
      return true;
    } finally {
      finishingRef.current = false;
    }
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

        // Already signed in (e.g. Google) but still needs invite — just finish.
        const { data: existing } = await supabase.auth.getSession();
        if (existing.session && (needsInviteToContinue || isNewUser(existing.session.user))) {
          rememberInvite(invite.trim().toUpperCase() || peekStoredInvite() || undefined);
          await finishPostAuth("submit");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authRedirectUrl() },
        });
        if (error) throw error;
        if (data.session) {
          await finishPostAuth("submit");
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
        await finishPostAuth("submit");
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
        await finishPostAuth("submit");
        return;
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Something went wrong";
      const lower = raw.toLowerCase();
      if (lower.includes("rate limit") || lower.includes("email limit")) {
        toast.error(
          "Email limit reached — wait a few minutes, or raise Auth → Rate Limits in the Supabase dashboard.",
        );
      } else {
        toast.error(raw);
      }
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
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Could not send magic link";
      const lower = raw.toLowerCase();
      if (lower.includes("rate limit") || lower.includes("email limit")) {
        toast.error(
          "Email limit reached — wait a few minutes, or raise Auth → Rate Limits in the Supabase dashboard.",
        );
      } else {
        toast.error(raw);
      }
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
      const raw = err instanceof Error ? err.message : "Could not send reset email";
      const lower = raw.toLowerCase();
      if (lower.includes("rate limit") || lower.includes("email limit")) {
        toast.error(
          "Email limit reached — wait a few minutes, or raise Auth → Rate Limits in the Supabase dashboard.",
        );
      } else {
        toast.error(raw);
      }
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    // Optional invite attribution; open sale does not require a code.
    if (mode === "signup") {
      try {
        if (!(await passGate())) return;
      } catch {
        toast.error("Could not validate invite — clear it and continue.");
        return;
      }
    }
    rememberRef(refFromLink);
    rememberInvite(invite.trim().toUpperCase() || undefined);
    setBusy(true);
    try {
      // VPS / custom host: use Supabase Google OAuth (Lovable's /~oauth/initiate is Cloud-only).
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authRedirectUrl(
            mode === "signup" ? "signup" : "signin",
            nextFromLinkRef.current,
          ),
          queryParams: { access_type: "offline", prompt: "consent" },
          skipBrowserRedirect: true,
        },
      });
      if (error) {
        const lower = error.message.toLowerCase();
        if (lower.includes("provider is not enabled") || lower.includes("unsupported provider")) {
          throw new Error(
            "Google sign-in is not enabled on this project yet. Use email + password or a magic link for now.",
          );
        }
        throw error;
      }
      if (!data.url) {
        throw new Error("Google sign-in did not return a redirect URL.");
      }
      window.location.assign(data.url);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed. Try email instead.");
      setBusy(false);
    }
  }

  const title =
    mode === "signup"
      ? needsInviteToContinue
        ? "One more step"
        : isLokalEntry
          ? "Betrieb anlegen"
          : "Create your company"
      : mode === "forgot"
        ? "Reset your password"
        : mode === "reset"
          ? "Choose a new password"
          : mode === "magic"
            ? "Magic link"
            : isLokalEntry
              ? "Willkommen zurück"
              : "Welcome back";

  const subtitle =
    mode === "signup"
      ? needsInviteToContinue
        ? "Your account is ready — pay $99 to unlock your founding seat."
        : isLokalEntry
          ? "Danach: Betriebsname, Stadt, freischalten. Kein AI-OS-Pitch."
          : "Your agents will be hired and briefed the moment you arrive."
      : mode === "forgot"
        ? "We'll email you a link to set a new password."
        : mode === "reset"
          ? "You're recovering your account. Pick a strong password."
          : mode === "magic"
            ? "We'll email a one-click sign-in link. No password needed."
            : isLokalEntry
              ? "Weiter zu Sterne, Gäste und Nachbetreuung."
              : "Your agents kept working while you were away.";

  return (
    <div className="flex min-h-screen flex-col">
      <div className="grid flex-1 lg:grid-cols-[1.1fr_1fr]">
        <div className="relative hidden items-center justify-end px-10 py-14 lg:flex xl:px-14 2xl:px-20">
          <div className="flex h-full w-full max-w-xl flex-col justify-between xl:mr-8">
            <AuraLogo
              size="sm"
              label={isLokalEntry ? "Aura Lokal" : "Aura OS"}
            />

            <div>
              <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.34em] text-primary">
                {isLokalEntry ? "Für lokale Betriebe" : "The AI Company Operating System"}
              </p>
              <h1 className="text-gradient text-6xl font-semibold leading-[1.02]">
                {isLokalEntry ? (
                  <>
                    Mehr echte Sterne.
                    <br />
                    Bessere Nachbetreuung.
                  </>
                ) : (
                  <>
                    Don't manage software.
                    <br />
                    Manage a company.
                  </>
                )}
              </h1>
              <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground">
                {isLokalEntry
                  ? "Konto anlegen → Betrieb benennen → Aura Reputation freischalten. Dann Google-Bewertungen von echten Kunden anfragen."
                  : "Eight autonomous employees. One shared memory. A business that keeps working while you sleep — and tells you what it decided when you wake up."}
              </p>

              <div className="glass mt-10 max-w-md rounded-3xl p-5">
                <p className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  <Pulse /> {isLokalEntry ? "Aura Reputation" : "Atlas · Chief Executive"}
                </p>
                <p className="text-sm leading-relaxed text-foreground/90">
                  <StreamText
                    text={
                      isLokalEntry
                        ? "49 €/Monat oder Barzahlungs-Code — dann Sterne und Gäste."
                        : "Got it. I'm on it — your company is ready when you are."
                    }
                  />
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              {isLokalEntry
                ? "Einfach. Für den Laden. Keine Fake-Sterne."
                : "Encrypted. Isolated. Yours alone."}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center p-6 sm:p-8 lg:justify-start lg:pl-4 xl:pl-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="glass w-full max-w-sm rounded-[2rem] p-8 shadow-[var(--shadow-glow)]"
          >
            <AuraLogo size="xs" className="mb-5 lg:hidden" />
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

            {mode !== "forgot" && mode !== "reset" && mode !== "magic" && !needsInviteToContinue ? (
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
                {isLokalEntry ? "Weiter mit Google" : "Continue with Google"}
              </button>
            ) : null}

            {mode !== "forgot" && mode !== "reset" && mode !== "magic" && !needsInviteToContinue ? (
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
                {magicCreatesUser && !isFunnelEntry && (refFromLink || invite) ? (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3 text-sm">
                    <Pulse />
                    <span className="text-muted-foreground">
                      Friend code attached ·{" "}
                      <span className="font-semibold uppercase tracking-[0.14em] text-primary">
                        {refFromLink || invite}
                      </span>
                    </span>
                  </div>
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
            ) : needsInviteToContinue ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void (async () => {
                    setBusy(true);
                    try {
                      if (!(await passGate())) return;
                      await finishPostAuth("submit");
                    } finally {
                      setBusy(false);
                    }
                  })();
                }}
                className="space-y-3"
              >
                <p className="rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
                  You&apos;re signed in. Pay $99 once — seat unlocks after Stripe. No invite needed.
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  {busy ? "Opening Stripe…" : "Buy founding seat — $99"}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => void submitPassword(e)} className="space-y-3">
                {mode === "signup" && refFromLink && !isFunnelEntry ? (
                  <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3 text-sm">
                    <Pulse />
                    <span className="text-muted-foreground">
                      Friend code ·{" "}
                      <span className="font-semibold uppercase tracking-[0.14em] text-primary">
                        {refFromLink}
                      </span>{" "}
                      — next step is $99 checkout.
                    </span>
                  </div>
                ) : mode === "signup" && isLokalEntry ? (
                  <p className="rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
                    Aura Lokal · Anmeldung — danach Betrieb benennen und freischalten.
                  </p>
                ) : mode === "signup" && isFunnelEntry ? (
                  <p className="rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
                    Funnel signup — pick a plan after you wake the company.
                  </p>
                ) : mode === "signup" && buyFromLink === "seat" ? (
                  <p className="rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-3 text-[13px] leading-relaxed text-muted-foreground">
                    After signup we open Stripe for your $99 founding seat.
                  </p>
                ) : null}

                {mode !== "reset" ? (
                  <input
                    id="auth-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={isLokalEntry ? "du@betrieb.de" : "you@company.com"}
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
                  placeholder={
                    mode === "reset" ? "New password" : isLokalEntry ? "Passwort" : "Password"
                  }
                  aria-label={mode === "reset" ? "New password" : "Password"}
                  autoComplete={
                    mode === "signup" || mode === "reset" ? "new-password" : "current-password"
                  }
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
                      : isLokalEntry
                        ? "Einen Moment…"
                        : "Waking your agents…"
                    : mode === "signup"
                      ? isLokalEntry
                        ? "Konto anlegen"
                        : "Start the company"
                      : mode === "reset"
                        ? "Save new password"
                        : isLokalEntry
                          ? "Anmelden"
                          : "Sign in"}
                </button>
                {mode === "signup" ? (
                  <p className="pt-1 text-center text-[11px] leading-relaxed text-muted-foreground">
                    {isLokalEntry ? (
                      <>
                        Mit dem Weiterkommen akzeptierst du{" "}
                        <Link to="/terms" className="text-primary hover:underline">
                          AGB
                        </Link>
                        ,{" "}
                        <Link to="/privacy" className="text-primary hover:underline">
                          Datenschutz
                        </Link>{" "}
                        und{" "}
                        <Link to="/cookies" className="text-primary hover:underline">
                          Cookies
                        </Link>
                        . Aura Reputation: 49 €/Monat oder Barzahlungs-Code.
                      </>
                    ) : (
                      <>
                        By continuing you agree to our{" "}
                        <Link to="/terms" className="text-primary hover:underline">
                          Terms / AGB
                        </Link>
                        ,{" "}
                        <Link to="/privacy" className="text-primary hover:underline">
                          Privacy
                        </Link>
                        , and{" "}
                        <Link to="/cookies" className="text-primary hover:underline">
                          Cookies
                        </Link>
                        . Founding seats are paid via Stripe Checkout ($99 one-time).
                      </>
                    )}
                  </p>
                ) : null}
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

            {mode === "signup" && !needsInviteToContinue ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setMagicCreatesUser(true);
                  setMode("magic");
                }}
                className="mt-3 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {isLokalEntry
                  ? "Lieber Magic Link? Ohne Passwort weiter"
                  : "Prefer a magic link? Continue without a password"}
              </button>
            ) : null}

            {(mode === "signup" || mode === "signin") && !needsInviteToContinue ? (
              <button
                type="button"
                onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
                className="mt-5 w-full text-center text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                {mode === "signup"
                  ? isLokalEntry
                    ? "Schon Konto? Anmelden"
                    : "Already have a company? Sign in"
                  : isLokalEntry
                    ? "Neu hier? Betrieb anlegen"
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

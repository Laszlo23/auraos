import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/aura/legal-page";
import { LEGAL_EMAIL, LEGAL_ENTITY, OG_IMAGE, SITE_NAME, SUPPORT_EMAIL, url } from "@/lib/site";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: `Cookie Policy — ${SITE_NAME}` },
      {
        name: "description",
        content: `How ${SITE_NAME} uses cookies and local storage, including Stripe Checkout.`,
      },
      { property: "og:title", content: `Cookie Policy — ${SITE_NAME}` },
      { property: "og:description", content: "Cookies and local storage on Aura OS." },
      { property: "og:url", content: url("/cookies") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url("/cookies") }],
  }),
  component: CookiesPage,
});

function CookiesPage() {
  return (
    <LegalPage
      title="Cookie Policy"
      description={`What ${SITE_NAME} (${LEGAL_ENTITY}) stores in your browser on aibusiness.fun — including payment flows.`}
    >
      <LegalSection title="1. Essential">
        <p>
          We use cookies and similar storage required to keep you signed in, protect sessions, and
          complete invite / OAuth flows. Without these, the product cannot function securely.
        </p>
      </LegalSection>

      <LegalSection title="2. Preferences">
        <p>
          Local storage may remember UI choices such as Simple vs Full mode, onboarding tour state,
          and reduced-motion preferences so the interface stays consistent across visits.
        </p>
      </LegalSection>

      <LegalSection title="3. Attribution">
        <p>
          Anonymous teaser and referral markers may be stored briefly so we can attribute
          founding-cohort growth when someone arrives via a shared link. These do not identify you
          by name until you create an account.
        </p>
      </LegalSection>

      <LegalSection title="4. Payments (Stripe Checkout)">
        <p>
          When you buy a founding seat or other product, you are redirected to{" "}
          <strong className="text-foreground">Stripe Checkout</strong>. Stripe may set cookies and
          use local storage necessary to process payment, prevent fraud, remember locale/currency
          formatting, and complete the session. Those cookies are controlled by Stripe under their
          policies. We receive payment confirmation and metadata needed to unlock your seat — not
          your full card number.
        </p>
      </LegalSection>

      <LegalSection title="5. Analytics">
        <p>
          If analytics (e.g. Google Analytics / gtag) is enabled on the marketing site, it may set
          cookies or similar identifiers to measure traffic. Where required by law we treat
          non-essential analytics as optional.
        </p>
      </LegalSection>

      <LegalSection title="6. Third-party OAuth">
        <p>
          When you connect Google, Microsoft, X, LinkedIn, Meta, TikTok, or Farcaster, those
          providers may set their own cookies during OAuth. Their policies apply to that part of
          the flow.
        </p>
      </LegalSection>

      <LegalSection title="7. Control">
        <p>
          You can clear cookies and site data in your browser settings. Doing so will sign you out
          and reset local preferences. More detail on personal data is in our{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          . Questions:{" "}
          <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/aura/legal-page";
import { LEGAL_EMAIL, OG_IMAGE, SITE_NAME, url } from "@/lib/site";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: `Cookie Policy — ${SITE_NAME}` },
      {
        name: "description",
        content: `How ${SITE_NAME} uses cookies and local storage on aibusiness.fun.`,
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
      description={`What ${SITE_NAME} stores in your browser on aibusiness.fun.`}
    >
      <LegalSection title="Essential">
        <p>
          We use cookies and similar storage required to keep you signed in, protect sessions, and
          route you through invite and OAuth flows. Without these, the product cannot function
          securely.
        </p>
      </LegalSection>

      <LegalSection title="Preferences">
        <p>
          Local storage may remember UI choices such as Simple vs Full mode, onboarding tour state,
          and reduced-motion preferences so the interface stays consistent across visits.
        </p>
      </LegalSection>

      <LegalSection title="Attribution">
        <p>
          Anonymous teaser and referral markers may be stored briefly so we can attribute founding-
          cohort growth when someone arrives via a shared link. These do not identify you by name
          until you create an account.
        </p>
      </LegalSection>

      <LegalSection title="Third parties">
        <p>
          When you connect Google, Microsoft, X, LinkedIn, or Meta, those providers may set their
          own cookies during OAuth. Their policies apply to that part of the flow. Analytics or
          payment processors (if enabled) may set their own essential cookies.
        </p>
      </LegalSection>

      <LegalSection title="Control">
        <p>
          You can clear cookies and site data in your browser settings. Doing so will sign you out
          and reset local preferences. For questions:{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/aura/legal-page";
import { LEGAL_EMAIL, OG_IMAGE, SITE_NAME, SITE_URL, url } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy — ${SITE_NAME}` },
      {
        name: "description",
        content: `How ${SITE_NAME} collects, uses, and protects your data at aibusiness.fun.`,
      },
      { property: "og:title", content: `Privacy Policy — ${SITE_NAME}` },
      { property: "og:description", content: "How we handle your data." },
      { property: "og:url", content: url("/privacy") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url("/privacy") }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description={`This policy explains what ${SITE_NAME} (${SITE_URL.replace("https://", "")}) collects when you use the product, and how we use it.`}
    >
      <LegalSection title="Who we are">
        <p>
          {SITE_NAME} is an invite-only AI company operating system operated at {SITE_URL}. Contact
          us at{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <p>Depending on how you use Aura OS, we may process:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account details such as email address, display name, and claimed @handle.</li>
          <li>Company profile data you enter (name, strategy, products, tasks, knowledge).</li>
          <li>
            Connected service credentials (mailbox, social channels, wallets) stored encrypted for
            your agents to act on your behalf.
          </li>
          <li>
            Usage and product analytics (page views, teaser funnel events, feature events) to
            improve the product.
          </li>
          <li>
            Payment and ledger records for AURA allowances, x402 calls, and billing when enabled.
          </li>
          <li>Technical logs necessary to operate APIs, authentication, and abuse prevention.</li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use data">
        <p>We use this information to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide and secure the {SITE_NAME} product and your company workspace.</li>
          <li>Run AI agents, tasks, outreach, and channel publishing you enable.</li>
          <li>Attribute referrals, contests, and founding-cohort progress.</li>
          <li>Communicate about access, invites, security, and product changes.</li>
          <li>Comply with law and protect the service against abuse.</li>
        </ul>
        <p>We do not sell your personal data.</p>
      </LegalSection>

      <LegalSection title="Connected accounts">
        <p>
          When you connect Google Mail, Outlook, X, LinkedIn, Meta, TikTok, or Farcaster, we store
          the tokens needed for the features you turn on (send mail, publish, reply). You can
          disconnect channels at any time from Connect or Channels; we then stop using those
          credentials for new actions.
        </p>
      </LegalSection>

      <LegalSection title="Cookies & local storage">
        <p>
          We use essential cookies and local storage for authentication, session continuity, and
          anonymous funnel attribution. See the{" "}
          <Link to="/cookies" className="text-primary hover:underline">
            Cookies
          </Link>{" "}
          page for detail.
        </p>
      </LegalSection>

      <LegalSection title="Retention">
        <p>
          We retain account and company data while your account is active. You may request deletion
          of your company from Settings; residual backups and legal holds may persist for a limited
          period.
        </p>
      </LegalSection>

      <LegalSection title="Your choices">
        <p>
          You can update profile data in-product, disconnect integrations, and request access or
          deletion by emailing {LEGAL_EMAIL}. Depending on your location, you may have additional
          rights under applicable privacy law.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy as the product evolves. Material changes will be reflected on
          this page with a new “Last updated” date.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

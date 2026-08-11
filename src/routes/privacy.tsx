import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/aura/legal-page";
import {
  BUILDING_CULTURE,
  LEGAL_EMAIL,
  LEGAL_ENTITY,
  OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
  legalAddressDisplay,
  url,
} from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: `Privacy Policy — ${SITE_NAME}` },
      {
        name: "description",
        content: `How ${SITE_NAME} and ${LEGAL_ENTITY} collect, use, and share data, including Stripe payments.`,
      },
      { property: "og:title", content: `Privacy Policy — ${SITE_NAME}` },
      { property: "og:description", content: "How we handle your data and payments." },
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
      description={`This policy explains what ${SITE_NAME} (${SITE_URL.replace("https://", "")}), operated by ${LEGAL_ENTITY}, collects when you use the product — including payments via Stripe.`}
    >
      <LegalSection title="1. Who we are">
        <p>
          Controller: {LEGAL_ENTITY} ({BUILDING_CULTURE.short}), operating {SITE_NAME} at{" "}
          {SITE_URL}. Contact:{" "}
          <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          . Team:{" "}
          <Link to="/team" className="text-primary hover:underline">
            /team
          </Link>
          . Impressum:{" "}
          <Link to="/impressum" className="text-primary hover:underline">
            /impressum
          </Link>
          .
        </p>
        <div className="rounded-2xl border border-border/40 bg-foreground/[0.03] px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
          {legalAddressDisplay().map((line) => (
            <p key={line} className="mt-1 first:mt-0">
              {line}
            </p>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="2. What we collect">
        <p>Depending on how you use Aura OS, we may process:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account details (email, display name, claimed @handle, auth identifiers).</li>
          <li>Company profile data you enter (name, strategy, products, tasks, knowledge).</li>
          <li>
            Connected service credentials (mailbox, social channels, wallets) stored encrypted so
            agents can act on your behalf.
          </li>
          <li>
            Usage and product analytics (page views, funnel events, feature events) to improve the
            product and prevent abuse.
          </li>
          <li>
            Payment records for founding seats and other products: Stripe customer / session IDs,
            amount, currency, status, invoice/receipt metadata, and seat entitlement — not full
            card numbers.
          </li>
          <li>Technical logs for APIs, authentication, webhooks, and fraud prevention.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Payments & Stripe">
        <p>
          Fiat payments are processed by <strong className="text-foreground">Stripe, Inc. and its affiliates</strong>.
          When you open Checkout, Stripe collects payment method details and billing information
          needed to complete the transaction under Stripe&apos;s privacy policy. We receive
          confirmation of payment, limited customer identifiers, and metadata required to unlock
          your founding seat or subscription.
        </p>
        <p>
          We do not store complete card numbers, CVC, or full bank account numbers on Aura OS
          servers. For disputes, refunds, and accounting we retain Stripe payment references and
          entitlement records.
        </p>
        <p>
          Stripe may process data in the United States and other countries with appropriate
          safeguards. See Stripe&apos;s documentation and privacy policy for processor details.
        </p>
      </LegalSection>

      <LegalSection title="4. How we use data">
        <p>We use this information to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Provide and secure {SITE_NAME} and your company workspace.</li>
          <li>Process payments, refunds, chargebacks, and tax-related records.</li>
          <li>Run AI agents, tasks, outreach, and channel publishing you enable.</li>
          <li>Attribute referrals and founding-cohort progress.</li>
          <li>Send transactional email (receipts, security, access, product notices).</li>
          <li>Comply with law and protect the service against abuse and fraud.</li>
        </ul>
        <p>We do not sell your personal data.</p>
      </LegalSection>

      <LegalSection title="5. Legal bases (EEA/UK where applicable)">
        <p>
          Depending on the activity: performance of a contract (account + paid seat), legitimate
          interests (security, product improvement, fraud prevention), consent (optional marketing
          or non-essential cookies where required), and legal obligation (tax, accounting,
          dispute records).
        </p>
      </LegalSection>

      <LegalSection title="6. Connected accounts">
        <p>
          When you connect Google Mail, Outlook, X, LinkedIn, Meta, TikTok, or Farcaster, we store
          the tokens needed for the features you turn on. You can disconnect channels anytime; we
          then stop using those credentials for new actions.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies & local storage">
        <p>
          We use essential cookies and local storage for authentication, sessions, and attribution.
          Stripe Checkout may set its own cookies when you pay. See the{" "}
          <Link to="/cookies" className="text-primary hover:underline">
            Cookie Policy
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Sharing">
        <p>We share data only with:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Processors that run the product (hosting, database, email, auth, AI providers).</li>
          <li>Stripe for payments, fraud tools, and invoicing.</li>
          <li>Authorities when required by law.</li>
        </ul>
        <p>We do not sell personal data to advertisers.</p>
      </LegalSection>

      <LegalSection title="9. Retention">
        <p>
          Account and company data are kept while your account is active. Payment and entitlement
          records are retained as needed for accounting, tax, chargebacks, and legal claims
          (typically several years). You may request deletion from Settings or by emailing{" "}
          {LEGAL_EMAIL}; residual backups and mandatory records may persist for a limited period.
        </p>
      </LegalSection>

      <LegalSection title="10. Your choices">
        <p>
          You can update profile data in-product, disconnect integrations, and request access,
          correction, or deletion by emailing {LEGAL_EMAIL}. Depending on your location you may
          have additional rights (access, erasure, portability, objection, complaint to a
          supervisory authority).
        </p>
      </LegalSection>

      <LegalSection title="11. International transfers">
        <p>
          We and our processors may process data in the EU, US, and other countries. Where required,
          we rely on appropriate safeguards (e.g. standard contractual clauses) with vendors.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes">
        <p>
          We may update this policy as the product evolves. Material changes will be reflected here
          with a new “Last updated” date.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

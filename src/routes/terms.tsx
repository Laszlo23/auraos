import { createFileRoute } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/aura/legal-page";
import { LEGAL_EMAIL, OG_IMAGE, SITE_NAME, SITE_URL, url } from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Service — ${SITE_NAME}` },
      {
        name: "description",
        content: `Terms governing use of ${SITE_NAME} at aibusiness.fun.`,
      },
      { property: "og:title", content: `Terms of Service — ${SITE_NAME}` },
      { property: "og:description", content: "The rules for using Aura OS." },
      { property: "og:url", content: url("/terms") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url("/terms") }],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description={`These terms govern your access to ${SITE_NAME} at ${SITE_URL.replace("https://", "")}.`}
    >
      <LegalSection title="Acceptance">
        <p>
          By creating an account, redeeming an invite, or using {SITE_NAME}, you agree to these
          Terms and our Privacy Policy. If you use the service on behalf of a company, you represent
          that you have authority to bind that company.
        </p>
      </LegalSection>

      <LegalSection title="The product">
        <p>
          {SITE_NAME} is an invite-only operating system for AI-staffed companies. Features may
          include autonomous agents, tasks, outreach, social publishing, metering with AURA,
          contests, and machine-payable APIs (x402). The product is evolving; features may change,
          pause, or be invite-gated.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You are responsible for credentials, connected wallets, and actions taken through your
          company workspace — including actions performed by agents you enable. Keep invites and
          API keys confidential. You must be old enough to form a binding contract in your
          jurisdiction.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You agree not to use {SITE_NAME} to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Violate law, platform policies of connected networks, or third-party rights.</li>
          <li>Spam, harass, or run deceptive outreach or social engagement schemes.</li>
          <li>Attempt to bypass metering, billing, invite gates, or security controls.</li>
          <li>Reverse engineer or abuse APIs in a way that harms the service or other users.</li>
        </ul>
        <p>We may suspend access for abuse or risk to the cohort.</p>
      </LegalSection>

      <LegalSection title="AI outputs">
        <p>
          Agent outputs are probabilistic. You remain responsible for reviewing content before it is
          published, sent, or relied upon for legal, financial, or medical decisions. {SITE_NAME}{" "}
          does not provide professional advice.
        </p>
      </LegalSection>

      <LegalSection title="AURA, billing & x402">
        <p>
          Off-chain AURA balances meter work inside the product. Fiat checkout (when enabled),
          top-ups, and plan changes are subject to the pricing shown in Billing. Machine API
          endpoints may require on-chain USDC payment via x402; settlement depends on network and
          facilitator configuration. Credits and grants are discretionary and may expire.
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p>
          We own {SITE_NAME}, its brand, and the software. You retain rights to content you upload.
          You grant us a license to host and process that content solely to operate the service for
          you.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer & liability">
        <p>
          The service is provided “as is.” To the fullest extent permitted by law, we disclaim
          warranties of merchantability, fitness for a particular purpose, and non-infringement. Our
          aggregate liability arising from these terms is limited to the greater of fees you paid us
          in the prior three months or one hundred US dollars.
        </p>
      </LegalSection>

      <LegalSection title="Termination">
        <p>
          You may stop using the service and delete your company from Settings. We may terminate or
          limit access for breach, inactivity, or shutdown of the beta. Provisions that should
          survive (IP, liability, indemnity) survive termination.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For legal notices:{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}

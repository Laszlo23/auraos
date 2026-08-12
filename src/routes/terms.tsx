import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/aura/legal-page";
import {
  BCC_TOKEN_DISCLAIMER,
  NINTY,
  LEGAL_EMAIL,
  LEGAL_ENTITY,
  OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  SUPPORT_EMAIL,
  legalAddressDisplay,
  url,
} from "@/lib/site";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: `Terms of Service / AGB — ${SITE_NAME}` },
      {
        name: "description",
        content: `Terms of Service (AGB) for ${SITE_NAME}: founding seats, Stripe Checkout, refunds, and acceptable use.`,
      },
      { property: "og:title", content: `Terms of Service / AGB — ${SITE_NAME}` },
      { property: "og:description", content: "The rules for buying and using Aura OS." },
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
      title="Terms of Service / AGB"
      description={`These Terms (Allgemeine Geschäftsbedingungen) govern access to ${SITE_NAME} at ${SITE_URL.replace("https://", "")}, operated by ${LEGAL_ENTITY}.`}
    >
      <LegalSection title="1. Operator & agreement">
        <p>
          {SITE_NAME} is operated by {LEGAL_ENTITY} ({NINTY.short}). By creating an
          account, starting Stripe Checkout, or using the product, you agree to these Terms and our{" "}
          <Link to="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
          . If you act for a company, you represent that you may bind that company.
        </p>
        <div className="rounded-2xl border border-border/40 bg-foreground/[0.03] px-4 py-3 text-[13px] leading-relaxed">
          {legalAddressDisplay().map((line) => (
            <p key={line} className="mt-1 first:mt-0">
              {line}
            </p>
          ))}
        </div>
        <p>
          Team & Impressum:{" "}
          <Link to="/team" className="text-primary hover:underline">
            /team
          </Link>
          {" · "}
          <Link to="/impressum" className="text-primary hover:underline">
            /impressum
          </Link>
          . Support and legal notices:{" "}
          <a className="text-primary hover:underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="1b. Tokens — Aura OS does not run on BCC">
        <p>{BCC_TOKEN_DISCLAIMER}</p>
      </LegalSection>

      <LegalSection title="2. The product">
        <p>
          {SITE_NAME} is software for running an AI-staffed company workspace. Features may include
          autonomous agents, tasks, outreach, social publishing, in-app AURA metering, contests,
          wallets, and machine-payable APIs (x402). The product evolves; features may change, pause,
          or be limited without reducing paid digital access already granted, except as stated in
          these Terms.
        </p>
      </LegalSection>

      <LegalSection title="3. Accounts">
        <p>
          You are responsible for credentials, connected wallets, and actions taken in your
          workspace — including actions by AI agents you enable. Keep invite codes and API keys
          confidential. You must be old enough to form a binding contract where you live.
        </p>
      </LegalSection>

      <LegalSection title="4. Founding seats & digital goods">
        <p>
          A founding seat is a one-time digital product: paid access to wake and operate one
          founding company on {SITE_NAME}. The listed price is{" "}
          <strong className="text-foreground">$99 USD</strong> unless we publish a different price
          before you pay. Seats are capped (currently 1000). Purchase does not grant equity, tokens,
          or investment rights. Token fair launch (if any) is a separate event and not part of the
          founding-seat product.
        </p>
        <p>
          After successful payment, your account is marked with a founding seat and company access
          unlocks. Delivery is electronic / in-product only — there is no physical shipment.
        </p>
      </LegalSection>

      <LegalSection title="5. Payments via Stripe">
        <p>
          Card and other fiat payments for founding seats (and any other listed products) are
          processed by <strong className="text-foreground">Stripe</strong> using Stripe Checkout.
          When you pay, you also agree to Stripe&apos;s terms for payers. We do not store full card
          numbers on our servers; Stripe handles card data as the payment processor.
        </p>
        <p>
          Prices are shown before you confirm. Taxes may apply depending on your location and our
          Stripe Tax / registration settings. Failed, declined, or incomplete checkouts do not grant
          a seat. Chargebacks or payment disputes may result in suspension until resolved.
        </p>
        <p>
          For Stripe Checkout to show our policies correctly, our public business details should
          link to this page and our Privacy Policy (Stripe Dashboard → Settings → Public details /
          Checkout).
        </p>
      </LegalSection>

      <LegalSection title="6. Refund & cancellation policy">
        <p>
          Founding seats are digital access goods. Because access can be granted immediately after
          payment:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            If Checkout fails or you cancel before payment completes, you are not charged and no
            seat is granted.
          </li>
          <li>
            If you were charged in error (duplicate charge, obvious billing glitch) email{" "}
            {SUPPORT_EMAIL} within 14 days with the Stripe receipt; we will refund verified errors.
          </li>
          <li>
            If the product is materially unavailable after a successful payment (we cannot unlock
            your seat), contact us within 14 days for a full refund or restoration of access.
          </li>
          <li>
            Otherwise, founding seats are generally{" "}
            <strong className="text-foreground">non-refundable</strong> once the seat is unlocked,
            to the extent permitted by applicable consumer law. EU/UK consumers may have statutory
            withdrawal rights for digital content; if you request early delivery of digital access,
            you may lose that right once performance begins — we will honor mandatory consumer
            protections that cannot be waived.
          </li>
        </ul>
        <p>
          Refunds, when approved, are issued to the original payment method via Stripe and may take
          several business days to appear on your statement.
        </p>
      </LegalSection>

      <LegalSection title="7. Subscriptions & other products">
        <p>
          If we later offer recurring plans, Local Seat, boost packs, or other digital products, the
          price, billing interval, and cancellation rules shown at Checkout or in Billing apply.
          Recurring plans renew until cancelled in-product or via support, unless stated otherwise.
        </p>
      </LegalSection>

      <LegalSection title="8. AURA, wallets & x402">
        <p>
          Off-chain AURA balances meter compute and work inside the product; they are not cash, not
          a bank deposit, and not redeemable for fiat unless we explicitly say so. Machine API
          endpoints may require on-chain USDC via x402; settlement depends on network conditions and
          facilitator configuration. Credits and grants are discretionary and may expire.
        </p>
      </LegalSection>

      <LegalSection title="9. Acceptable use">
        <p>You agree not to use {SITE_NAME} to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Violate law, platform policies of connected networks, or third-party rights.</li>
          <li>Spam, harass, or run deceptive outreach or engagement schemes.</li>
          <li>Bypass metering, billing, security, or payment controls.</li>
          <li>Abuse APIs, scrape, or interfere with other users&apos; companies.</li>
        </ul>
        <p>We may suspend or terminate access for abuse, fraud risk, or unpaid chargebacks.</p>
      </LegalSection>

      <LegalSection title="10. AI outputs">
        <p>
          Agent outputs are probabilistic. You remain responsible for reviewing content before it is
          published, sent, traded, or relied on for legal, financial, or medical decisions.{" "}
          {SITE_NAME} does not provide professional advice.
        </p>
      </LegalSection>

      <LegalSection title="11. Intellectual property">
        <p>
          We own {SITE_NAME}, its brand, and the software. You retain rights to content you upload.
          You grant us a limited license to host and process that content solely to operate the
          service for you.
        </p>
      </LegalSection>

      <LegalSection title="12. Disclaimer & liability">
        <p>
          The service is provided “as is.” To the fullest extent permitted by law, we disclaim
          warranties of merchantability, fitness for a particular purpose, and non-infringement. Our
          aggregate liability arising from these Terms is limited to the greater of (a) fees you
          paid us for the product giving rise to the claim in the prior three months, or (b) one
          hundred US dollars — except where liability cannot be limited (e.g. willful misconduct or
          mandatory consumer law).
        </p>
      </LegalSection>

      <LegalSection title="13. Termination">
        <p>
          You may stop using the service and delete your company from Settings. We may limit or end
          access for breach, fraud, chargebacks, or shutdown of the service. Sections that should
          survive (IP, payments already due, liability, indemnity) survive termination.
        </p>
      </LegalSection>

      <LegalSection title="14. Changes">
        <p>
          We may update these Terms as the product evolves. Material changes will be reflected on
          this page with a new “Last updated” date. Continued use after the update constitutes
          acceptance, except where local law requires explicit consent.
        </p>
      </LegalSection>

      <LegalSection title="15. Contact">
        <p>
          {LEGAL_ENTITY} · {SITE_NAME} ·{" "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}

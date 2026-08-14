import { createFileRoute, Link } from "@tanstack/react-router";

import { LegalPage, LegalSection } from "@/components/aura/legal-page";
import {
  BCC_TOKEN_DISCLAIMER,
  NINTY,
  FOUNDERS,
  LEGAL_EMAIL,
  LEGAL_ENTITY,
  OG_IMAGE,
  SITE_NAME,
  SITE_URL,
  legalAddressDisplay,
  url,
} from "@/lib/site";

export const Route = createFileRoute("/impressum")({
  head: () => ({
    meta: [
      { title: `Impressum — ${SITE_NAME}` },
      {
        name: "description",
        content: `Legal notice (Impressum) for ${SITE_NAME}, operated by ${LEGAL_ENTITY}.`,
      },
      { property: "og:title", content: `Impressum — ${SITE_NAME}` },
      { property: "og:description", content: "Operator, address, and contact." },
      { property: "og:url", content: url("/impressum") },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: url("/impressum") }],
  }),
  component: ImpressumPage,
});

function ImpressumPage() {
  const addressLines = legalAddressDisplay();
  const named = FOUNDERS.filter((f) => f.name);

  return (
    <LegalPage
      title="Impressum"
      description={`Legal notice for ${SITE_NAME} (${SITE_URL.replace("https://", "")}), operated by ${LEGAL_ENTITY} (${NINTY.short}).`}
    >
      <LegalSection title="Operator">
        <p>
          {SITE_NAME} is operated by <strong className="text-foreground">{LEGAL_ENTITY}</strong>.
        </p>
        <div className="rounded-2xl border border-border/50 bg-foreground/[0.03] px-4 py-3 text-[13.5px] leading-relaxed text-foreground">
          {addressLines.map((line) => (
            <p key={line} className="mt-1 first:mt-0 text-muted-foreground first:text-foreground">
              {line.includes("@") ? (
                <a className="text-primary hover:underline" href={`mailto:${LEGAL_EMAIL}`}>
                  {line}
                </a>
              ) : (
                line
              )}
            </p>
          ))}
        </div>
      </LegalSection>

      <LegalSection title="Responsible for content">
        <p>
          Founder contact for this publication:{" "}
          <strong className="text-foreground">Laszlo Bihary</strong>
          {" · "}
          <a
            className="text-primary hover:underline"
            href="https://www.linkedin.com/in/laszlo-bihary/"
            target="_blank"
            rel="noopener noreferrer"
          >
            LinkedIn
          </a>
          {" · "}
          <a className="text-primary hover:underline" href={`mailto:${LEGAL_EMAIL}`}>
            {LEGAL_EMAIL}
          </a>
          .
        </p>
        <p>
          Public Wien crew (not legal officers):{" "}
          <Link to="/team" className="text-primary hover:underline">
            /team
          </Link>
          {named.length > 1 ? ` · ${named.length} names published` : null}.
        </p>
      </LegalSection>

      <LegalSection title="Product vs tokens">
        <p>{BCC_TOKEN_DISCLAIMER}</p>
        <p>
          See also{" "}
          <Link to="/tokenomics" className="text-primary hover:underline">
            Tokenomics
          </Link>{" "}
          and{" "}
          <Link to="/terms" className="text-primary hover:underline">
            Terms / AGB
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="Dispute resolution">
        <p>
          The European Commission provides a platform for online dispute resolution (ODR):{" "}
          <a
            className="text-primary hover:underline"
            href="https://ec.europa.eu/consumers/odr"
            target="_blank"
            rel="noopener noreferrer"
          >
            ec.europa.eu/consumers/odr
          </a>
          . We are not obligated to participate in consumer arbitration boards unless required by
          law.
        </p>
      </LegalSection>
    </LegalPage>
  );
}

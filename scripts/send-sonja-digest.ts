/**
 * Force-send the lead digest for Sonja Immobilien (skip scout — listings already in).
 * Usage: npx tsx --env-file=.env scripts/send-sonja-digest.ts
 */
import { forceLeadDigestForCompany } from "../src/lib/lead-digest.server";

const COMPANY = "afb03dc0-8c0f-4ecf-86fb-16cff18ee4ae";

const result = await forceLeadDigestForCompany(COMPANY, { skipScout: true });
console.log(JSON.stringify(result));
if (!result.sent) process.exit(1);

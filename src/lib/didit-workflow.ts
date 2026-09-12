/**
 * Published Didit KYC workflow. Not a secret — passed in the create-session body.
 * Free KYC = ID + liveness + face match + IP (500/mo free tier).
 * Compliance (AML + NFC) needs a Didit credit balance — keep as fallback after top-up:
 *   448ce0a2-b1da-4e58-a094-e5e110d3e657
 */
export const DIDIT_WORKFLOW_ID = "1646a704-ec71-41a8-b8f3-c252a4c82056";
export const DIDIT_COMPLIANCE_WORKFLOW_ID = "448ce0a2-b1da-4e58-a094-e5e110d3e657";

export const DIDIT_VERIFY_CALLBACK_PATH = "/identity?kyc=return";

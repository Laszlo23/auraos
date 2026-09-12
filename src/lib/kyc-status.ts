/** Stored KYC row status (snake_case). Didit literals are mapped in didit.server. */
export type KycStatus =
  | "none"
  | "not_started"
  | "in_progress"
  | "awaiting_user"
  | "in_review"
  | "approved"
  | "declined"
  | "resubmitted"
  | "abandoned"
  | "expired"
  | "kyc_expired";

/** Exact Didit session status strings — compare case-sensitively. */
export const DIDIT_SESSION_STATUSES = [
  "Not Started",
  "In Progress",
  "Awaiting User",
  "In Review",
  "Approved",
  "Declined",
  "Resubmitted",
  "Abandoned",
  "Expired",
  "Kyc Expired",
] as const;

export type DiditSessionStatus = (typeof DIDIT_SESSION_STATUSES)[number];

export const KYC_STATUS_LABEL: Record<KycStatus, string> = {
  none: "Not started",
  not_started: "Link ready",
  in_progress: "In progress",
  awaiting_user: "Awaiting user",
  in_review: "In review",
  approved: "Approved",
  declined: "Declined",
  resubmitted: "Resubmit required",
  abandoned: "Abandoned",
  expired: "Expired",
  kyc_expired: "KYC expired",
};

export function isKycApproved(status: KycStatus): boolean {
  return status === "approved";
}

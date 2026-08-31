/** Client-safe SIWE display helpers. Never show synthetic emails in the UI. */

export const SIWE_EMAIL_DOMAIN = "siwe.aibusiness.fun";

const ADDR = /^0x[a-fA-F0-9]{40}$/;

export function isSiweEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.trim().toLowerCase().endsWith(`@${SIWE_EMAIL_DOMAIN}`);
}

export function truncateAddress(address: string): string {
  const v = address.trim();
  if (!ADDR.test(v)) return address;
  const n = v.toLowerCase();
  return `${n.slice(0, 6)}…${n.slice(-4)}`;
}

export function displayUserLabel(email?: string | null, wallet?: string | null): string {
  if (wallet && ADDR.test(wallet.trim())) return truncateAddress(wallet);
  if (isSiweEmail(email)) {
    const local = email!.split("@")[0] ?? "";
    return ADDR.test(local) ? truncateAddress(local) : "Wallet";
  }
  return email?.trim() || "Founder";
}

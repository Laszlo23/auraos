import { useMyHandle, useFioAttestations } from "@/hooks/use-identity";

/**
 * Valid FIO attestation for the signed-in founder.
 * Soft-gate for USDC send / live trading / live yield.
 */
export function useFioReady() {
  const { data: handle, isLoading: handleLoading } = useMyHandle();
  const { data: attestations = [], isLoading: fioLoading } = useFioAttestations(handle?.id);
  const primary = attestations.find((a) => a.status === "valid" && a.verified);
  return {
    handleId: handle?.id ?? null,
    auraHandle: handle?.handle ?? null,
    ready: Boolean(primary),
    fioHandle: primary?.fio_handle ?? null,
    loading: handleLoading || (Boolean(handle?.id) && fioLoading),
  };
}

/** Session key so we only hard-prompt once per tab for a given action family. */
function skipKey(action: string) {
  return `aura:fio-skip:${action}`;
}

/**
 * Soft-require FIO before a money-moving action.
 * Returns true if the caller should proceed.
 */
export function confirmFioOrContinue(ready: boolean, action: string, detail: string): boolean {
  if (ready) return true;
  try {
    if (sessionStorage.getItem(skipKey(action)) === "1") return true;
  } catch {
    /* private mode */
  }
  const ok = window.confirm(
    `FIO crypto handle not attested yet.\n\n${detail}\n\nOK = continue without FIO this session\nCancel = stop and set up FIO on Identity`,
  );
  if (ok) {
    try {
      sessionStorage.setItem(skipKey(action), "1");
    } catch {
      /* ignore */
    }
  }
  return ok;
}

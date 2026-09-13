/** Minimal connector shape so tests stay free of wagmi. */
export type WalletDoorConnector = {
  id: string;
  type: string;
  name: string;
};

export function isWalletConnectConnector(c: WalletDoorConnector): boolean {
  return c.type === "walletConnect" || /walletconnect/i.test(`${c.id} ${c.name}`);
}

export function isInjectedConnector(c: WalletDoorConnector): boolean {
  return (
    c.type === "injected" ||
    /metaMask|injected|rabby|brave|coinbase|phantom|okx|rainbow/i.test(`${c.id} ${c.name}`)
  );
}

export function uniqueConnectors<T extends WalletDoorConnector>(connectors: readonly T[]): T[] {
  const seen = new Set<string>();
  return connectors.filter((c) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    return true;
  });
}

/** Two doors: one browser extension, one WalletConnect QR. */
export function twoWalletDoors<T extends WalletDoorConnector>(
  connectors: readonly T[],
): { browser: T | undefined; walletConnect: T | undefined } {
  const unique = uniqueConnectors(connectors);
  const walletConnect = unique.find(isWalletConnectConnector);
  const browser =
    unique.find((c) => isInjectedConnector(c) && !isWalletConnectConnector(c)) ??
    unique.find((c) => !isWalletConnectConnector(c));
  return { browser, walletConnect };
}

export function listedWalletDoors<T extends WalletDoorConnector>(connectors: readonly T[]): T[] {
  const { browser, walletConnect } = twoWalletDoors(connectors);
  return [browser, walletConnect].filter((c): c is T => Boolean(c));
}

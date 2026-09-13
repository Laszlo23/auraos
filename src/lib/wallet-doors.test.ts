import { describe, expect, it } from "vitest";

import { listedWalletDoors, twoWalletDoors } from "@/lib/wallet-doors";

const injected = { id: "io.metamask", type: "injected", name: "MetaMask" };
const rabby = { id: "io.rabby", type: "injected", name: "Rabby" };
const wc = { id: "walletConnect", type: "walletConnect", name: "WalletConnect" };
const wcDup = { id: "walletConnect", type: "walletConnect", name: "WalletConnect" };

describe("wallet doors", () => {
  it("keeps one browser wallet and one WalletConnect", () => {
    const doors = twoWalletDoors([injected, rabby, wc, wcDup]);
    expect(doors.browser).toEqual(injected);
    expect(doors.walletConnect).toEqual(wc);
    expect(listedWalletDoors([injected, rabby, wc, wcDup])).toHaveLength(2);
  });

  it("still offers a browser wallet when WalletConnect is missing", () => {
    expect(listedWalletDoors([rabby, injected])).toEqual([rabby]);
  });

  it("still offers WalletConnect when no extension is present", () => {
    expect(listedWalletDoors([wc])).toEqual([wc]);
  });
});

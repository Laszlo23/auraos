/** Hard AURA balance checks + burns — fail closed when underfunded. */

type LooseDb = {
  from: (table: string) => any;
};

export class InsufficientAuraError extends Error {
  constructor(
    public readonly required: number,
    public readonly available: number,
  ) {
    super(
      `Not enough Boost/AURA — need ${required}, have ${available}. Top up on /boost or /billing.`,
    );
    this.name = "InsufficientAuraError";
  }
}

export async function getAuraBalance(db: LooseDb, companyId: string): Promise<number> {
  const { data: sub } = await db
    .from("subscriptions")
    .select("tokens_remaining")
    .eq("company_id", companyId)
    .maybeSingle();
  return Number(sub?.tokens_remaining ?? 0);
}

/** Throws InsufficientAuraError when balance < cost. */
export async function requireAuraBalance(
  db: LooseDb,
  companyId: string,
  cost: number,
): Promise<number> {
  const need = Math.max(1, Math.floor(cost));
  const available = await getAuraBalance(db, companyId);
  if (available < need) throw new InsufficientAuraError(need, available);
  return available;
}

/**
 * Deduct AURA and write token_ledger. Fails closed if balance is insufficient.
 * Returns amount burned.
 */
export async function burnAuraHard(
  db: LooseDb,
  companyId: string,
  amount: number,
  reason: string,
): Promise<number> {
  const cost = Math.max(1, Math.floor(amount));
  const { data: sub } = await db
    .from("subscriptions")
    .select("id, tokens_remaining")
    .eq("company_id", companyId)
    .maybeSingle();
  const available = Number(sub?.tokens_remaining ?? 0);
  if (!sub || available < cost) {
    throw new InsufficientAuraError(cost, available);
  }
  await db
    .from("subscriptions")
    .update({ tokens_remaining: available - cost })
    .eq("id", sub.id);
  await db.from("token_ledger").insert({
    company_id: companyId,
    kind: "spend",
    amount: -cost,
    reason: reason.slice(0, 120),
  });
  return cost;
}

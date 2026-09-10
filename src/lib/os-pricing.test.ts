import { describe, expect, it } from "vitest";

import {
  OS_MONTHLY_CENTS,
  OS_MONTHLY_USD,
  OS_YEARLY_CENTS,
  OS_YEARLY_USD,
  isOsCheckoutPlan,
  osPlanAmountCents,
  osPlanInterval,
} from "@/lib/os-pricing";

describe("Aura OS public price ladder", () => {
  it("keeps monthly easy and yearly as the flagship", () => {
    expect(OS_MONTHLY_USD).toBe(29);
    expect(OS_MONTHLY_CENTS).toBe(2_900);
    expect(OS_YEARLY_USD).toBe(299);
    expect(OS_YEARLY_CENTS).toBe(29_900);
  });

  it("makes the year cheaper than twelve months", () => {
    expect(OS_YEARLY_CENTS).toBeLessThan(OS_MONTHLY_CENTS * 12);
    expect(OS_MONTHLY_CENTS * 12 - OS_YEARLY_CENTS).toBe(4_900);
  });

  it("maps checkout plans to Stripe intervals", () => {
    expect(isOsCheckoutPlan("month")).toBe(true);
    expect(isOsCheckoutPlan("year")).toBe(true);
    expect(isOsCheckoutPlan("lifetime")).toBe(false);
    expect(osPlanAmountCents("month")).toBe(OS_MONTHLY_CENTS);
    expect(osPlanAmountCents("year")).toBe(OS_YEARLY_CENTS);
    expect(osPlanInterval("month")).toBe("month");
    expect(osPlanInterval("year")).toBe("year");
  });
});

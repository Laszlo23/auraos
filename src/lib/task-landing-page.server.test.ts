import { beforeEach, describe, expect, it, vi } from "vitest";

import { shipLandingPageFromTask } from "@/lib/task-landing-page.server";

vi.mock("@/lib/x402-ai", () => ({
  agentJson: vi.fn(async () => {
    throw new Error("no AI in tests");
  }),
}));

type SiteRow = {
  id: string;
  company_id: string;
  slug: string;
  template_id?: string;
  content?: unknown;
};

function mockDb(sites: SiteRow[]) {
  return {
    from(table: string) {
      if (table !== "company_sites") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null }),
            }),
          }),
        };
      }

      const filters: Record<string, string> = {};
      const chain: Record<string, unknown> = {};
      chain.select = () => chain;
      chain.eq = (key: string, value: string) => {
        filters[key] = value;
        return chain;
      };
      chain.order = () => chain;
      chain.limit = () => chain;
      chain.maybeSingle = async () => {
        if (filters.company_id) {
          const row = sites.find((s) => s.company_id === filters.company_id) ?? null;
          return { data: row };
        }
        if (filters.slug) {
          const row = sites.find((s) => s.slug === filters.slug);
          return { data: row ? { id: row.id } : null };
        }
        return { data: null };
      };
      chain.insert = async (row: SiteRow) => {
        sites.push({
          id: row.id ?? `site-${sites.length + 1}`,
          company_id: row.company_id,
          slug: row.slug,
          template_id: row.template_id,
          content: row.content,
        });
        return { error: null };
      };
      chain.update = (patch: Partial<SiteRow>) => {
        const updater = {
          eq: (key: string, value: string) => {
            filters[key] = value;
            return updater;
          },
          then: (
            resolve: (v: { error: null }) => void,
            reject?: (e: unknown) => void,
          ) => {
            try {
              const row = sites.find((s) => s.id === filters.id);
              if (row) Object.assign(row, patch);
              resolve({ error: null });
            } catch (e) {
              reject?.(e);
            }
          },
        };
        return updater;
      };
      return chain;
    },
  };
}

describe("shipLandingPageFromTask", () => {
  beforeEach(() => {
    sites.length = 0;
  });

  const sites: SiteRow[] = [];

  it("inserts a draft company site", async () => {
    const db = mockDb(sites);
    const shipped = await shipLandingPageFromTask(db, {
      companyId: "co-1",
      companyName: "Bakery",
      title: "Create a landing page",
      description: "For the bakery",
      agentName: "Designer",
    });
    expect(shipped.created).toBe(true);
    expect(shipped.path).toBe("/s/bakery");
    expect(sites).toHaveLength(1);
    expect(sites[0]?.template_id).toBe("service_offer");
  });

  it("updates the existing company site instead of duplicating", async () => {
    sites.push({
      id: "site-1",
      company_id: "co-1",
      slug: "bakery",
      template_id: "lead_magnet",
    });
    const db = mockDb(sites);
    const shipped = await shipLandingPageFromTask(db, {
      companyId: "co-1",
      companyName: "Bakery",
      title: "Create a landing page",
      description: null,
      agentName: "Iris",
    });
    expect(shipped.created).toBe(false);
    expect(shipped.slug).toBe("bakery");
    expect(sites).toHaveLength(1);
    expect(sites[0]?.template_id).toBe("service_offer");
  });
});

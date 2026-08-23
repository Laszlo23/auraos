import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "motion/react";
import {
  Building2,
  ChevronRight,
  DollarSign,
  FileText,
  LogOut,
  Receipt,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, Shimmer } from "@/components/aura/primitives";
import { useLocale } from "@/hooks/use-locale";
import { t as translate } from "@/lib/i18n";
import {
  createDeskLocalBusiness,
  deskLogin,
  deskLogout,
  getDeskDashboard,
  logDeskSale,
} from "@/lib/desk.functions";

export const Route = createFileRoute("/desk")({
  head: () => ({
    meta: [{ title: "Team Desk — Aura OS" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: DeskPage,
});

function DeskPage() {
  const { locale } = useLocale();
  const qc = useQueryClient();
  const t = (key: string, vars?: Record<string, string | number>) => translate(key, locale, vars);

  const getStoredToken = (): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return sessionStorage.getItem("aura_desk_token");
    } catch {
      return null;
    }
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["desk-dashboard"],
    queryFn: async () => {
      try {
        const token = getStoredToken();
        return await getDeskDashboard({ data: { token } });
      } catch (e) {
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
  });

  const handleLoginSuccess = (dashboard: NonNullable<DashboardData>, token: string) => {
    try {
      sessionStorage.setItem("aura_desk_token", token);
    } catch {
      /* ignore */
    }
    qc.setQueryData(["desk-dashboard"], dashboard);
  };

  const handleLogout = () => {
    try {
      sessionStorage.removeItem("aura_desk_token");
    } catch {
      /* ignore */
    }
    qc.setQueryData(["desk-dashboard"], null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[oklch(0.14_0.02_240)] to-[oklch(0.18_0.04_200)] p-6">
        <div className="mx-auto max-w-4xl space-y-4 pt-20">
          <Shimmer className="h-20" />
          <Shimmer className="h-40" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return <LoginScreen onSuccess={handleLoginSuccess} t={t} />;
  }

  return <Dashboard data={data} onLogout={handleLogout} t={t} />;
}

function LoginScreen({
  onSuccess,
  t,
}: {
  onSuccess: (dashboard: NonNullable<DashboardData>, token: string) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const login = useMutation({
    mutationFn: () => deskLogin({ data: { password, displayName } }),
    onSuccess: (result) => {
      const res = result as { ok: boolean; token: string; dashboard: NonNullable<DashboardData> };
      toast.success(t("desk.welcome", { name: res.dashboard.displayName }));
      onSuccess(res.dashboard, res.token);
    },
    onError: (e: Error) => toast.error(e.message || t("desk.wrongPassword")),
  });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[oklch(0.14_0.02_240)] to-[oklch(0.18_0.04_200)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.55_0.18_200/0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,oklch(0.65_0.14_60/0.1),transparent_50%)]" />

      <div className="relative flex min-h-screen items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-black/30 p-8 backdrop-blur-xl"
        >
          <div className="space-y-2 text-center">
            <h1 className="font-display text-3xl font-semibold text-white">{t("desk.title")}</h1>
            <p className="text-sm text-white/60">{t("desk.unlock")}</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              login.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="password" className="text-xs font-medium text-white/70">
                {t("desk.password")}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="displayName" className="text-xs font-medium text-white/70">
                {t("desk.displayName")}
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Laszlo / Martina / Darko / Evren / Mart"
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <button
              type="submit"
              disabled={login.isPending || !password}
              className="w-full rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
            >
              {login.isPending ? t("common.loading") : t("desk.login")}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}

type DashboardData = Awaited<ReturnType<typeof getDeskDashboard>>;

function Dashboard({
  data,
  onLogout,
  t,
}: {
  data: NonNullable<DashboardData>;
  onLogout: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const [activeTab, setActiveTab] = useState<"personal" | "team" | "finance" | "create" | "log">(
    "personal",
  );

  const logout = useMutation({
    mutationFn: () => deskLogout(),
    onSuccess: () => {
      toast.success("Logged out");
      onLogout();
    },
  });

  const migrationWarning = (data as { migrationWarning?: string | null }).migrationWarning;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[oklch(0.14_0.02_240)] to-[oklch(0.18_0.04_200)] p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title={t("desk.welcome", { name: data.displayName })}
          description="Team Desk · Aura OS"
          actions={
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              <LogOut className="h-3.5 w-3.5" />
              {t("desk.logout")}
            </button>
          }
        />

        {migrationWarning && (
          <div className="rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-white">
            ⚠️ {migrationWarning}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <TabButton
            active={activeTab === "personal"}
            onClick={() => setActiveTab("personal")}
            label={t("desk.myDashboard")}
          />
          <TabButton
            active={activeTab === "team"}
            onClick={() => setActiveTab("team")}
            label={t("desk.teamDashboard")}
          />
          <TabButton
            active={activeTab === "finance"}
            onClick={() => setActiveTab("finance")}
            label={t("desk.financeSnapshot")}
          />
          <TabButton
            active={activeTab === "create"}
            onClick={() => setActiveTab("create")}
            label={t("desk.createLocal")}
          />
          <TabButton
            active={activeTab === "log"}
            onClick={() => setActiveTab("log")}
            label={t("desk.logSale")}
          />
        </div>

        {activeTab === "personal" && <PersonalDashboard data={data} t={t} />}
        {activeTab === "team" && <TeamDashboard data={data} t={t} />}
        {activeTab === "finance" && <FinanceSnapshot data={data} t={t} />}
        {activeTab === "create" && <CreateLocalBusiness t={t} />}
        {activeTab === "log" && <LogSaleForm t={t} />}

        <SalesKitSection t={t} />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
        active
          ? "bg-primary/20 text-primary"
          : "border border-white/20 bg-white/5 text-white/70 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function PersonalDashboard({
  data,
  t,
}: {
  data: NonNullable<DashboardData>;
  t: (key: string) => string;
}) {
  const weekStreak = data.mySales.week;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Receipt}
          label={`${t("desk.closes")} · ${t("desk.thisWeek")}`}
          value={String(data.mySales.week)}
          tone="cyan"
        />
        <StatCard
          icon={DollarSign}
          label={`${t("desk.totalAmount")} · ${t("desk.thisWeek")}`}
          value={`€${(data.mySales.weekAmount / 100).toFixed(0)}`}
          tone="gold"
        />
        <StatCard
          icon={Trophy}
          label={t("desk.streak")}
          value={weekStreak > 0 ? `${weekStreak} 🔥` : "0"}
          tone="primary"
        />
        <StatCard
          icon={TrendingUp}
          label={t("desk.thisMonth")}
          value={`${data.mySales.month} · €${(data.mySales.monthAmount / 100).toFixed(0)}`}
          tone="muted"
        />
      </div>

      <Panel label={t("desk.nextAction")}>
        <div className="space-y-2 text-sm text-white/80">
          <div className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-primary" />
            <span>{t("desk.actionCreateLocal")}</span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronRight className="h-4 w-4 text-primary" />
            <span>{t("desk.actionLogSale")}</span>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function TeamDashboard({
  data,
  t,
}: {
  data: NonNullable<DashboardData>;
  t: (key: string) => string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Receipt}
          label={`Team ${t("desk.thisWeek")}`}
          value={String(data.teamSales.week)}
          tone="cyan"
        />
        <StatCard
          icon={DollarSign}
          label={`${t("desk.thisWeek")} Revenue`}
          value={`€${(data.teamSales.weekAmount / 100).toFixed(0)}`}
          tone="gold"
        />
        <StatCard
          icon={TrendingUp}
          label={`${t("desk.thisMonth")} Total`}
          value={`${data.teamSales.month} · €${(data.teamSales.monthAmount / 100).toFixed(0)}`}
          tone="primary"
        />
      </div>

      <Panel label={t("desk.leaderboard")}>
        {data.leaderboard.length === 0 ? (
          <p className="text-sm text-white/60">No sales yet this month</p>
        ) : (
          <div className="space-y-2">
            {data.leaderboard.map((entry, idx) => (
              <div
                key={entry.closer}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-xl font-semibold text-white/60">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-medium text-white">{entry.closer}</p>
                    <p className="text-xs text-white/60">
                      {entry.closes} {t("desk.closes")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-display text-lg font-semibold text-gold">
                    €{(entry.totalCents / 100).toFixed(0)}
                  </p>
                  <p className="text-xs text-white/60">{Math.round(entry.closes * 10)} XP</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel label={t("desk.recentActivity")}>
        {data.recentSales.length === 0 ? (
          <p className="text-sm text-white/60">No sales logged yet</p>
        ) : (
          <div className="space-y-2">
            {data.recentSales.slice(0, 10).map((sale) => (
              <div
                key={sale.id}
                className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-white">{sale.customer_name}</p>
                    <p className="text-white/60">
                      {sale.product} · {sale.closer}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gold">
                      {sale.currency === "EUR" ? "€" : "$"}
                      {(sale.amount_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-white/60">
                      {new Date(sale.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>
                {sale.notes && <p className="mt-1 text-white/60">{sale.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function FinanceSnapshot({
  data,
  t,
}: {
  data: NonNullable<DashboardData>;
  t: (key: string) => string;
}) {
  const foundingRev = data.finance.foundingRevenue / 100;
  const localRev = data.finance.localRevenue / 100;
  const total = foundingRev + localRev;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Building2}
          label={t("desk.foundingSeats")}
          value={`${data.finance.foundingSeats} · $${foundingRev.toFixed(0)}`}
          tone="cyan"
        />
        <StatCard
          icon={Building2}
          label={t("desk.localSeats")}
          value={`${data.finance.localPaidSeats} · €${localRev.toFixed(0)}`}
          tone="gold"
        />
        <StatCard
          icon={DollarSign}
          label={`${t("desk.revenue")} Total`}
          value={`~€${total.toFixed(0)}`}
          tone="primary"
        />
      </div>

      <Panel label="Finance Notes">
        <div className="space-y-2 text-sm text-white/70">
          <p>
            Founding seats: ${99} × {data.finance.foundingSeats} ≈ ${foundingRev.toFixed(0)}
          </p>
          <p>
            Local paid seats: €{49} × {data.finance.localPaidSeats} ≈ €{localRev.toFixed(0)}
          </p>
          <p className="text-xs text-white/50">
            Numbers from existing Supabase companies table. Pipeline/deals not included.
          </p>
        </div>
      </Panel>
    </div>
  );
}

function CreateLocalBusiness({ t }: { t: (key: string) => string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [address, setAddress] = useState("");
  const [bezirk, setBezirk] = useState("");
  const [category, setCategory] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [google, setGoogle] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [paidSeat, setPaidSeat] = useState(false);
  const [amountCents, setAmountCents] = useState(4900);

  const getStoredToken = (): string | null => {
    try {
      return sessionStorage.getItem("aura_desk_token");
    } catch {
      return null;
    }
  };

  const create = useMutation({
    mutationFn: () => {
      const token = getStoredToken();
      return createDeskLocalBusiness({
        data: {
          token,
          name,
          slug,
          address,
          bezirk,
          category,
          website,
          instagram,
          google,
          phone,
          notes,
          paidSeat,
          amountCents,
        },
      });
    },
    onSuccess: (result) => {
      const res = result as { ok: boolean; warning?: string };
      toast.success(t("desk.businessCreated"));
      if (res.warning) {
        toast.warning(res.warning, { duration: 5000 });
      }
      setName("");
      setSlug("");
      setAddress("");
      setBezirk("");
      setCategory("");
      setWebsite("");
      setInstagram("");
      setGoogle("");
      setPhone("");
      setNotes("");
      setPaidSeat(false);
      setAmountCents(4900);
      void qc.invalidateQueries({ queryKey: ["desk-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel label={t("desk.actionCreateLocal")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t("desk.businessName")}
            value={name}
            onChange={setName}
            required
            placeholder="Salon Mira"
          />
          <FormField
            label={t("desk.slug")}
            value={slug}
            onChange={setSlug}
            placeholder="salon-mira"
          />
          <FormField
            label={t("desk.address")}
            value={address}
            onChange={setAddress}
            placeholder="Mariahilfer Straße 1"
          />
          <FormField label={t("desk.bezirk")} value={bezirk} onChange={setBezirk} placeholder="6" />
          <FormField
            label={t("desk.category")}
            value={category}
            onChange={setCategory}
            placeholder="Friseur"
          />
          <FormField
            label={t("desk.website")}
            value={website}
            onChange={setWebsite}
            placeholder="https://..."
          />
          <FormField
            label={t("desk.instagram")}
            value={instagram}
            onChange={setInstagram}
            placeholder="@salonmira"
          />
          <FormField
            label={t("desk.google")}
            value={google}
            onChange={setGoogle}
            placeholder="https://g.page/..."
          />
          <FormField
            label={t("desk.phone")}
            value={phone}
            onChange={setPhone}
            placeholder="+43..."
          />
        </div>

        <FormField
          label={t("desk.notes")}
          value={notes}
          onChange={setNotes}
          placeholder="Internal notes..."
          multiline
        />

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm text-white">
            <input
              type="checkbox"
              checked={paidSeat}
              onChange={(e) => setPaidSeat(e.target.checked)}
              className="h-4 w-4 rounded border-white/30 bg-white/10 text-primary focus:ring-2 focus:ring-primary/50"
            />
            {t("desk.paidSeat")}
          </label>
          {paidSeat && (
            <FormField
              label={t("desk.amountEur")}
              value={String(amountCents / 100)}
              onChange={(v) => setAmountCents(Math.round(Number(v) * 100))}
              type="number"
              placeholder="49"
              className="w-32"
            />
          )}
        </div>

        <button
          type="submit"
          disabled={create.isPending || !name}
          className="w-full rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {create.isPending ? t("common.loading") : t("desk.submit")}
        </button>
      </form>
    </Panel>
  );
}

function LogSaleForm({ t }: { t: (key: string) => string }) {
  const qc = useQueryClient();
  const [product, setProduct] = useState("local_paid_seat");
  const [amountCents, setAmountCents] = useState(4900);
  const [currency, setCurrency] = useState("EUR");
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");

  const getStoredToken = (): string | null => {
    try {
      return sessionStorage.getItem("aura_desk_token");
    } catch {
      return null;
    }
  };

  const logSale = useMutation({
    mutationFn: () => {
      const token = getStoredToken();
      return logDeskSale({
        data: { token, product, amountCents, currency, customerName, notes },
      });
    },
    onSuccess: () => {
      toast.success(t("desk.saleLogged"));
      setCustomerName("");
      setNotes("");
      setAmountCents(4900);
      void qc.invalidateQueries({ queryKey: ["desk-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Panel label={t("desk.actionLogSale")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          logSale.mutate();
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <label htmlFor="product" className="text-xs font-medium text-white/70">
            {t("desk.product")}
          </label>
          <select
            id="product"
            value={product}
            onChange={(e) => {
              setProduct(e.target.value);
              if (e.target.value === "founding_seat") {
                setAmountCents(9900);
                setCurrency("USD");
              } else if (e.target.value === "local_monthly") {
                setAmountCents(4900);
                setCurrency("EUR");
              } else if (e.target.value === "local_paid_seat") {
                setAmountCents(4900);
                setCurrency("EUR");
              }
            }}
            className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="founding_seat">{t("desk.productFounding")}</option>
            <option value="local_monthly">{t("desk.productLocalMonthly")}</option>
            <option value="local_paid_seat">{t("desk.productLocalPaid")}</option>
            <option value="other">{t("desk.productOther")}</option>
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            label={t("desk.amount")}
            value={String(amountCents / 100)}
            onChange={(v) => setAmountCents(Math.round(Number(v) * 100))}
            type="number"
            required
            placeholder="49.00"
          />
          <div className="space-y-2">
            <label htmlFor="currency" className="text-xs font-medium text-white/70">
              {t("desk.currency")}
            </label>
            <select
              id="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        <FormField
          label={t("desk.customer")}
          value={customerName}
          onChange={setCustomerName}
          required
          placeholder="Salon Mira / Max Mustermann"
        />

        <FormField
          label={t("desk.notes")}
          value={notes}
          onChange={setNotes}
          placeholder="Internal notes..."
          multiline
        />

        <button
          type="submit"
          disabled={logSale.isPending || !customerName}
          className="w-full rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02] disabled:opacity-50"
        >
          {logSale.isPending ? t("common.loading") : t("desk.submit")}
        </button>
      </form>
    </Panel>
  );
}

function SalesKitSection({ t }: { t: (key: string) => string }) {
  const links = [
    { label: t("desk.linkLokalAudit"), href: "/lokal/audit" },
    { label: t("desk.linkShare"), href: "/share" },
    { label: t("desk.linkPitch"), href: "/pitch" },
    { label: t("desk.linkWien"), href: "/wien" },
    { label: t("desk.linkAccess"), href: "/access" },
  ];

  return (
    <Panel label={t("desk.salesKit")}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
            >
              <FileText className="h-3.5 w-3.5" />
              {link.label}
            </a>
          ))}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
            {t("desk.checklistTitle")}
          </p>
          <div className="space-y-1.5 text-sm text-white/80">
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-primary" />
              <span>{t("desk.checklistStep1")}</span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-primary" />
              <span>{t("desk.checklistStep2")}</span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-primary" />
              <span>{t("desk.checklistStep3")}</span>
            </div>
            <div className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 text-primary" />
              <span>{t("desk.checklistStep4")}</span>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

function FormField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
  multiline = false,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}) {
  const inputClass = `w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 ${className}`;

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/70">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputClass} min-h-[80px]`}
          required={required}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClass}
          required={required}
          step={type === "number" ? "0.01" : undefined}
        />
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: string;
  tone: "cyan" | "gold" | "primary" | "muted";
}) {
  const toneColors = {
    cyan: "text-cyan-400",
    gold: "text-gold",
    primary: "text-primary",
    muted: "text-white/60",
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center gap-2">
        <Icon className={`h-4 w-4 ${toneColors[tone]}`} />
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
          {label}
        </p>
      </div>
      <p className={`font-display text-2xl font-semibold ${toneColors[tone]}`}>{value}</p>
    </div>
  );
}

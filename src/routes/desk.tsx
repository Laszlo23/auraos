import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Building2,
  Camera,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  ExternalLink,
  FileText,
  ImagePlus,
  LogOut,
  Receipt,
  Trash2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";

import { PageHeader, Panel, Shimmer } from "@/components/aura/primitives";
import { DeskTrafficPanel } from "@/components/aura/desk-traffic";
import { useLocale } from "@/hooks/use-locale";
import {
  addDeskReviewProof,
  deleteDeskReviewProof,
  listDeskLocalBusinesses,
  listDeskReviewProofs,
  MAX_SHOP_PROOFS,
  type DeskLocalShop,
} from "@/lib/desk-proof.functions";
import {
  createDeskLocalBusiness,
  deskLogin,
  deskLogout,
  getDeskDashboard,
  logDeskSale,
} from "@/lib/desk.functions";
import { t as translate } from "@/lib/i18n";
import { pAuraToLaunchAura, PRIVATE_SALE_MIN_USDC, usdcToPAura } from "@/lib/private-sale";
import {
  listPrivateSaleCashOrders,
  logPrivateSaleCash,
  sendPrivateSaleCash,
} from "@/lib/private-sale.functions";

type DeskTab = "personal" | "team" | "finance" | "traffic" | "create" | "shops" | "log" | "sale";

export const Route = createFileRoute("/desk")({
  head: () => ({
    meta: [{ title: "Team Desk · Aura Local" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: DeskPage,
});

function getDeskToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem("aura_desk_token");
  } catch {
    return null;
  }
}

function DeskPage() {
  const { locale } = useLocale();
  const qc = useQueryClient();
  const t = (key: string, vars?: Record<string, string | number>) => translate(key, locale, vars);

  const { data, isLoading, error } = useQuery({
    queryKey: ["desk-dashboard"],
    queryFn: async () => {
      try {
        const token = getDeskToken();
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

      <div className="relative flex min-h-dvh items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-black/30 p-6 backdrop-blur-xl sm:p-8"
        >
          <div className="space-y-2 text-center">
            <h1 className="font-display text-2xl font-semibold text-white sm:text-3xl">
              {t("desk.title")}
            </h1>
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
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
                autoFocus
                autoComplete="current-password"
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
                autoComplete="nickname"
                className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
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
  const [activeTab, setActiveTab] = useState<DeskTab>("personal");
  const [openShopId, setOpenShopId] = useState<string | null>(null);

  const logout = useMutation({
    mutationFn: () => deskLogout(),
    onSuccess: () => {
      toast.success(t("desk.loggedOut"));
      onLogout();
    },
  });

  const migrationWarning = (data as { migrationWarning?: string | null }).migrationWarning;

  return (
    <div className="min-h-dvh overflow-x-hidden bg-gradient-to-br from-[oklch(0.14_0.02_240)] to-[oklch(0.18_0.04_200)] p-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <PageHeader
          title={t("desk.welcome", { name: data.displayName })}
          description={t("desk.headerDesc")}
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

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
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
            active={activeTab === "traffic"}
            onClick={() => setActiveTab("traffic")}
            label={t("desk.trafficTab")}
          />
          <TabButton
            active={activeTab === "create"}
            onClick={() => setActiveTab("create")}
            label={t("desk.createLocal")}
          />
          <TabButton
            active={activeTab === "shops"}
            onClick={() => setActiveTab("shops")}
            label={t("desk.shops")}
          />
          <TabButton
            active={activeTab === "log"}
            onClick={() => setActiveTab("log")}
            label={t("desk.logSale")}
          />
          <TabButton
            active={activeTab === "sale"}
            onClick={() => setActiveTab("sale")}
            label={t("desk.saleTab")}
          />
        </div>

        {activeTab === "personal" && (
          <PersonalDashboard
            data={data}
            t={t}
            onGoCreate={() => setActiveTab("create")}
            onGoLog={() => setActiveTab("log")}
          />
        )}
        {activeTab === "team" && <TeamDashboard data={data} t={t} />}
        {activeTab === "finance" && <FinanceSnapshot data={data} t={t} />}
        {activeTab === "traffic" && <DeskTrafficPanel t={t} />}
        {activeTab === "create" && (
          <CreateLocalBusiness
            t={t}
            onCreated={(companyId) => {
              setOpenShopId(companyId);
              setActiveTab("shops");
            }}
          />
        )}
        {activeTab === "shops" && (
          <ShopsPanel t={t} openShopId={openShopId} onOpenShop={setOpenShopId} />
        )}
        {activeTab === "log" && <LogSaleForm t={t} />}
        {activeTab === "sale" && <PrivateSalePanel t={t} />}

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
      className={`min-h-11 shrink-0 rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors ${
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
  onGoCreate,
  onGoLog,
}: {
  data: NonNullable<DashboardData>;
  t: (key: string) => string;
  onGoCreate: () => void;
  onGoLog: () => void;
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
        <div className="space-y-2 text-sm">
          <button
            type="button"
            onClick={onGoCreate}
            className="flex w-full items-center gap-2 rounded-2xl px-2 py-2 text-left text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-4 w-4 text-primary" />
            <span className="underline decoration-white/30 underline-offset-4">
              {t("desk.actionCreateLocal")}
            </span>
          </button>
          <button
            type="button"
            onClick={onGoLog}
            className="flex w-full items-center gap-2 rounded-2xl px-2 py-2 text-left text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ChevronRight className="h-4 w-4 text-primary" />
            <span className="underline decoration-white/30 underline-offset-4">
              {t("desk.actionLogSale")}
            </span>
          </button>
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
          label={t("desk.teamThisWeek")}
          value={String(data.teamSales.week)}
          tone="cyan"
        />
        <StatCard
          icon={DollarSign}
          label={t("desk.weekRevenue")}
          value={`€${(data.teamSales.weekAmount / 100).toFixed(0)}`}
          tone="gold"
        />
        <StatCard
          icon={TrendingUp}
          label={t("desk.monthTotal")}
          value={`${data.teamSales.month} · €${(data.teamSales.monthAmount / 100).toFixed(0)}`}
          tone="primary"
        />
      </div>

      <Panel label={t("desk.leaderboard")}>
        {data.leaderboard.length === 0 ? (
          <p className="text-sm text-white/60">{t("desk.noSalesMonth")}</p>
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
          <p className="text-sm text-white/60">{t("desk.noSalesYet")}</p>
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
          label={t("desk.revenueTotal")}
          value={`~€${total.toFixed(0)}`}
          tone="primary"
        />
      </div>

      <Panel label={t("desk.financeNotes")}>
        <div className="space-y-2 text-sm text-white/70">
          <p>
            {t("desk.foundingSeatsNote", {
              count: data.finance.foundingSeats,
              amount: foundingRev.toFixed(0),
            })}
          </p>
          <p>
            {t("desk.localSeatsNote", {
              count: data.finance.localPaidSeats,
              amount: localRev.toFixed(0),
            })}
          </p>
          <p className="text-xs text-white/50">{t("desk.financeDisclaimer")}</p>
        </div>
      </Panel>
    </div>
  );
}

function CreateLocalBusiness({
  t,
  onCreated,
}: {
  t: (key: string) => string;
  onCreated: (companyId: string) => void;
}) {
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

  const create = useMutation({
    mutationFn: () => {
      const token = getDeskToken();
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
      const res = result as {
        ok: boolean;
        warning?: string;
        company?: { id: string };
      };
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
      void qc.invalidateQueries({ queryKey: ["desk-shops"] });
      if (res.company?.id) onCreated(res.company.id);
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
          placeholder={t("desk.notesPlaceholder")}
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

  const logSale = useMutation({
    mutationFn: () => {
      const token = getDeskToken();
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
              } else if (e.target.value === "private_sale") {
                setAmountCents(5000);
                setCurrency("USD");
              }
            }}
            className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-base text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="founding_seat">{t("desk.productFounding")}</option>
            <option value="local_monthly">{t("desk.productLocalMonthly")}</option>
            <option value="local_paid_seat">{t("desk.productLocalPaid")}</option>
            <option value="private_sale">{t("desk.productPrivateSale")}</option>
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
              className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-base text-white focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
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
          placeholder={t("desk.notesPlaceholder")}
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
    { label: t("desk.linkTisch"), href: "/tisch" },
    { label: t("desk.linkSale"), href: "/sale" },
    { label: t("desk.linkVerkauf"), href: "/verkauf" },
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

function ShopsPanel({
  t,
  openShopId,
  onOpenShop,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string;
  openShopId: string | null;
  onOpenShop: (id: string | null) => void;
}) {
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const token = getDeskToken();

  const shopsQ = useQuery({
    queryKey: ["desk-shops"],
    queryFn: () => listDeskLocalBusinesses({ data: { token } }),
  });

  const shops = shopsQ.data ?? [];
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? shops.filter((shop) =>
        [shop.name, shop.niche, shop.district, shop.city, shop.slug]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : shops;

  const openShop = shops.find((shop) => shop.id === openShopId) ?? null;

  if (openShop) {
    return (
      <ShopProofEditor
        t={t}
        shop={openShop}
        onBack={() => onOpenShop(null)}
        onChanged={() => {
          void qc.invalidateQueries({ queryKey: ["desk-shops"] });
        }}
      />
    );
  }

  return (
    <Panel label={t("desk.shops")}>
      <div className="space-y-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("desk.searchShopsPlaceholder")}
          aria-label={t("desk.searchShops")}
          className="w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
        />

        {shopsQ.isLoading ? (
          <Shimmer className="h-32" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-white/60">{t("desk.noShops")}</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((shop) => (
              <button
                key={shop.id}
                type="button"
                onClick={() => onOpenShop(shop.id)}
                className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left transition-colors hover:bg-white/10"
              >
                <div>
                  <p className="font-medium text-white">{shop.name}</p>
                  <p className="text-xs text-white/60">
                    {[shop.niche, shop.district, shop.city].filter(Boolean).join(" · ") ||
                      shop.slug ||
                      "—"}
                  </p>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                  {t("desk.proofCount", { count: shop.proofCount })}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function ShopProofEditor({
  t,
  shop,
  onBack,
  onChanged,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string;
  shop: DeskLocalShop;
  onBack: () => void;
  onChanged: () => void;
}) {
  const qc = useQueryClient();
  const [caption, setCaption] = useState("");
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const token = getDeskToken();

  const proofsQ = useQuery({
    queryKey: ["desk-proofs", shop.id],
    queryFn: () => listDeskReviewProofs({ data: { token, companyId: shop.id } }),
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/")) throw new Error("Nur Bilder (JPG/PNG/WebP).");
      const dataBase64 = await fileToDataUrl(file);
      return addDeskReviewProof({
        data: {
          token,
          companyId: shop.id,
          filename: file.name,
          contentType: file.type || "image/jpeg",
          dataBase64,
          caption,
        },
      });
    },
    onSuccess: () => {
      toast.success(t("desk.proofUploaded"));
      setCaption("");
      void qc.invalidateQueries({ queryKey: ["desk-proofs", shop.id] });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (proofId: string) => deleteDeskReviewProof({ data: { token, proofId } }),
    onSuccess: () => {
      toast.success(t("desk.proofDeleted"));
      void qc.invalidateQueries({ queryKey: ["desk-proofs", shop.id] });
      onChanged();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const proofs = proofsQ.data ?? [];
  const atCap = proofs.length >= MAX_SHOP_PROOFS;

  return (
    <Panel label={`${t("desk.proof")} · ${shop.name}`}>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            {t("desk.backToShops")}
          </button>
          {shop.slug ? (
            <>
              <a
                href={`/tisch/${shop.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("desk.openTisch")}
              </a>
              <a
                href={`/b/${shop.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-2xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("desk.openCard")}
              </a>
            </>
          ) : null}
        </div>

        <p className="text-sm text-white/70">{t("desk.proofHint")}</p>

        <FormField
          label={t("desk.proofCaption")}
          value={caption}
          onChange={setCaption}
          placeholder={t("desk.proofCaptionPlaceholder")}
        />

        <div className="flex flex-wrap gap-2">
          <input
            ref={libraryRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload.mutate(file);
            }}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload.mutate(file);
            }}
          />
          <button
            type="button"
            disabled={upload.isPending || atCap}
            onClick={() => libraryRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" />
            {upload.isPending ? t("common.loading") : t("desk.uploadProof")}
          </button>
          <button
            type="button"
            disabled={upload.isPending || atCap}
            onClick={() => cameraRef.current?.click()}
            className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Camera className="h-4 w-4" />
            {t("desk.takingPhoto")}
          </button>
        </div>

        {atCap ? (
          <p className="text-xs text-gold">{t("desk.maxProofs", { count: MAX_SHOP_PROOFS })}</p>
        ) : null}

        {proofsQ.isLoading ? (
          <Shimmer className="h-40" />
        ) : proofs.length === 0 ? (
          <p className="text-sm text-white/60">{t("desk.noProofs")}</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {proofs.map((proof) => (
              <figure
                key={proof.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              >
                <img
                  src={proof.url}
                  alt={proof.caption || shop.name}
                  className="h-48 w-full object-cover"
                />
                <figcaption className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="truncate text-xs text-white/70">{proof.caption || "—"}</span>
                  <button
                    type="button"
                    onClick={() => remove.mutate(proof.id)}
                    disabled={remove.isPending}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50 hover:text-red-300"
                  >
                    <Trash2 className="h-3 w-3" />
                    {t("desk.deleteProof")}
                  </button>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function PrivateSalePanel({
  t,
}: {
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const qc = useQueryClient();
  const [customerName, setCustomerName] = useState("");
  const [wallet, setWallet] = useState("");
  const [amountUsdc, setAmountUsdc] = useState(String(PRIVATE_SALE_MIN_USDC));
  const [notes, setNotes] = useState("");
  const usdc = Number(amountUsdc);
  const preview = Number.isFinite(usdc) ? usdcToPAura(usdc) : 0;
  const launch = pAuraToLaunchAura(preview);

  const queue = useQuery({
    queryKey: ["desk-private-sale"],
    queryFn: () => listPrivateSaleCashOrders({ data: { token: getDeskToken() } }),
  });

  const logCash = useMutation({
    mutationFn: () =>
      logPrivateSaleCash({
        data: {
          token: getDeskToken(),
          customerName,
          wallet,
          amountUsdc: usdc,
          notes,
        },
      }),
    onSuccess: () => {
      toast.success(t("desk.saleCashLogged"));
      setCustomerName("");
      setWallet("");
      setNotes("");
      setAmountUsdc(String(PRIVATE_SALE_MIN_USDC));
      void qc.invalidateQueries({ queryKey: ["desk-private-sale"] });
      void qc.invalidateQueries({ queryKey: ["desk-dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const send = useMutation({
    mutationFn: (orderId: string) =>
      sendPrivateSaleCash({ data: { token: getDeskToken(), orderId } }),
    onSuccess: () => {
      toast.success(t("desk.saleSent"));
      void qc.invalidateQueries({ queryKey: ["desk-private-sale"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canSend = queue.data?.canSend === true;

  return (
    <div className="space-y-6">
      <Panel label={t("desk.saleLog")}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            logCash.mutate();
          }}
          className="space-y-4"
        >
          <FormField
            label={t("desk.customer")}
            value={customerName}
            onChange={setCustomerName}
            required
            placeholder="Max Mustermann"
          />
          <FormField
            label={t("desk.saleWallet")}
            value={wallet}
            onChange={setWallet}
            required
            placeholder="0x…"
          />
          <FormField
            label={t("desk.saleUsdc")}
            value={amountUsdc}
            onChange={setAmountUsdc}
            type="number"
            required
            placeholder={String(PRIVATE_SALE_MIN_USDC)}
          />
          {preview > 0 ? (
            <p className="text-[12px] text-white/70">
              {t("desk.salePreview", {
                paura: preview.toFixed(2),
                launch: launch.toFixed(2),
              })}
            </p>
          ) : null}
          <FormField
            label={t("desk.notes")}
            value={notes}
            onChange={setNotes}
            placeholder={t("desk.notesPlaceholder")}
            multiline
          />
          <button
            type="submit"
            disabled={logCash.isPending || !customerName || !wallet}
            className="w-full rounded-2xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {logCash.isPending ? t("common.loading") : t("desk.submit")}
          </button>
        </form>
      </Panel>

      <Panel label={t("desk.saleQueue")}>
        {!canSend ? (
          <p className="mb-3 text-[12px] text-white/60">{t("desk.saleOnlyLaszlo")}</p>
        ) : null}
        {queue.isLoading ? (
          <Shimmer className="h-16" />
        ) : !queue.data?.orders.length ? (
          <p className="text-sm text-white/60">{t("desk.saleNoOrders")}</p>
        ) : (
          <ul className="space-y-3">
            {queue.data.orders.map((order) => (
              <li
                key={order.id}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              >
                <p className="font-semibold">
                  {order.customer_name} · {order.amount_usdc} USDC ·{" "}
                  {Number(order.p_aura_amount).toFixed(2)} pAURA
                </p>
                <p className="mt-1 break-all font-mono text-[11px] text-white/60">{order.wallet}</p>
                <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/50">
                  {order.status === "sent"
                    ? t("desk.saleStatusSent")
                    : order.status === "canceled"
                      ? t("desk.saleStatusCanceled")
                      : t("desk.saleStatusLogged")}
                  {order.closer ? ` · ${order.closer}` : ""}
                </p>
                {order.tx_hash ? (
                  <a
                    href={`https://basescan.org/tx/${order.tx_hash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block font-mono text-[11px] text-primary"
                  >
                    {order.tx_hash}
                  </a>
                ) : null}
                {canSend && order.status === "logged" ? (
                  <button
                    type="button"
                    disabled={send.isPending}
                    onClick={() => send.mutate(order.id)}
                    className="mt-3 rounded-2xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                  >
                    {send.isPending ? t("common.loading") : t("desk.saleSend")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error ?? new Error("Datei unlesbar"));
    reader.readAsDataURL(file);
  });
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
  const inputClass = `w-full rounded-2xl border border-white/20 bg-white/5 px-4 py-3 text-base text-white placeholder:text-white/40 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/50 ${className}`;

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

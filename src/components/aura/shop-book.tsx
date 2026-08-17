import { useMutation } from "@tanstack/react-query";
import { Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { requestShopBooking, type ShopCatalogItem } from "@/lib/shop-catalog.functions";
import type { PublicLocalBusiness } from "@/lib/reviews.public.functions";

function formatPrice(item: ShopCatalogItem) {
  if (item.price_cents == null) return null;
  return `${(item.price_cents / 100).toFixed(2)} ${item.currency}`;
}

export function ShopCatalogAndBook({ shop }: { shop: PublicLocalBusiness }) {
  const [open, setOpen] = useState(false);
  const [itemId, setItemId] = useState<string>("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [when, setWhen] = useState("");
  const [message, setMessage] = useState("");

  const book = useMutation({
    mutationFn: () =>
      requestShopBooking({
        data: {
          slug: shop.slug,
          catalogItemId: itemId || undefined,
          customerName: name,
          customerEmail: email,
          customerPhone: phone,
          preferredAt: when || undefined,
          message,
        },
      }),
    onSuccess: (res) => {
      toast.success(`Anfrage bei ${res.company} ist raus.`);
      setOpen(false);
      setName("");
      setEmail("");
      setPhone("");
      setWhen("");
      setMessage("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const hasOffers = shop.catalog.length > 0 || shop.service_details.length > 0;
  if (!hasOffers && !shop.booking_url) return null;

  return (
    <section className="space-y-4">
      {shop.catalog.length > 0 ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
            Angebot
          </p>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {shop.catalog.map((item) => (
              <li key={item.id} className="overflow-hidden rounded-[1.6rem] border border-border/40 bg-card/30">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt=""
                    className="aspect-[16/10] w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
                <div className="p-5">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-primary">{item.kind}</p>
                  <h3 className="mt-1 font-display text-lg font-semibold">{item.name}</h3>
                  {item.description ? (
                    <p className="mt-2 text-[13px] text-muted-foreground">{item.description}</p>
                  ) : null}
                  <p className="mt-3 text-[13px] font-semibold">
                    {[formatPrice(item), item.duration_min ? `${item.duration_min} min` : null]
                      .filter(Boolean)
                      .join(" · ") || "Auf Anfrage"}
                  </p>
                  {item.booking_mode === "link" && (item.booking_url || shop.booking_url) ? (
                    <a
                      href={item.booking_url || shop.booking_url || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-[13px] font-semibold text-primary"
                    >
                      Öffnen
                    </a>
                  ) : item.booking_mode !== "none" ? (
                    <button
                      type="button"
                      onClick={() => {
                        setItemId(item.id);
                        setOpen(true);
                      }}
                      className="mt-3 text-[13px] font-semibold text-primary"
                    >
                      Anfragen
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {shop.booking_url ? (
          <a
            href={shop.booking_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <Calendar className="h-4 w-4" /> Termin / Ticket
          </a>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl border border-border/50 px-4 py-2.5 text-sm font-semibold"
          >
            <Calendar className="h-4 w-4" /> Termin anfragen
          </button>
        )}
      </div>

      {open ? (
        <form
          className="rounded-[1.8rem] border border-border/40 bg-card/30 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            book.mutate();
          }}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
            Buchungsanfrage
          </p>
          {shop.catalog.length > 0 ? (
            <select
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="mt-3 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
            >
              <option value="">Allgemeiner Termin</option>
              {shop.catalog.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          ) : null}
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Dein Name"
            className="mt-2 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Mail"
            className="mt-2 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefon"
            className="mt-2 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          />
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="mt-2 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Was brauchst du?"
            className="mt-2 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          />
          <div className="mt-3 flex gap-2">
            <button
              type="submit"
              disabled={book.isPending}
              className="rounded-2xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Anfrage senden
            </button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">
              Abbrechen
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

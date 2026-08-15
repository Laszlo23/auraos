import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import {
  deleteShopCatalogItem,
  listOwnerBookings,
  listOwnerShopCatalog,
  updateShopBookingStatus,
  upsertShopCatalogItem,
  type CatalogKind,
} from "@/lib/shop-catalog.functions";
import { updateLocalBusinessProfile } from "@/lib/reviews.functions";

export function ShopDesk({
  bookingUrl,
  hoursNote,
}: {
  bookingUrl?: string | null;
  hoursNote?: string | null;
}) {
  const qc = useQueryClient();
  const catalogQ = useQuery({
    queryKey: ["shop-catalog-owner"],
    queryFn: () => listOwnerShopCatalog(),
  });
  const bookingsQ = useQuery({
    queryKey: ["shop-bookings-owner"],
    queryFn: () => listOwnerBookings(),
  });

  const [name, setName] = useState("");
  const [kind, setKind] = useState<CatalogKind>("service");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [blurb, setBlurb] = useState("");
  const [booking, setBooking] = useState(bookingUrl ?? "");
  const [hours, setHours] = useState(hoursNote ?? "");

  const saveOffer = useMutation({
    mutationFn: () =>
      upsertShopCatalogItem({
        data: {
          name,
          kind,
          description: blurb,
          price_cents: price.trim() ? Math.round(Number(price.replace(",", ".")) * 100) : null,
          duration_min: duration.trim() ? Number(duration) : null,
          booking_mode: "request",
        },
      }),
    onSuccess: async () => {
      toast.success("Angebot online.");
      setName("");
      setBlurb("");
      setPrice("");
      setDuration("");
      await qc.invalidateQueries({ queryKey: ["shop-catalog-owner"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveMeta = useMutation({
    mutationFn: () =>
      updateLocalBusinessProfile({
        data: { bookingUrl: booking, hoursNote: hours },
      }),
    onSuccess: () => toast.success("Buchung & Zeiten gespeichert."),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Panel label="Leistungen · Produkte · Tickets">
        <p className="mb-4 text-[13px] text-muted-foreground">
          Was Gäste auf deiner öffentlichen Karte buchen oder kaufen können. Keine Fake-Preise — nur
          was du wirklich anbietest.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Haarschnitt / After Shave / Abendkarte"
            className="rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          />
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as CatalogKind)}
            className="rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          >
            <option value="service">Leistung</option>
            <option value="product">Produkt</option>
            <option value="ticket">Ticket / Termin</option>
          </select>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Preis € (optional)"
            className="rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          />
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="Dauer Minuten (optional)"
            className="rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          />
        </div>
        <textarea
          value={blurb}
          onChange={(e) => setBlurb(e.target.value)}
          rows={2}
          placeholder="Kurz was der Gast bekommt"
          className="mt-2 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
        />
        <button
          type="button"
          disabled={saveOffer.isPending || name.trim().length < 2}
          onClick={() => saveOffer.mutate()}
          className="mt-3 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
        >
          Angebot veröffentlichen
        </button>
        <ul className="mt-4 space-y-2">
          {(catalogQ.data ?? []).map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/40 px-3 py-2"
            >
              <div>
                <p className="text-[13px] font-semibold">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.kind}
                  {item.price_cents != null ? ` · ${(item.price_cents / 100).toFixed(2)} €` : ""}
                </p>
              </div>
              <button
                type="button"
                className="text-[11px] text-muted-foreground hover:text-foreground"
                onClick={() =>
                  void deleteShopCatalogItem({ data: { id: item.id } }).then(() =>
                    qc.invalidateQueries({ queryKey: ["shop-catalog-owner"] }),
                  )
                }
              >
                Weg
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel label="Buchung / Ticketing">
        <p className="mb-3 text-[13px] text-muted-foreground">
          Externes System (Calendly, Treatwell, eigenes Ticket) oder Anfragen hier im Posteingang.
        </p>
        <input
          value={booking}
          onChange={(e) => setBooking(e.target.value)}
          placeholder="https://… Buchungs- oder Ticket-Link"
          className="w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
        />
        <input
          value={hours}
          onChange={(e) => setHours(e.target.value)}
          placeholder="Öffnungszeiten / nach Vereinbarung"
          className="mt-2 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
        />
        <button
          type="button"
          disabled={saveMeta.isPending}
          onClick={() => saveMeta.mutate()}
          className="mt-3 rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
        >
          Speichern
        </button>
      </Panel>

      <Panel label="Anfragen">
        {(bookingsQ.data ?? []).length === 0 ? (
          <p className="text-[13px] text-muted-foreground">Noch keine Buchungsanfragen.</p>
        ) : (
          <ul className="space-y-3">
            {(bookingsQ.data ?? []).map((b) => (
              <li key={b.id} className="rounded-2xl border border-border/40 px-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[13px] font-semibold">{b.customer_name}</p>
                  <Chip tone={b.status === "confirmed" ? "primary" : "neutral"}>{b.status}</Chip>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {[b.customer_email, b.customer_phone, b.preferred_at].filter(Boolean).join(" · ")}
                </p>
                {b.message ? <p className="mt-1 text-[13px]">{b.message}</p> : null}
                {b.status === "pending" ? (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-primary"
                      onClick={() =>
                        void updateShopBookingStatus({ data: { id: b.id, status: "confirmed" } }).then(
                          () => qc.invalidateQueries({ queryKey: ["shop-bookings-owner"] }),
                        )
                      }
                    >
                      Zusagen
                    </button>
                    <button
                      type="button"
                      className="text-[12px] text-muted-foreground"
                      onClick={() =>
                        void updateShopBookingStatus({ data: { id: b.id, status: "declined" } }).then(
                          () => qc.invalidateQueries({ queryKey: ["shop-bookings-owner"] }),
                        )
                      }
                    >
                      Absagen
                    </button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

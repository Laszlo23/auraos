import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Chip, Panel } from "@/components/aura/primitives";
import { supabase } from "@/integrations/supabase/client";
import { updateLocalBusinessProfile } from "@/lib/reviews.functions";
import {
  addShopMedia,
  deleteShopMedia,
  listOwnerShopMedia,
  updateShopMediaCaption,
} from "@/lib/shop-media.functions";
import {
  deleteShopCatalogItem,
  listOwnerBookings,
  listOwnerShopCatalog,
  setShopCatalogImage,
  updateShopBookingStatus,
  upsertShopCatalogItem,
  type CatalogKind,
} from "@/lib/shop-catalog.functions";

async function uploadShopAsset(opts: {
  companyId: string;
  folder: "cover" | "gallery" | "catalog";
  file: File;
  fileKey?: string;
}) {
  if (!opts.file.type.startsWith("image/")) {
    throw new Error("Nur Bilder (JPG/PNG/WebP).");
  }
  if (opts.file.size > 12 * 1024 * 1024) {
    throw new Error("Bild zu groß — max. 12 MB.");
  }
  const ext =
    opts.file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "jpg";
  const key = opts.fileKey || crypto.randomUUID();
  const path = `${opts.companyId}/shop/${opts.folder}/${key}.${ext}`;
  const { error } = await supabase.storage.from("product-assets").upload(path, opts.file, {
    contentType: opts.file.type || "image/jpeg",
    upsert: opts.folder === "cover",
  });
  if (error) throw new Error(error.message);
  const { data: pub } = supabase.storage.from("product-assets").getPublicUrl(path);
  return pub.publicUrl;
}

export function ShopDesk({
  companyId,
  bookingUrl,
  hoursNote,
  coverUrl,
  publicStory,
}: {
  companyId?: string | null;
  bookingUrl?: string | null;
  hoursNote?: string | null;
  coverUrl?: string | null;
  publicStory?: string | null;
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
  const mediaQ = useQuery({
    queryKey: ["shop-media-owner"],
    queryFn: () => listOwnerShopMedia(),
    enabled: Boolean(companyId),
  });

  const [name, setName] = useState("");
  const [kind, setKind] = useState<CatalogKind>("service");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [blurb, setBlurb] = useState("");
  const [booking, setBooking] = useState(bookingUrl ?? "");
  const [hours, setHours] = useState(hoursNote ?? "");
  const [story, setStory] = useState(publicStory ?? "");
  const [coverPreview, setCoverPreview] = useState(coverUrl ?? "");
  const coverInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setBooking(bookingUrl ?? "");
    setHours(hoursNote ?? "");
    setStory(publicStory ?? "");
    setCoverPreview(coverUrl ?? "");
  }, [bookingUrl, hoursNote, publicStory, coverUrl]);

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

  const saveStory = useMutation({
    mutationFn: () =>
      updateLocalBusinessProfile({
        data: { publicStory: story },
      }),
    onSuccess: async () => {
      toast.success("Geschichte gespeichert.");
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadCover = useMutation({
    mutationFn: async (file: File) => {
      if (!companyId) throw new Error("Betrieb fehlt.");
      const url = await uploadShopAsset({ companyId, folder: "cover", file, fileKey: "cover" });
      await updateLocalBusinessProfile({ data: { coverUrl: url } });
      return url;
    },
    onSuccess: async (url) => {
      setCoverPreview(url);
      toast.success("Cover online — so sieht dein Hero aus.");
      await qc.invalidateQueries({ queryKey: ["local-business-hub"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadGallery = useMutation({
    mutationFn: async (file: File) => {
      if (!companyId) throw new Error("Betrieb fehlt.");
      const url = await uploadShopAsset({ companyId, folder: "gallery", file });
      await addShopMedia({ data: { url } });
      return url;
    },
    onSuccess: async () => {
      toast.success("Galerie-Bild hinzugefügt.");
      await qc.invalidateQueries({ queryKey: ["shop-media-owner"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadCatalogImage = useMutation({
    mutationFn: async (opts: { id: string; file: File }) => {
      if (!companyId) throw new Error("Betrieb fehlt.");
      const url = await uploadShopAsset({
        companyId,
        folder: "catalog",
        file: opts.file,
        fileKey: opts.id,
      });
      await setShopCatalogImage({ data: { id: opts.id, imageUrl: url } });
      return url;
    },
    onSuccess: async () => {
      toast.success("Angebot-Foto gesetzt.");
      await qc.invalidateQueries({ queryKey: ["shop-catalog-owner"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Panel label="Look · Cover · Galerie">
        <p className="mb-4 text-[13px] text-muted-foreground">
          Deine öffentliche Karte soll wie dein Laden aussehen — nicht wie unser Stock-Hero. Cover
          für den Vollbild-Hero, Galerie für „So sieht&apos;s aus“.
        </p>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Cover</p>
            <div className="mt-2 overflow-hidden rounded-[1.4rem] border border-border/40 bg-foreground/5">
              {coverPreview ? (
                <img src={coverPreview} alt="" className="aspect-[16/9] w-full object-cover" />
              ) : (
                <div className="grid aspect-[16/9] place-items-center text-[12px] text-muted-foreground">
                  Noch kein Cover
                </div>
              )}
            </div>
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) uploadCover.mutate(file);
              }}
            />
            <button
              type="button"
              disabled={!companyId || uploadCover.isPending}
              onClick={() => coverInput.current?.click()}
              className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-40"
            >
              {uploadCover.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <ImagePlus className="h-3.5 w-3.5" />
              )}
              Cover hochladen
            </button>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Galerie ({(mediaQ.data ?? []).length}/12)
            </p>
            <input
              ref={galleryInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) uploadGallery.mutate(file);
              }}
            />
            <button
              type="button"
              disabled={!companyId || uploadGallery.isPending || (mediaQ.data?.length ?? 0) >= 12}
              onClick={() => galleryInput.current?.click()}
              className="mt-2 w-full rounded-2xl border border-border/50 px-3 py-2.5 text-xs font-semibold disabled:opacity-40"
            >
              {uploadGallery.isPending ? "Lädt…" : "Bild hinzufügen"}
            </button>
            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto">
              {(mediaQ.data ?? []).map((m) => (
                <li key={m.id} className="flex gap-2 rounded-xl border border-border/40 p-1.5">
                  <img src={m.url} alt="" className="h-12 w-16 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <input
                      defaultValue={m.caption ?? ""}
                      placeholder="Caption"
                      className="w-full rounded-lg bg-foreground/5 px-2 py-1 text-[11px] outline-none"
                      onBlur={(e) => {
                        const caption = e.target.value;
                        if (caption === (m.caption ?? "")) return;
                        void updateShopMediaCaption({ data: { id: m.id, caption } }).then(() =>
                          qc.invalidateQueries({ queryKey: ["shop-media-owner"] }),
                        );
                      }}
                    />
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        void deleteShopMedia({ data: { id: m.id } }).then(() =>
                          qc.invalidateQueries({ queryKey: ["shop-media-owner"] }),
                        )
                      }
                    >
                      <Trash2 className="h-3 w-3" /> Weg
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <label className="mt-5 block text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
          Geschichte (öffentliche Karte)
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={4}
            maxLength={1200}
            placeholder="Kurz wer ihr seid — ohne Fake-Sterne-Theater."
            className="mt-2 w-full rounded-2xl bg-foreground/6 px-3.5 py-2.5 text-[13px] outline-none"
          />
        </label>
        <button
          type="button"
          disabled={saveStory.isPending}
          onClick={() => saveStory.mutate()}
          className="mt-3 rounded-2xl border border-border/50 px-4 py-2.5 text-xs font-semibold"
        >
          Geschichte speichern
        </button>
      </Panel>

      <Panel label="Leistungen · Produkte · Tickets">
        <p className="mb-4 text-[13px] text-muted-foreground">
          Was Gäste auf deiner öffentlichen Karte buchen oder kaufen können. Fotos machen das
          Angebot greifbar.
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
              <div className="flex min-w-0 items-center gap-3">
                {item.image_url ? (
                  <img src={item.image_url} alt="" className="h-10 w-14 rounded-lg object-cover" />
                ) : (
                  <span className="grid h-10 w-14 place-items-center rounded-lg bg-foreground/5 text-[10px] text-muted-foreground">
                    Foto
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold">{item.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.kind}
                    {item.price_cents != null ? ` · ${(item.price_cents / 100).toFixed(2)} €` : ""}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className="cursor-pointer text-[11px] font-semibold text-primary">
                  Foto
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!companyId || uploadCatalogImage.isPending}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) uploadCatalogImage.mutate({ id: item.id, file });
                    }}
                  />
                </label>
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
              </div>
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
                        void updateShopBookingStatus({
                          data: { id: b.id, status: "confirmed" },
                        }).then(() => qc.invalidateQueries({ queryKey: ["shop-bookings-owner"] }))
                      }
                    >
                      Zusagen
                    </button>
                    <button
                      type="button"
                      className="text-[12px] text-muted-foreground"
                      onClick={() =>
                        void updateShopBookingStatus({
                          data: { id: b.id, status: "declined" },
                        }).then(() => qc.invalidateQueries({ queryKey: ["shop-bookings-owner"] }))
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

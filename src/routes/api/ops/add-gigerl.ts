/**
 * Temporary ops endpoint to add Gigerl as a paid local business
 * DELETE THIS FILE after running once
 */
import { json } from "@tanstack/react-start";
import type { APIEvent } from "@tanstack/react-start";

export async function POST({ request }: APIEvent) {
  try {
    const { createClient } = await import("@supabase/supabase-js");
    
    const url = process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"];
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    
    if (!url || !key) {
      return json({ error: "Supabase not configured" }, { status: 500 });
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Get first user as owner
    const { data: users } = await supabase
      .from("profiles")
      .select("id")
      .order("created_at")
      .limit(1);

    if (!users || users.length === 0) {
      return json({ error: "No users found" }, { status: 500 });
    }

    const ownerId = users[0].id;

    // Check if Gigerl already exists
    const { data: existing } = await supabase
      .from("companies")
      .select("id, slug, name")
      .eq("slug", "gigerl")
      .maybeSingle();

    if (existing) {
      return json({
        ok: true,
        message: "Gigerl already exists",
        company: existing,
        url: `https://aibusiness.fun/b/gigerl`,
      });
    }

    // Insert Gigerl
    const { data: company, error: insertError } = await supabase
      .from("companies")
      .insert({
        owner_id: ownerId,
        name: "Gigerl",
        slug: "gigerl",
        tagline: "Traditioneller Stadtheuriger im Herzen Wiens – 75% BIO-zertifiziert",
        emoji: "🍷",
        city: "Wien",
        niche: "Heuriger",
        homepage_url: "https://www.gigerl.at/",
        google_review_url:
          "https://www.google.com/maps/search/?api=1&query=Stadtheuriger+Gigerl,Rauhensteingasse+3,1010+Wien",
        street: "Rauhensteingasse 3 (Eingang Blumenstockgasse 2)",
        postal_code: "1010",
        district: "1. Bezirk",
        phone: "+43 1 513 44 31",
        public_email: "office@gigerl.at",
        hours_note: "Mo–Sa 16:00–24:00 Uhr | Warme Küche bis 23:00 | Sonntag geschlossen",
        services: [
          "Heurigenbuffet",
          "Wiener Küche",
          "Weinverkostung",
          "Gastgarten",
          "Kaiserschmarrn",
          "BIO-zertifiziert",
        ],
        is_local_business: true,
        featured: false,
        entry_funnel: "local",
        ui_locale: "de",
        local_seat_paid_at: new Date().toISOString(),
        network_backlink: true,
      })
      .select("id")
      .single();

    if (insertError) {
      return json({ error: insertError.message }, { status: 500 });
    }

    if (!company) {
      return json({ error: "Failed to create company" }, { status: 500 });
    }

    // Assign local cohort number
    const { error: cohortError } = await supabase.rpc("assign_local_cohort", {
      _company_id: company.id,
    });

    if (cohortError) {
      console.error("Cohort assignment error:", cohortError);
    }

    // Grant initial boost credits
    const { error: boostError } = await supabase.rpc("grant_local_boost", {
      _company_id: company.id,
      _amount: 200,
      _note: "Local Seat unlock (Gigerl) – initial grant",
    });

    if (boostError) {
      console.error("Boost grant error:", boostError);
    }

    return json({
      ok: true,
      message: "Gigerl added successfully!",
      company: { id: company.id, slug: "gigerl", name: "Gigerl" },
      urls: {
        wien: "https://aibusiness.fun/wien",
        business: "https://aibusiness.fun/b/gigerl",
      },
    });
  } catch (error) {
    console.error("Error adding Gigerl:", error);
    return json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

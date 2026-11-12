// Called by the app when a user opens a place page.
// Returns busyness for the place, reusing a reading less than 10 minutes old.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getProvider } from "../_shared/busyness.ts";

const FRESH_MS = 10 * 60_000;
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  // Require a signed-in user.
  const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401, headers: cors });

  const { place } = await req.json(); // { google_place_id, name, address, lat, lng, timezone }
  if (!place?.google_place_id) return new Response("Missing place", { status: 400, headers: cors });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: existing } = await admin.from("places").select("*")
    .eq("google_place_id", place.google_place_id).maybeSingle();

  if (existing?.checked_at && Date.now() - new Date(existing.checked_at).getTime() < FRESH_MS) {
    return Response.json(existing, { headers: cors });
  }

  const r = await getProvider().fetch(place);
  const row = {
    google_place_id: place.google_place_id,
    name: place.name,
    address: place.address ?? null,
    lat: place.lat ?? null,
    lng: place.lng ?? null,
    timezone: place.timezone ?? existing?.timezone ?? null,
    live_busyness: r.live,
    live_label: r.liveLabel,
    usual_by_day: r.usualByDay,
    checked_at: new Date().toISOString(),
  };
  const { data, error } = await admin.from("places").upsert(row).select().single();
  if (error) return new Response(error.message, { status: 500, headers: cors });
  return Response.json(data, { headers: cors });
});

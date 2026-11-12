// Runs every 10 minutes (pg_cron). For every favorited place:
// 1. fetch busyness once, 2. store it, 3. alert users whose rules match.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getProvider } from "../_shared/busyness.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const provider = getProvider();

  // Only places that at least one user has alerts on for.
  const { data: favs, error } = await supabase
    .from("favorites")
    .select("*, places(*)")
    .eq("alerts_enabled", true);
  if (error) return new Response(error.message, { status: 500 });

  const byPlace = new Map<string, any[]>();
  for (const f of favs ?? []) {
    const list = byPlace.get(f.google_place_id) ?? [];
    list.push(f);
    byPlace.set(f.google_place_id, list);
  }

  const results: Record<string, unknown> = {};
  for (const [placeId, placeFavs] of byPlace) {
    const place = placeFavs[0].places;
    // Skip if nobody's alert window is open right now (saves API calls).
    if (!placeFavs.some((f) => inWindow(f, place.timezone))) continue;
    try {
      const r = await provider.fetch(place);
      await supabase.from("places").update({
        live_busyness: r.live,
        live_label: r.liveLabel,
        usual_by_day: r.usualByDay,
        checked_at: new Date().toISOString(),
      }).eq("google_place_id", placeId);
      await supabase.from("busyness_readings").insert({
        google_place_id: placeId, busyness: r.live, label: r.liveLabel,
      });

      if (r.live != null) {
        for (const f of placeFavs) {
          if (shouldAlert(f, r.live, place.timezone)) await alert(f, place, r.live);
        }
      }
      results[placeId] = r.live;
    } catch (e) {
      results[placeId] = `error: ${(e as Error).message}`;
    }
  }
  return Response.json({ checked: results });
});

function localNow(tz: string | null) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz ?? "UTC", weekday: "short", hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minute: (Number(get("hour")) % 24) * 60 + Number(get("minute")) };
}

function inWindow(f: any, tz: string | null) {
  const { day, minute } = localNow(tz);
  return f.days.includes(day) && minute >= f.start_minute && minute < f.end_minute;
}

function shouldAlert(f: any, live: number, tz: string | null) {
  if (!inWindow(f, tz) || live > f.threshold) return false;
  if (!f.last_alert_at) return true;
  return Date.now() - new Date(f.last_alert_at).getTime() > f.cooldown_min * 60_000;
}

// Alert text in each user's language (stored with their push token).
const MESSAGES = {
  fr: {
    title: (name: string) => `${name} est tranquille en ce moment`,
    body: (pct: number) => `Achalandage : ${pct} %. C'est le bon moment pour y aller!`,
  },
  en: {
    title: (name: string) => `${name} isn't busy right now`,
    body: (pct: number) => `${pct}% busy. Good time to go!`,
  },
  es: {
    title: (name: string) => `${name} está tranquilo ahora`,
    body: (pct: number) => `Afluencia: ${pct}%. ¡Buen momento para ir!`,
  },
} as const;

async function alert(f: any, place: any, live: number) {
  const { data: tokens } = await supabase.from("push_tokens").select("token, locale").eq("user_id", f.user_id);
  if (!tokens?.length) return;
  await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(tokens.map((t) => {
      const m = MESSAGES[(t.locale as keyof typeof MESSAGES) ?? "fr"] ?? MESSAGES.fr;
      return {
        to: t.token,
        channelId: "alerts",
        title: m.title(place.name),
        body: m.body(live),
        data: { placeId: place.google_place_id },
      };
    })),
  });
  await supabase.from("favorites").update({ last_alert_at: new Date().toISOString() }).eq("id", f.id);
}

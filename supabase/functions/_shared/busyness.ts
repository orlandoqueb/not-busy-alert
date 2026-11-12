// The one swappable piece: where busyness data comes from.
// To change provider, add another implementation and switch BUSYNESS_PROVIDER.

export type HourScore = { hour: number; score: number };
export type BusynessReading = {
  live: number | null;          // 0-100 right now, null if the place has no live data
  liveLabel: string | null;     // e.g. "Not too busy"
  usualByDay: Record<string, HourScore[]> | null; // keys: sunday..saturday
};

export interface BusynessProvider {
  fetch(place: { google_place_id: string; name: string; address: string | null }): Promise<BusynessReading>;
}

// SerpApi Google Maps engine: returns Google's Popular Times for a place.
// Docs: https://serpapi.com/google-maps-api (field names checked defensively
// because they have changed over time).
export class SerpApiProvider implements BusynessProvider {
  constructor(private apiKey: string) {}

  async fetch(place: { google_place_id: string }): Promise<BusynessReading> {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("engine", "google_maps");
    url.searchParams.set("place_id", place.google_place_id);
    url.searchParams.set("hl", "en");
    url.searchParams.set("api_key", this.apiKey);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`SerpApi ${res.status}: ${await res.text()}`);
    const body = await res.json();
    const pt = body?.place_results?.popular_times;
    if (!pt) return { live: null, liveLabel: null, usualByDay: null };

    const usualByDay: Record<string, HourScore[]> = {};
    for (const [day, hours] of Object.entries(pt.graph_results ?? {})) {
      usualByDay[day] = (hours as any[]).map((h) => ({
        hour: parseHour(h.time),
        score: Number(h.busyness_score ?? 0),
      }));
    }

    const liveInfo: string | null = pt.live_hash?.info ?? null;
    // Some responses carry a live score directly; otherwise estimate from the label.
    const liveScore =
      typeof pt.live_hash?.busyness_score === "number"
        ? pt.live_hash.busyness_score
        : labelToScore(liveInfo);
    return { live: liveScore, liveLabel: liveInfo, usualByDay };
  }
}

// Fake provider for building and testing the app without a paid key.
export class SampleProvider implements BusynessProvider {
  async fetch(): Promise<BusynessReading> {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const usualByDay: Record<string, HourScore[]> = {};
    for (const d of days) {
      usualByDay[d] = Array.from({ length: 18 }, (_, i) => {
        const hour = i + 6;
        const score = Math.round(80 * Math.exp(-((hour - 13) ** 2) / 12));
        return { hour, score };
      });
    }
    const live = Math.floor(Math.random() * 100);
    return { live, liveLabel: live < 40 ? "Not too busy" : live < 70 ? "A little busy" : "Busy", usualByDay };
  }
}

export function getProvider(): BusynessProvider {
  const which = Deno.env.get("BUSYNESS_PROVIDER") ?? "serpapi";
  if (which === "sample") return new SampleProvider();
  const key = Deno.env.get("SERPAPI_KEY");
  if (!key) throw new Error("SERPAPI_KEY is not set");
  return new SerpApiProvider(key);
}

function parseHour(t: string): number {
  const m = /^(\d{1,2})\s*(AM|PM)/i.exec(t ?? "");
  if (!m) return 0;
  let h = Number(m[1]) % 12;
  if (m[2].toUpperCase() === "PM") h += 12;
  return h;
}

function labelToScore(label: string | null): number | null {
  if (!label) return null;
  const l = label.toLowerCase();
  if (l.includes("not busy")) return 15;
  if (l.includes("not too busy")) return 30;
  if (l.includes("little busy")) return 50;
  if (l.includes("as busy as it gets")) return 100;
  if (l.includes("busier than usual") || l.includes("busy")) return 75;
  return null;
}

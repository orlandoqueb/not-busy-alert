// Google Places API (New): search suggestions and place details.
// Busyness does NOT come from here; it comes from our backend (SerpApi).
const KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY!;
const BASE = 'https://places.googleapis.com/v1';

export type Suggestion = { placeId: string; main: string; secondary: string };

export async function autocomplete(input: string, sessionToken: string): Promise<Suggestion[]> {
  if (input.trim().length < 2) return [];
  const res = await fetch(`${BASE}/places:autocomplete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY },
    body: JSON.stringify({ input, sessionToken }),
  });
  if (!res.ok) throw new Error(`Place search failed (${res.status})`);
  const body = await res.json();
  return (body.suggestions ?? [])
    .map((s: any) => s.placePrediction)
    .filter(Boolean)
    .map((p: any) => ({
      placeId: p.placeId,
      main: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondary: p.structuredFormat?.secondaryText?.text ?? '',
    }));
}

export type PlaceDetails = {
  google_place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
};

export async function placeDetails(placeId: string, sessionToken?: string): Promise<PlaceDetails> {
  const qs = sessionToken ? `?sessionToken=${encodeURIComponent(sessionToken)}` : '';
  const res = await fetch(`${BASE}/places/${placeId}${qs}`, {
    headers: {
      'X-Goog-Api-Key': KEY,
      'X-Goog-FieldMask': 'id,displayName,formattedAddress,location,timeZone',
    },
  });
  if (!res.ok) throw new Error(`Place details failed (${res.status})`);
  const p = await res.json();
  return {
    google_place_id: p.id,
    name: p.displayName?.text ?? 'Unknown place',
    address: p.formattedAddress ?? null,
    lat: p.location?.latitude ?? null,
    lng: p.location?.longitude ?? null,
    timezone: p.timeZone?.id ?? null,
  };
}

export function newSessionToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

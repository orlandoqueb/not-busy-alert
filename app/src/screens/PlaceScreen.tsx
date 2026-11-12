import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { BusynessChart } from '../components/BusynessChart';
import { placeDetails } from '../lib/places';
import { registerForPush } from '../lib/push';
import { Favorite, Place, supabase } from '../lib/supabase';
import { busynessColor, colors, localDayHour } from '../theme';

type Props = { placeId: string; sessionToken?: string; userId: string; onBack: () => void };
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function PlaceScreen({ placeId, sessionToken, userId, onBack }: Props) {
  const [place, setPlace] = useState<Place | null>(null);
  const [fav, setFav] = useState<Favorite | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const details = await placeDetails(placeId, sessionToken);
        // Backend returns cached busyness or fetches fresh data from SerpApi.
        const { data, error } = await supabase.functions.invoke('place-busyness', { body: { place: details } });
        if (error) throw error;
        setPlace(data as Place);
        const { data: f } = await supabase.from('favorites').select('*')
          .eq('google_place_id', placeId).maybeSingle();
        setFav(f as Favorite | null);
      } catch (e) {
        setError((e as Error).message);
      }
    })();
  }, [placeId, sessionToken]);

  async function addFavorite() {
    setSaving(true);
    const { data, error } = await supabase.from('favorites')
      .insert({ user_id: userId, google_place_id: placeId })
      .select().single();
    setSaving(false);
    if (error) return setError(error.message);
    setFav(data as Favorite);
    setNotice(await registerForPush(userId));
  }

  async function removeFavorite() {
    if (!fav) return;
    await supabase.from('favorites').delete().eq('id', fav.id);
    setFav(null);
  }

  async function update(patch: Partial<Favorite>) {
    if (!fav) return;
    const next = { ...fav, ...patch };
    setFav(next);
    const { error } = await supabase.from('favorites').update(patch).eq('id', fav.id);
    if (error) setError(error.message);
  }

  if (error) {
    return (
      <View style={styles.wrap}>
        <Pressable onPress={onBack}><Text style={styles.link}>‹ Back</Text></Pressable>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }
  if (!place) {
    return <View style={[styles.wrap, styles.center]}><ActivityIndicator /></View>;
  }

  const { day, hour } = localDayHour(place.timezone);

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={{ paddingBottom: 48 }}>
      <Pressable onPress={onBack}><Text style={styles.link}>‹ Back</Text></Pressable>
      <Text style={styles.title}>{place.name}</Text>
      {place.address && <Text style={styles.sub}>{place.address}</Text>}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Popular times</Text>
        {place.live_busyness != null ? (
          <Text style={[styles.live, { color: busynessColor(place.live_busyness) }]}>
            ● Live: {place.live_label ?? `${place.live_busyness}% busy`}
          </Text>
        ) : (
          <Text style={styles.sub}>No live data right now.</Text>
        )}
        <BusynessChart usualByDay={place.usual_by_day} live={place.live_busyness} today={day} nowHour={hour} />
      </View>

      {!fav ? (
        <Pressable style={styles.button} onPress={addFavorite} disabled={saving}>
          <Text style={styles.buttonText}>☆ Add to favorites</Text>
        </Pressable>
      ) : (
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Alert me when it's quiet</Text>
            <Switch value={fav.alerts_enabled} onValueChange={(v) => update({ alerts_enabled: v })} />
          </View>

          <Text style={styles.label}>When busyness is under</Text>
          <Stepper value={fav.threshold} step={10} min={10} max={90} suffix="%"
            onChange={(v) => update({ threshold: v })} />

          <Text style={styles.label}>On these days</Text>
          <View style={styles.days}>
            {DAY_LABELS.map((d, i) => {
              const on = fav.days.includes(i);
              return (
                <Pressable key={i} style={[styles.day, on && styles.dayOn]}
                  onPress={() => update({ days: on ? fav.days.filter((x) => x !== i) : [...fav.days, i].sort() })}>
                  <Text style={[styles.dayText, on && styles.dayTextOn]}>{d}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Between</Text>
          <View style={styles.rowBetween}>
            <Stepper value={fav.start_minute / 60} step={1} min={0} max={23} format={fmtHour}
              onChange={(v) => update({ start_minute: v * 60 })} />
            <Text style={styles.sub}>and</Text>
            <Stepper value={fav.end_minute / 60} step={1} min={1} max={24} format={fmtHour}
              onChange={(v) => update({ end_minute: v * 60 })} />
          </View>

          {notice && <Text style={styles.notice}>{notice}</Text>}

          <Pressable onPress={removeFavorite} style={{ marginTop: 16 }}>
            <Text style={[styles.link, { color: colors.live }]}>Remove from favorites</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function Stepper(props: {
  value: number; step: number; min: number; max: number; suffix?: string;
  format?: (v: number) => string; onChange: (v: number) => void;
}) {
  const { value, step, min, max, suffix = '', format, onChange } = props;
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - step))}>
        <Text style={styles.stepText}>−</Text>
      </Pressable>
      <Text style={styles.stepValue}>{format ? format(value) : `${value}${suffix}`}</Text>
      <Pressable style={styles.stepBtn} onPress={() => onChange(Math.min(max, value + step))}>
        <Text style={styles.stepText}>+</Text>
      </Pressable>
    </View>
  );
}

function fmtHour(h: number) {
  if (h === 24) return 'Midnight';
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 56 },
  center: { justifyContent: 'center', alignItems: 'center' },
  link: { color: colors.primary, fontSize: 16, marginBottom: 12 },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, fontSize: 14, marginTop: 4 },
  card: { backgroundColor: colors.card, borderRadius: 16, padding: 16, marginTop: 16 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 6 },
  live: { fontWeight: '600', marginBottom: 12 },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { color: colors.muted, marginTop: 16, marginBottom: 8 },
  days: { flexDirection: 'row', gap: 6 },
  day: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dayOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayText: { color: colors.text },
  dayTextOn: { color: '#fff', fontWeight: '600' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 20, color: colors.primary },
  stepValue: { minWidth: 56, textAlign: 'center', fontSize: 16, fontWeight: '600', color: colors.text },
  notice: { color: '#E37400', marginTop: 16 },
  error: { color: colors.live, marginTop: 16 },
});

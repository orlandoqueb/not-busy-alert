import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { LanguagePicker } from '../components/LanguagePicker';
import { busyLabel, useI18n } from '../i18n';
import { signOut } from '../lib/auth';
import { updatePushLanguage } from '../lib/push';
import { autocomplete, newSessionToken, Suggestion } from '../lib/places';
import { Favorite, supabase } from '../lib/supabase';
import { busynessColor, colors } from '../theme';

type Props = { userId: string; onOpenPlace: (placeId: string, sessionToken?: string) => void };

export function HomeScreen({ userId, onOpenPlace }: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef(newSessionToken());

  const loadFavorites = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('favorites')
      .select('*, places(*)')
      .order('created_at', { ascending: false });
    if (error) setError(error.message);
    else setFavorites((data as Favorite[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadFavorites(); }, [loadFavorites]);

  // Debounced search as the user types.
  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        setSuggestions(await autocomplete(query, session.current));
      } catch (e) {
        setError((e as Error).message);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function open(placeId: string, fromSearch: boolean) {
    onOpenPlace(placeId, fromSearch ? session.current : undefined);
    if (fromSearch) {
      session.current = newSessionToken();
      setQuery('');
      setSuggestions([]);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Image source={require('../../assets/logo.png')} style={styles.logo} />
        <Text style={styles.title} numberOfLines={1}>{t.appName}</Text>
        <LanguagePicker onChange={(l) => updatePushLanguage(userId, l).catch(() => {})} />
      </View>

      <TextInput
        style={styles.search}
        placeholder={t.searchPlaceholder}
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
      />

      {suggestions.length > 0 ? (
        <FlatList
          data={suggestions}
          keyExtractor={(s) => s.placeId}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => open(item.placeId, true)}>
              <Text style={styles.rowTitle}>{item.main}</Text>
              <Text style={styles.rowSub}>{item.secondary}</Text>
            </Pressable>
          )}
        />
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(f) => f.id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={loadFavorites} />}
          ListHeaderComponent={<Text style={styles.section}>{t.myPlaces}</Text>}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.empty}>{t.emptyFavorites}</Text>
            ) : undefined
          }
          renderItem={({ item }) => {
            const p = item.places;
            return (
              <Pressable style={styles.row} onPress={() => open(item.google_place_id, false)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p?.name}</Text>
                  <Text style={styles.rowSub}>
                    {item.alerts_enabled ? t.alertUnder(item.threshold) : t.alertsOff}
                  </Text>
                </View>
                <View style={styles.badgeWrap}>
                  <Text style={[styles.badge, { color: busynessColor(p?.live_busyness ?? null) }]}>
                    {p?.live_busyness != null ? `${p.live_busyness}%` : '–'}
                  </Text>
                  {p?.live_busyness != null && (
                    <Text style={[styles.badgeLabel, { color: busynessColor(p.live_busyness) }]}>
                      {busyLabel(t, p.live_busyness)}
                    </Text>
                  )}
                </View>
              </Pressable>
            );
          }}
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}
      <Pressable onPress={signOut} style={styles.signOut}>
        <Text style={styles.link}>{t.signOut}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 56 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  logo: { width: 36, height: 36, borderRadius: 9 },
  title: { flex: 1, fontSize: 22, fontWeight: '700', color: colors.text },
  signOut: { alignItems: 'center', paddingVertical: 16 },
  link: { color: colors.primary },
  search: {
    backgroundColor: colors.card, borderRadius: 24, paddingHorizontal: 18, paddingVertical: 12,
    fontSize: 16, borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  section: { fontSize: 13, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', marginVertical: 8 },
  row: {
    backgroundColor: colors.card, padding: 14, borderRadius: 12, marginBottom: 8,
    flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap',
  },
  rowTitle: { fontSize: 16, fontWeight: '600', color: colors.text, width: '100%' },
  rowSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  badgeWrap: { alignItems: 'flex-end', marginLeft: 12 },
  badge: { fontSize: 18, fontWeight: '700' },
  badgeLabel: { fontSize: 11, fontWeight: '600' },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
  error: { color: colors.live, padding: 8 },
});

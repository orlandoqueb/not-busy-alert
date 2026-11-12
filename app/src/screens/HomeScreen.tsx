import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { signOut } from '../lib/auth';
import { autocomplete, newSessionToken, Suggestion } from '../lib/places';
import { Favorite, supabase } from '../lib/supabase';
import { busynessColor, colors } from '../theme';

type Props = { onOpenPlace: (placeId: string, sessionToken?: string) => void };

export function HomeScreen({ onOpenPlace }: Props) {
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
        <Text style={styles.title}>Not Busy Alert</Text>
        <Pressable onPress={signOut}><Text style={styles.link}>Sign out</Text></Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search for a place or address"
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
          ListHeaderComponent={<Text style={styles.section}>My places</Text>}
          ListEmptyComponent={
            !loading ? (
              <Text style={styles.empty}>
                Search for a place above, then tap "Add to favorites" to get alerts when it's quiet.
              </Text>
            ) : undefined
          }
          renderItem={({ item }) => {
            const p = item.places;
            return (
              <Pressable style={styles.row} onPress={() => open(item.google_place_id, false)}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{p?.name}</Text>
                  <Text style={styles.rowSub}>
                    {item.alerts_enabled ? `Alert under ${item.threshold}% busy` : 'Alerts off'}
                  </Text>
                </View>
                <Text style={[styles.badge, { color: busynessColor(p?.live_busyness ?? null) }]}>
                  {p?.live_busyness != null ? `${p.live_busyness}%` : '–'}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
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
  badge: { fontSize: 18, fontWeight: '700', marginLeft: 12 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 32, paddingHorizontal: 24 },
  error: { color: colors.live, padding: 8 },
});

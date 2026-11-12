import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useI18n } from '../i18n';
import { colors } from '../theme';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

type Props = {
  usualByDay: Record<string, { hour: number; score: number }[]> | null;
  live: number | null;
  today: number;      // 0 = Sunday, in the place's time zone
  nowHour: number;    // in the place's time zone
};

// Google-style "Popular times" bar chart, with the live reading shown on the current hour.
export function BusynessChart({ usualByDay, live, today, nowHour }: Props) {
  const { t } = useI18n();
  const [day, setDay] = useState(today);
  const hours = usualByDay?.[DAYS[day]] ?? [];

  return (
    <View>
      <View style={styles.tabs}>
        {t.daysShort.map((d, i) => (
          <Pressable key={i} onPress={() => setDay(i)} style={[styles.tab, i === day && styles.tabActive]}>
            <Text style={[styles.tabText, i === day && styles.tabTextActive]}>{d}</Text>
          </Pressable>
        ))}
      </View>

      {hours.length === 0 ? (
        <Text style={styles.empty}>{t.noDayData}</Text>
      ) : (
        <>
          <View style={styles.chart}>
            {hours.map((h) => {
              const isNow = day === today && h.hour === nowHour;
              const value = isNow && live != null ? live : h.score;
              return (
                <View key={h.hour} style={styles.col}>
                  {isNow && live != null && h.score > 0 && (
                    <View style={[styles.usualMarker, { bottom: `${h.score}%` }]} />
                  )}
                  <View
                    style={[
                      styles.bar,
                      { height: `${Math.max(value, 2)}%` },
                      isNow && styles.barNow,
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.axis}>
            {hours.map((h) => (
              <Text key={h.hour} style={styles.axisText}>
                {h.hour % 3 === 0 ? t.hourShort(h.hour) : ''}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  tab: { paddingVertical: 6, paddingHorizontal: 6, borderBottomWidth: 2, borderColor: 'transparent' },
  tabActive: { borderColor: colors.primary },
  tabText: { color: colors.muted, fontSize: 13 },
  tabTextActive: { color: colors.primary, fontWeight: '600' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 3 },
  col: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { backgroundColor: colors.bar, borderRadius: 4 },
  barNow: { backgroundColor: colors.live },
  usualMarker: { position: 'absolute', left: -1, right: -1, height: 2, backgroundColor: colors.text },
  axis: { flexDirection: 'row', gap: 3, marginTop: 4 },
  axisText: { flex: 1, fontSize: 10, color: colors.muted, textAlign: 'center' },
  empty: { color: colors.muted, paddingVertical: 24, textAlign: 'center' },
});

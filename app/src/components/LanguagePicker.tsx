import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Lang, LANGS, useI18n } from '../i18n';
import { colors } from '../theme';

export function LanguagePicker({ onChange }: { onChange?: (l: Lang) => void }) {
  const { lang, setLang } = useI18n();
  return (
    <View style={styles.row} accessibilityRole="radiogroup">
      {LANGS.map((l) => {
        const on = l.code === lang;
        return (
          <Pressable
            key={l.code}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            onPress={() => { setLang(l.code); onChange?.(l.code); }}
            style={[styles.pill, on && styles.pillOn]}
          >
            <Text style={[styles.text, on && styles.textOn]}>{l.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 16, padding: 2, borderWidth: 1, borderColor: colors.border },
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  pillOn: { backgroundColor: colors.primary },
  text: { fontSize: 12, fontWeight: '600', color: colors.muted },
  textOn: { color: '#fff' },
});

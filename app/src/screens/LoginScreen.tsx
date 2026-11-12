import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { signInWithGoogle } from '../lib/auth';
import { colors } from '../theme';

export function LoginScreen() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPress() {
    setBusy(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Not Busy Alert</Text>
      <Text style={styles.subtitle}>
        Save the places you go to, and get a notification when they're quiet.
      </Text>
      <Pressable style={styles.button} onPress={onPress} disabled={busy}>
        {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Continue with Google</Text>}
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: colors.bg },
  title: { fontSize: 32, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.muted, marginBottom: 32 },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: { color: colors.live, marginTop: 16 },
});

import { useState } from 'react';
import {
  ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { LanguagePicker } from '../components/LanguagePicker';
import { Strings, useI18n } from '../i18n';
import { sendPasswordReset, signInWithEmail, signInWithGoogle, signUpWithEmail } from '../lib/auth';
import { colors } from '../theme';

type Mode = 'signIn' | 'signUp';

export function LoginScreen() {
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function run(kind: 'google' | 'email', fn: () => Promise<void>) {
    setBusy(kind);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      setError(friendlyError(t, (e as Error).message));
    } finally {
      setBusy(null);
    }
  }

  function submit() {
    const e = email.trim();
    if (!e) return setError(t.enterEmail);
    if (mode === 'signUp' && password.length < 8) return setError(t.passwordTooShort);
    run('email', async () => {
      if (mode === 'signIn') return signInWithEmail(e, password);
      const result = await signUpWithEmail(e, password);
      if (result === 'confirm') setInfo(t.confirmEmail);
    });
  }

  function forgot() {
    const e = email.trim();
    if (!e) return setError(t.enterEmail);
    run('email', async () => {
      await sendPasswordReset(e);
      setInfo(t.resetSent);
    });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.langRow}><LanguagePicker /></View>

        <Image source={require('../../assets/logo.png')} style={styles.logo} accessibilityIgnoresInvertColors />
        <Text style={styles.title}>{t.appName}</Text>
        <Text style={styles.subtitle}>{t.tagline}</Text>

        <Pressable style={styles.google} onPress={() => run('google', signInWithGoogle)} disabled={!!busy}>
          {busy === 'google' ? <ActivityIndicator color={colors.text} /> : (
            <>
              <Text style={styles.googleG}>G</Text>
              <Text style={styles.googleText}>{t.continueWithGoogle}</Text>
            </>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>{t.or}</Text>
          <View style={styles.divider} />
        </View>

        <TextInput
          style={styles.input}
          placeholder={t.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <TextInput
          style={styles.input}
          placeholder={t.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
          textContentType={mode === 'signUp' ? 'newPassword' : 'password'}
          onSubmitEditing={submit}
        />

        <Pressable style={styles.button} onPress={submit} disabled={!!busy}>
          {busy === 'email' ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.buttonText}>{mode === 'signIn' ? t.signIn : t.signUp}</Text>
          )}
        </Pressable>

        {error && <Text style={styles.error}>{error}</Text>}
        {info && <Text style={styles.info}>{info}</Text>}

        <Pressable onPress={() => { setMode(mode === 'signIn' ? 'signUp' : 'signIn'); setError(null); setInfo(null); }}>
          <Text style={styles.link}>{mode === 'signIn' ? t.noAccount : t.haveAccount}</Text>
        </Pressable>
        {mode === 'signIn' && (
          <Pressable onPress={forgot}><Text style={styles.link}>{t.forgotPassword}</Text></Pressable>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function friendlyError(t: Strings, msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return t.invalidLogin;
  if (m.includes('email not confirmed')) return t.emailNotConfirmed;
  if (m.includes('already registered')) return t.alreadyRegistered;
  if (m.includes('password should be')) return t.passwordTooShort;
  return msg;
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 24, paddingTop: 56, maxWidth: 440, width: '100%', alignSelf: 'center' },
  langRow: { alignItems: 'flex-end', marginBottom: 24 },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 16 },
  title: { fontSize: 30, fontWeight: '700', color: colors.text, marginBottom: 8 },
  subtitle: { fontSize: 16, color: colors.muted, marginBottom: 28, lineHeight: 22 },
  google: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 14, borderRadius: 12,
  },
  googleG: { fontSize: 18, fontWeight: '700', color: colors.primary },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.text },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20, gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { color: colors.muted },
  input: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, marginBottom: 10,
  },
  button: { backgroundColor: colors.primary, padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  link: { color: colors.primary, textAlign: 'center', marginTop: 16 },
  error: { color: colors.live, marginTop: 12 },
  info: { color: colors.good, marginTop: 12 },
});

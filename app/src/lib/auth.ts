import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

// Where Supabase sends people back after Google sign-in, email confirmation
// or a password reset link. Add these URLs in
// Supabase > Authentication > URL Configuration > Redirect URLs.
export function getRedirectUrl() {
  if (Platform.OS === 'web') return window.location.origin;
  return makeRedirectUri({ scheme: 'notbusyalert', path: 'auth-callback' });
}

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    // Full-page redirect; Supabase picks the session up from the URL on return.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRedirectUrl() },
    });
    if (error) throw error;
    return;
  }

  const redirectTo = getRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) throw error;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type === 'success') await handleAuthRedirect(result.url);
}

// Email + password. Returns 'confirm' when the user must click the link in
// the confirmation email before they can sign in.
export async function signUpWithEmail(email: string, password: string): Promise<'signed-in' | 'confirm'> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: getRedirectUrl() },
  });
  if (error) throw error;
  // Supabase hides whether the email exists; an existing user comes back with no identities.
  if (data.user && data.user.identities?.length === 0) throw new Error('User already registered');
  return data.session ? 'signed-in' : 'confirm';
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: getRedirectUrl() });
  if (error) throw error;
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// Phones: links from emails and Google open the app at notbusyalert://auth-callback?code=...
// Exchanging the code signs the user in (and fires PASSWORD_RECOVERY for reset links).
export async function handleAuthRedirect(url: string) {
  let code: string | null = null;
  try {
    code = new URL(url).searchParams.get('code');
  } catch {
    return;
  }
  if (!code) return;
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) throw error;
}

export function signOut() {
  return supabase.auth.signOut();
}

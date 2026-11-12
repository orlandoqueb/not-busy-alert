import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

// Google sign-in through Supabase Auth.
// The redirect URL printed by getRedirectUrl() must be added in
// Supabase > Authentication > URL Configuration > Redirect URLs.
export function getRedirectUrl() {
  return makeRedirectUri({ scheme: 'notbusyalert', path: 'auth-callback' });
}

export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    // Full-page redirect; Supabase picks the session up from the URL on return.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
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
  if (result.type !== 'success') return;

  const code = new URL(result.url).searchParams.get('code');
  if (!code) throw new Error('Sign-in did not return a code');
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) throw exchangeError;
}

export function signOut() {
  return supabase.auth.signOut();
}

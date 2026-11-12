import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { I18nProvider } from './src/i18n';
import { handleAuthRedirect } from './src/lib/auth';
import { supabase } from './src/lib/supabase';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PlaceScreen } from './src/screens/PlaceScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';

type Route = { name: 'home' } | { name: 'place'; placeId: string; sessionToken?: string };

export default function App() {
  return (
    <I18nProvider>
      <Main />
    </I18nProvider>
  );
}

function Main() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovering(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Phones: email confirmation and password reset links open the app.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Linking.getInitialURL().then((url) => { if (url) handleAuthRedirect(url).catch(() => {}); });
    const sub = Linking.addEventListener('url', ({ url }) => { handleAuthRedirect(url).catch(() => {}); });
    return () => sub.remove();
  }, []);

  let screen;
  if (session === undefined) {
    screen = <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  } else if (!session) {
    screen = <LoginScreen />;
  } else if (recovering) {
    screen = <ResetPasswordScreen onDone={() => setRecovering(false)} />;
  } else if (route.name === 'place') {
    screen = (
      <PlaceScreen
        key={route.placeId}
        placeId={route.placeId}
        sessionToken={route.sessionToken}
        userId={session.user.id}
        onBack={() => setRoute({ name: 'home' })}
      />
    );
  } else {
    screen = (
      <HomeScreen
        userId={session.user.id}
        onOpenPlace={(placeId, sessionToken) => setRoute({ name: 'place', placeId, sessionToken })}
      />
    );
  }

  return (
    <>
      {screen}
      <StatusBar style="dark" />
    </>
  );
}

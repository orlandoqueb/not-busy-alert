import type { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from './src/lib/supabase';
import { HomeScreen } from './src/screens/HomeScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { PlaceScreen } from './src/screens/PlaceScreen';

type Route = { name: 'home' } | { name: 'place'; placeId: string; sessionToken?: string };

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [route, setRoute] = useState<Route>({ name: 'home' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  let screen;
  if (session === undefined) {
    screen = <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  } else if (!session) {
    screen = <LoginScreen />;
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
      <HomeScreen onOpenPlace={(placeId, sessionToken) => setRoute({ name: 'place', placeId, sessionToken })} />
    );
  }

  return (
    <>
      {screen}
      <StatusBar style="dark" />
    </>
  );
}

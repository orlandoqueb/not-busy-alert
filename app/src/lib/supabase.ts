import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anonKey, {
  auth: {
    // On web the browser keeps the session; on phones we use AsyncStorage.
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: 'pkce',
  },
});

export type Place = {
  google_place_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  live_busyness: number | null;
  live_label: string | null;
  usual_by_day: Record<string, { hour: number; score: number }[]> | null;
  checked_at: string | null;
};

export type Favorite = {
  id: string;
  user_id: string;
  google_place_id: string;
  alerts_enabled: boolean;
  threshold: number;
  days: number[];
  start_minute: number;
  end_minute: number;
  cooldown_min: number;
  places?: Place;
};

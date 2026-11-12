import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { Lang } from '../i18n';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushProblem = 'pushWeb' | 'pushSimulator' | 'pushExpoGoAndroid' | 'pushDenied';

// Ask for permission, get this device's Expo push token and save it with the
// user's language (alerts are written in that language).
// Returns the reason push isn't available, or null on success.
export async function registerForPush(userId: string, lang: Lang): Promise<PushProblem | null> {
  if (Platform.OS === 'web') return 'pushWeb';
  if (!Device.isDevice) return 'pushSimulator';
  // Expo Go on Android cannot receive remote push; a development build can.
  if (Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient') return 'pushExpoGoAndroid';

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Not Busy Alert',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return 'pushDenied';

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await supabase.from('push_tokens').upsert({
    token, user_id: userId, platform: Platform.OS, locale: lang, updated_at: new Date().toISOString(),
  });
  return null;
}

// Keep alert language in sync when the user switches language.
export async function updatePushLanguage(userId: string, lang: Lang) {
  await supabase.from('push_tokens').update({ locale: lang }).eq('user_id', userId);
}

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Ask for permission, get this device's Expo push token and save it for the user.
// Returns a message explaining why push isn't available, or null on success.
export async function registerForPush(userId: string): Promise<string | null> {
  if (Platform.OS === 'web') return 'Alerts on the web version are not supported yet. Use the phone app.';
  if (!Device.isDevice) return 'Push alerts need a real phone, not a simulator.';
  // Expo Go on Android cannot receive remote push; a development build can.
  if (Platform.OS === 'android' && Constants.executionEnvironment === 'storeClient') {
    return 'Expo Go on Android cannot receive alerts. Use a development build to test them.';
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('alerts', {
      name: 'Not busy alerts',
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return 'Notifications are turned off for this app.';

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
  await supabase.from('push_tokens').upsert({
    token, user_id: userId, platform: Platform.OS, updated_at: new Date().toISOString(),
  });
  return null;
}

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotificationPreferences {
  classes: boolean;
  budgets: boolean;
}
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  classes: true,
  budgets: true,
};
const KEY = '@notification_preferences';
export const notificationPreferences = {
  async load(): Promise<NotificationPreferences> {
    const stored = await AsyncStorage.getItem(KEY);
    if (stored) {
      try {
        const value = JSON.parse(stored);
        if (
          value &&
          typeof value.classes === 'boolean' &&
          typeof value.budgets === 'boolean'
        )
          return {classes: value.classes, budgets: value.budgets};
      } catch {
        /* Keep compatible defaults for older installations. */
      }
    }
    return {...DEFAULT_NOTIFICATION_PREFERENCES};
  },
  async save(value: NotificationPreferences) {
    await AsyncStorage.setItem(KEY, JSON.stringify(value));
  },
};

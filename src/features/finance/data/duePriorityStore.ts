import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@academic_due_priority';

export const duePriorityStore = {
  async load(): Promise<string[]> {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return [
        ...new Set(
          parsed.filter(
            (id): id is string => typeof id === 'string' && id.length > 0,
          ),
        ),
      ];
    } catch {
      return [];
    }
  },
  async save(ids: readonly string[]): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify([...new Set(ids)]));
  },
};

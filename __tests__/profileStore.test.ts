import {beforeEach, expect, it, jest} from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {profileStore} from '../src/features/profile/data/profileStore';
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});
it('loads existing onboarding data in one read and does not invent an ID or course', async () => {
  await AsyncStorage.multiSet([
    ['@user_name', 'Alex'],
    ['@user_year', 'Junior'],
  ]);
  expect(await profileStore.load()).toEqual({
    name: 'Alex',
    yearLevel: 'Junior',
    studentId: '',
    college: '',
    course: '',
  });
  expect(AsyncStorage.multiGet).toHaveBeenCalledTimes(1);
});
it('saves every profile field together, including college, and preserves alphanumeric IDs', async () => {
  const value = {
    name: ' Alex ',
    yearLevel: 'Senior',
    studentId: ' 2026-A12 ',
    college: 'CICS',
    course: ' BS IT ',
  };
  const saved = await profileStore.save(value);
  expect(saved).toEqual({
    ...value,
    name: 'Alex',
    studentId: '2026-A12',
    course: 'BS IT',
  });
  expect(await profileStore.load()).toEqual(saved);
  expect(AsyncStorage.multiSet).toHaveBeenCalledTimes(1);
});
it('rejects a blank name without writing changes', async () => {
  await expect(
    profileStore.save({
      name: ' ',
      yearLevel: 'Freshman',
      studentId: '',
      college: '',
      course: '',
    }),
  ).rejects.toThrow('Enter your name');
  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
});

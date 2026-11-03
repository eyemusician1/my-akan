import {beforeEach, expect, it, jest} from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  flushNotificationOpen,
  notificationNavigation,
  queueNotificationOpen,
} from '../src/core/notifications/notificationNavigation';
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@react-navigation/native', () => ({
  createNavigationContainerRef: () => ({
    isReady: jest.fn(() => true),
    getCurrentRoute: jest.fn(() => ({name: 'Home'})),
    navigate: jest.fn(),
  }),
}));
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  jest.mocked(notificationNavigation.isReady).mockReturnValue(true);
  jest
    .mocked(notificationNavigation.getCurrentRoute)
    .mockReturnValue({key: 'home', name: 'Home'});
});
it('waits for navigation on a cold launch and consumes a payment tap only once', async () => {
  jest.mocked(notificationNavigation.isReady).mockReturnValue(false);
  await queueNotificationOpen({id: 'budget-test', data: {target: 'payments'}});
  await flushNotificationOpen();
  expect(notificationNavigation.navigate).not.toHaveBeenCalled();
  jest.mocked(notificationNavigation.isReady).mockReturnValue(true);
  await Promise.all([flushNotificationOpen(), flushNotificationOpen()]);
  expect(notificationNavigation.navigate).toHaveBeenCalledTimes(1);
  expect(notificationNavigation.navigate).toHaveBeenCalledWith('Finance');
  await queueNotificationOpen({id: 'budget-test', data: {target: 'payments'}});
  await flushNotificationOpen();
  expect(notificationNavigation.navigate).toHaveBeenCalledTimes(1);
});
it('opens the schedule tab for a class reminder and ignores arbitrary destinations', async () => {
  await queueNotificationOpen({id: 'class-test', data: {target: 'schedule'}});
  await flushNotificationOpen();
  expect(notificationNavigation.navigate).toHaveBeenCalledWith('Home', {
    tab: 'Schedules',
  });
  await queueNotificationOpen({data: {target: 'Profile'}});
  await flushNotificationOpen();
  expect(notificationNavigation.navigate).toHaveBeenCalledTimes(1);
});
it('does not bypass onboarding', async () => {
  jest
    .mocked(notificationNavigation.getCurrentRoute)
    .mockReturnValue({key: 'welcome', name: 'Welcome'});
  await queueNotificationOpen({id: 'budget-test', data: {target: 'payments'}});
  await flushNotificationOpen();
  expect(notificationNavigation.navigate).not.toHaveBeenCalled();
});

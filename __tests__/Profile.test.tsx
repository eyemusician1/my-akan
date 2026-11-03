import React from 'react';
import {afterEach, beforeEach, expect, it, jest} from '@jest/globals';
import {
  AccessibilityInfo,
  Alert,
  Pressable,
  Switch,
  Text,
  TextInput,
} from 'react-native';
import renderer from 'react-test-renderer';
import {ProfileContent} from '../src/features/profile/components/ProfileContent';
import {ProfileEditor} from '../src/features/profile/components/ProfileEditor';
import {profileStore} from '../src/features/profile/data/profileStore';
import {notificationPreferences} from '../src/core/notifications/preferences';
import {BudgetNotifications} from '../src/core/notifications/BudgetNotifications';
import {refreshScheduleIntegrations} from '../src/features/schedule/services/scheduleService';
import type {AppScreenProps} from '../src/navigation/types';

jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcon');
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0}),
}));
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    getNotificationSettings: jest.fn(async () => ({
      authorizationStatus: 1,
      android: {alarm: 1},
    })),
    openNotificationSettings: jest.fn(),
  },
  AuthorizationStatus: {NOT_DETERMINED: -1, DENIED: 0, AUTHORIZED: 1},
  AndroidNotificationSetting: {DISABLED: 0},
}));
jest.mock('../src/features/profile/data/profileStore', () => ({
  profileStore: {load: jest.fn(), save: jest.fn()},
}));
jest.mock('../src/core/notifications/preferences', () => ({
  DEFAULT_NOTIFICATION_PREFERENCES: {classes: true, budgets: true},
  notificationPreferences: {load: jest.fn(), save: jest.fn(async () => {})},
}));
jest.mock('../src/core/notifications/NotificationService', () => ({
  NotificationService: {requestPermissions: jest.fn()},
}));
jest.mock('../src/core/notifications/BudgetNotifications', () => ({
  BudgetNotifications: {
    refresh: jest.fn(async () => {}),
    clear: jest.fn(async () => {}),
  },
}));
jest.mock('../src/features/schedule/services/scheduleService', () => ({
  refreshScheduleIntegrations: jest.fn(async () => []),
}));
let screen: renderer.ReactTestRenderer;
const profile = {
  name: 'Alex',
  yearLevel: 'Junior',
  studentId: '',
  college: '',
  course: '',
};
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(profileStore.load).mockResolvedValue(profile);
  jest.mocked(profileStore.save).mockImplementation(async value => value);
  jest
    .mocked(notificationPreferences.load)
    .mockResolvedValue({classes: true, budgets: true});
  jest.mocked(notificationPreferences.save).mockResolvedValue(undefined);
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  renderer.act(() => screen?.unmount());
  jest.restoreAllMocks();
});
async function renderProfile() {
  await renderer.act(async () => {
    screen = renderer.create(
      <ProfileContent
        navigation={
          {
            goBack: jest.fn(),
            navigate: jest.fn(),
          } as unknown as AppScreenProps<'Profile'>['navigation']
        }
        schedules={[{academicTerm: '2nd Sem'}]}
        subjects={[{units: 3}, {units: 2}]}
      />,
    );
  });
}
function button(label: string) {
  return screen.root
    .findAllByType(Pressable)
    .find(node => node.props.accessibilityLabel === label)!;
}
function input(label: string) {
  return screen.root
    .findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === label)!;
}
it('shows the real current-semester totals and removes the nonfunctional PDF control', async () => {
  await renderProfile();
  const texts = screen.root
    .findAllByType(Text)
    .map(node => node.props.children);
  expect(texts).toContain(5);
  expect(texts).toContain('2nd Sem');
  expect(texts).not.toContain('202200000');
  expect(texts).not.toContain('Export Schedule to PDF');
  expect(
    screen.root.findAllByProps({testID: 'student-id-back'})[0].props
      .accessibilityElementsHidden,
  ).toBe(true);
  renderer.act(() =>
    screen.root
      .findAllByType(Pressable)
      .find(node =>
        node.props.accessibilityLabel?.endsWith('Show schedule details'),
      )!
      .props.onPress(),
  );
  expect(button('View schedule').props.disabled).toBe(false);
  renderer.act(() => button('View schedule').props.onPress());
  expect(
    screen.root.findByType(ProfileContent).props.navigation.navigate,
  ).toHaveBeenCalledWith('Home', {tab: 'Schedules'});
});
it('keeps college changes in the draft, cancels cleanly, and saves all fields together', async () => {
  await renderProfile();
  await renderer.act(async () => button('Edit profile').props.onPress());
  renderer.act(() => button('Choose college').props.onPress());
  renderer.act(() => input('Search colleges').props.onChangeText('computing'));
  const college = 'College of Information and Computing Sciences (CICS)';
  renderer.act(() =>
    screen.root
      .findAllByType(Pressable)
      .find(node =>
        node.findAllByType(Text).some(text => text.props.children === college),
      )!
      .props.onPress(),
  );
  expect(profileStore.save).not.toHaveBeenCalled();
  renderer.act(() => button('Cancel profile edit').props.onPress());
  await renderer.act(async () => button('Edit profile').props.onPress());
  expect(screen.root.findByType(ProfileEditor).props.profile.college).toBe('');
  renderer.act(() => {
    input('Full name').props.onChangeText('Alex Reyes');
    input('Course').props.onChangeText('BS IT');
  });
  await renderer.act(async () => button('Save profile').props.onPress());
  expect(profileStore.save).toHaveBeenCalledWith({
    ...profile,
    name: 'Alex Reyes',
    course: 'BS IT',
  });
});
it('retains the draft after a failed save and prevents repeated writes', async () => {
  await renderProfile();
  await renderer.act(async () => button('Edit profile').props.onPress());
  renderer.act(() => input('Full name').props.onChangeText('Updated name'));
  let rejectSave!: (error: Error) => void;
  jest.mocked(profileStore.save).mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      rejectSave = reject;
    }),
  );
  const submit = button('Save profile').props.onPress;
  renderer.act(() => {
    submit();
    submit();
  });
  expect(profileStore.save).toHaveBeenCalledTimes(1);
  await renderer.act(async () => rejectSave(new Error('Disk full')));
  expect(Alert.alert).toHaveBeenCalledWith('Profile not saved', 'Disk full');
  expect(input('Full name').props.value).toBe('Updated name');
  expect(screen.root.findByType(ProfileEditor).props.open).toBe(true);
});
it('persists notification preferences and clears only budget alerts when disabled', async () => {
  await renderProfile();
  const toggle = screen.root
    .findAllByType(Switch)
    .find(node => node.props.accessibilityLabel === 'Budget alerts')!;
  await renderer.act(async () => toggle.props.onValueChange(false));
  expect(notificationPreferences.save).toHaveBeenCalledWith({
    classes: true,
    budgets: false,
  });
  expect(BudgetNotifications.clear).toHaveBeenCalledTimes(1);
  expect(refreshScheduleIntegrations).not.toHaveBeenCalled();
});
it('keeps the previous preference on a failed settings write', async () => {
  await renderProfile();
  jest
    .mocked(notificationPreferences.save)
    .mockRejectedValueOnce(new Error('Disk full'));
  await renderer.act(async () =>
    screen.root
      .findAllByType(Switch)
      .find(node => node.props.accessibilityLabel === 'Class reminders')!
      .props.onValueChange(false),
  );
  expect(
    screen.root
      .findAllByType(Switch)
      .find(node => node.props.accessibilityLabel === 'Class reminders')!.props
      .value,
  ).toBe(true);
  expect(Alert.alert).toHaveBeenCalledWith(
    'Preference not saved',
    'Please try again.',
  );
});

jest.mock('@react-navigation/native', () => ({
  NavigationContext: require('react').createContext(undefined),
}));

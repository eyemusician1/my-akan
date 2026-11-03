import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import notifee, {
  AndroidNotificationSetting,
  AuthorizationStatus,
  NotificationSettings,
} from '@notifee/react-native';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {palette} from '../../../tokens';
import type {AppScreenProps} from '../../../navigation/types';
import {profileStore, StudentProfile} from '../data/profileStore';
import {ProfileEditor} from './ProfileEditor';
import {StudentIdCard} from './StudentIdCard';
import {
  notificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationPreferences,
} from '../../../core/notifications/preferences';
import {NotificationService} from '../../../core/notifications/NotificationService';
import {BudgetNotifications} from '../../../core/notifications/BudgetNotifications';
import {refreshScheduleIntegrations} from '../../schedule/services/scheduleService';

interface Props {
  navigation: AppScreenProps<'Profile'>['navigation'];
  subjects: Array<{units: number}>;
  schedules: Array<{academicTerm: string}>;
}
export function ProfileContent({navigation, subjects, schedules}: Props) {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<StudentProfile | null>(null),
    [editOpen, setEditOpen] = useState(false);
  const [preferences, setPreferences] = useState(
      DEFAULT_NOTIFICATION_PREFERENCES,
    ),
    [preferenceBusy, setPreferenceBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [permission, setPermission] = useState<NotificationSettings | null>(
    null,
  );
  const mounted = useRef(false),
    writingPreferences = useRef(false),
    permissionSignature = useRef<string>();
  const refreshPermission = useCallback(async () => {
    try {
      const settings = await notifee.getNotificationSettings();
      if (!mounted.current) return;
      setPermission(settings);
      const signature = `${settings.authorizationStatus}-${settings.android?.alarm}`;
      const changed =
        permissionSignature.current &&
        permissionSignature.current !== signature;
      permissionSignature.current = signature;
      if (changed) {
        await refreshScheduleIntegrations();
        await BudgetNotifications.refresh();
      }
    } catch (error) {
      console.warn('Notification settings unavailable', error);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    setLoadFailed(false);
    Promise.all([profileStore.load(), notificationPreferences.load()])
      .then(([loaded, settings]) => {
        if (active) {
          setProfile(loaded);
          setPreferences(settings);
        }
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    refreshPermission();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refreshPermission();
    });
    return () => {
      active = false;
      mounted.current = false;
      subscription.remove();
    };
  }, [attempt, refreshPermission]);
  const units = useMemo(
    () =>
      subjects.reduce(
        (total, subject) =>
          total + (Number.isFinite(subject.units) ? subject.units : 0),
        0,
      ),
    [subjects],
  );
  const openSchedule = useCallback(
    () => navigation.navigate('Home', {tab: 'Schedules'}),
    [navigation],
  );
  const saveProfile = async (value: StudentProfile) => {
    const saved = await profileStore.save(value);
    if (mounted.current) setProfile(saved);
  };
  const changePreference = async (
    key: keyof NotificationPreferences,
    enabled: boolean,
  ) => {
    if (writingPreferences.current) return;
    writingPreferences.current = true;
    setPreferenceBusy(true);
    let persisted = false;
    try {
      const next = {...preferences, [key]: enabled};
      await notificationPreferences.save(next);
      persisted = true;
      if (mounted.current) setPreferences(next);
      if (key === 'classes') {
        const issues = await refreshScheduleIntegrations();
        if (issues.includes('reminders'))
          throw new Error('Could not refresh class reminders.');
      } else if (enabled) await BudgetNotifications.refresh();
      else await BudgetNotifications.clear();
      await refreshPermission();
    } catch (error) {
      if (mounted.current)
        Alert.alert(
          persisted ? 'Preference saved' : 'Preference not saved',
          persisted
            ? 'Reminders could not refresh. Reopen the app to retry.'
            : 'Please try again.',
        );
    } finally {
      writingPreferences.current = false;
      if (mounted.current) setPreferenceBusy(false);
    }
  };
  const openSystemSettings = async () => {
    try {
      if (
        permission?.authorizationStatus === AuthorizationStatus.NOT_DETERMINED
      )
        await NotificationService.requestPermissions();
      else await notifee.openNotificationSettings();
      await refreshPermission();
    } catch {
      Alert.alert(
        'Settings unavailable',
        'Open Trakn notifications in your device settings.',
      );
    }
  };
  const enabled =
    permission &&
    permission.authorizationStatus >= AuthorizationStatus.AUTHORIZED;
  return (
    <View style={styles.root}>
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
        <Pressable
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={navigation.goBack}>
          <MaterialIcon name="arrow-back" size={24} color={palette.ink} />
        </Pressable>
        <Text style={styles.heading}>Profile</Text>
        <Pressable
          style={styles.headerButton}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          disabled={!profile || loadFailed}
          onPress={() => setEditOpen(true)}>
          <MaterialIcon
            name="edit"
            size={21}
            color={profile ? palette.primary : palette.muted}
          />
        </Pressable>
      </View>
      {!profile ? (
        <View style={styles.loading}>
          {loadFailed ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setAttempt(value => value + 1)}>
              <Text style={styles.retry}>
                Could not load profile. Tap to retry.
              </Text>
            </Pressable>
          ) : (
            <ActivityIndicator color={palette.primary} />
          )}
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            {paddingBottom: insets.bottom + 32},
          ]}>
          <StudentIdCard
            profile={profile}
            academicTerm={schedules[0]?.academicTerm}
            subjectCount={subjects.length}
            units={units}
            onOpenSchedule={openSchedule}
          />
          <Text style={styles.section}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.grow}>
                <Text style={styles.settingTitle}>Class reminders</Text>
                <Text style={styles.muted}>15 minutes before class</Text>
              </View>
              <Switch
                accessibilityLabel="Class reminders"
                value={preferences.classes}
                disabled={preferenceBusy}
                onValueChange={value => changePreference('classes', value)}
                trackColor={{false: palette.border, true: '#C5A059'}}
                thumbColor={palette.bg}
              />
            </View>
            <View style={styles.line} />
            <View style={styles.settingRow}>
              <View style={styles.grow}>
                <Text style={styles.settingTitle}>Budget alerts</Text>
                <Text style={styles.muted}>At 80% and 100% used</Text>
              </View>
              <Switch
                accessibilityLabel="Budget alerts"
                value={preferences.budgets}
                disabled={preferenceBusy}
                onValueChange={value => changePreference('budgets', value)}
                trackColor={{false: palette.border, true: '#C5A059'}}
                thumbColor={palette.bg}
              />
            </View>
            <View style={styles.line} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Notification system settings"
              style={styles.settingRow}
              onPress={openSystemSettings}>
              <MaterialIcon
                name="notifications-none"
                size={22}
                color={palette.primary}
              />
              <View style={styles.grow}>
                <Text style={styles.settingTitle}>
                  {enabled || !permission
                    ? 'System settings'
                    : 'Allow notifications'}
                </Text>
                {permission && !enabled && (
                  <Text style={styles.muted}>
                    Notifications are off on this device
                  </Text>
                )}
              </View>
              <MaterialIcon
                name="chevron-right"
                size={22}
                color={palette.muted}
              />
            </Pressable>
            {Platform.OS === 'android' &&
              permission?.android?.alarm ===
                AndroidNotificationSetting.DISABLED && (
                <Pressable
                  style={styles.settingRow}
                  accessibilityRole="button"
                  accessibilityLabel="Enable precise class reminders"
                  onPress={() =>
                    notifee
                      .openAlarmPermissionSettings()
                      .catch(() =>
                        Alert.alert(
                          'Settings unavailable',
                          'Open Alarms & reminders in your device settings.',
                        ),
                      )
                  }>
                  <MaterialIcon
                    name="alarm"
                    size={22}
                    color={palette.primary}
                  />
                  <Text style={[styles.settingTitle, styles.grow]}>
                    Enable precise reminders
                  </Text>
                  <MaterialIcon
                    name="chevron-right"
                    size={22}
                    color={palette.muted}
                  />
                </Pressable>
              )}
          </View>
          <Text style={styles.footer}>Trakn · Developed by Sayr</Text>
        </ScrollView>
      )}
      {profile && (
        <ProfileEditor
          profile={profile}
          open={editOpen}
          onClose={() => setEditOpen(false)}
          onSave={saveProfile}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: palette.bg},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {fontSize: 22, fontWeight: '700', color: palette.ink},
  loading: {flex: 1, alignItems: 'center', justifyContent: 'center'},
  retry: {fontSize: 14, color: palette.primary},
  content: {padding: 24, gap: 18},
  card: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
    backgroundColor: palette.surface,
  },
  grow: {flex: 1},
  section: {fontSize: 14, fontWeight: '600', color: palette.body, marginTop: 6},
  settingRow: {
    minHeight: 64,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: palette.ink,
    marginBottom: 4,
  },
  muted: {fontSize: 12, color: palette.muted, lineHeight: 18},
  line: {height: 1, backgroundColor: palette.border},
  footer: {
    fontSize: 12,
    textAlign: 'center',
    color: palette.muted,
    paddingVertical: 8,
  },
});

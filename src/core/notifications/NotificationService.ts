import notifee, {
  AlarmType,
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidStyle,
  AuthorizationStatus,
  RepeatFrequency,
  TimestampTrigger,
  TriggerType,
} from '@notifee/react-native';
import {Platform} from 'react-native';
import type Subject from '../database/models/Subject';
import {getNextOccurringDate} from '../../features/schedule/domain/time';
import {notificationPreferences} from './preferences';
import {notificationLines} from './notificationText';

const dayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};
export const CLASS_CHANNEL = 'academic-schedule';
export const BUDGET_CHANNEL = 'budget-alerts';
export const NOTIFICATION_COLOR = '#7A1C1C';
export const NOTIFICATION_ICON = 'ic_stat_trakn';
export function isClassNotification(id: string) {
  return id.startsWith('class-') || /-(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(id);
}
export class NotificationService {
  static async requestPermissions() {
    const settings = await notifee.requestPermission();
    if (settings.authorizationStatus === AuthorizationStatus.DENIED)
      throw new Error('Notification permission was denied.');
    return settings;
  }
  static async syncScheduleAlarms(subjects: Subject[]) {
    const preferences = await notificationPreferences.load(),
      now = new Date();
    const plans = preferences.classes
      ? subjects.flatMap(subject =>
          [...new Set(subject.days)].flatMap(day => {
            if (dayMap[day] === undefined) return [];
            const date = getNextOccurringDate(
              now,
              dayMap[day],
              subject.startTime,
            );
            if (!date) return [];
            date.setMinutes(date.getMinutes() - 15);
            if (date.getTime() <= now.getTime())
              date.setDate(date.getDate() + 7);
            return [
              {
                id: `class-${subject.id}-${day}`,
                subject,
                timestamp: date.getTime(),
              },
            ];
          }),
        )
      : [];
    const wanted = new Set(plans.map(plan => plan.id));
    const [triggerIds, displayed] = await Promise.all([
      notifee.getTriggerNotificationIds(),
      notifee.getDisplayedNotifications(),
    ]);
    const obsolete = [
      ...new Set([
        ...triggerIds,
        ...displayed.map(item => item.notification.id ?? ''),
      ]),
    ].filter(id => isClassNotification(id) && !wanted.has(id));
    if (obsolete.length) await notifee.cancelAllNotifications(obsolete);
    if (!plans.length) return;
    const permissions = await NotificationService.requestPermissions();
    await notifee.createChannel({
      id: CLASS_CHANNEL,
      name: 'Class reminders',
      description: '15 minutes before class.',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
    const alarmType =
      permissions.android?.alarm === AndroidNotificationSetting.DISABLED
        ? AlarmType.SET_AND_ALLOW_WHILE_IDLE
        : AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE;
    for (let index = 0; index < plans.length; index += 4) {
      const results = await Promise.allSettled(
        plans.slice(index, index + 4).map(({id, subject, timestamp}) => {
          const location = subject.room?.trim() || 'Room TBA';
          const details = [
            subject.title || 'Class reminder',
            `${subject.startTime}${
              subject.endTime ? ` – ${subject.endTime}` : ''
            } · ${location}`,
            subject.instructor?.trim(),
          ]
            .filter(Boolean)
            .map(line => line!);
          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp,
            repeatFrequency: RepeatFrequency.WEEKLY,
            ...(Platform.OS === 'android'
              ? {alarmManager: {type: alarmType}}
              : {}),
          };
          return notifee.createTriggerNotification(
            {
              id,
              title: `${subject.code} · in 15 min`,
              body:
                Platform.OS === 'android'
                  ? `${subject.startTime} · ${location}`
                  : `${subject.title || 'Class'}\n${
                      subject.startTime
                    } · ${location}`,
              data: {target: 'schedule'},
              android: {
                channelId: CLASS_CHANNEL,
                smallIcon: NOTIFICATION_ICON,
                color: NOTIFICATION_COLOR,
                importance: AndroidImportance.HIGH,
                autoCancel: true,
                pressAction: {id: 'default'},
                style: {
                  type: AndroidStyle.BIGTEXT,
                  text: notificationLines(details),
                },
              },
              ios: {
                threadId: 'classes',
                sound: 'default',
                foregroundPresentationOptions: {
                  banner: true,
                  list: true,
                  sound: true,
                  badge: false,
                },
              },
            },
            trigger,
          );
        }),
      );
      const failed = results.find(
        (result): result is PromiseRejectedResult =>
          result.status === 'rejected',
      );
      if (failed) throw failed.reason;
    }
  }
}

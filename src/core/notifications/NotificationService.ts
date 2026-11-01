import notifee, {
  TimestampTrigger,
  TriggerType,
  RepeatFrequency,
  AuthorizationStatus,
} from '@notifee/react-native';
import Subject from '../database/models/Subject';
import {getNextOccurringDate} from '../../features/schedule/domain/time';

const dayMap: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export class NotificationService {
  static async requestPermissions() {
    const settings = await notifee.requestPermission();
    if (settings.authorizationStatus === AuthorizationStatus.DENIED) {
      throw new Error('Notification permission was denied.');
    }
  }

  static async syncScheduleAlarms(subjects: Subject[]) {
    await notifee.cancelAllNotifications();
    if (subjects.length > 0) await NotificationService.requestPermissions();

    await notifee.createChannel({
      id: 'academic-schedule',
      name: 'Class Schedule Alerts',
      description: 'Alerts you 15 minutes before your enrolled subjects begin.',
      vibration: true,
    });

    const now = new Date();

    for (const subj of subjects) {
      for (const dayStr of subj.days) {
        const targetDayNum = dayMap[dayStr];
        if (targetDayNum === undefined) continue;

        const classDate = getNextOccurringDate(
          now,
          targetDayNum,
          subj.startTime,
        );
        if (!classDate) continue;

        // Detonate exactly 15 mins before start time
        classDate.setMinutes(classDate.getMinutes() - 15);

        if (classDate.getTime() < now.getTime()) {
          classDate.setDate(classDate.getDate() + 7);
        }

        const trigger: TimestampTrigger = {
          type: TriggerType.TIMESTAMP,
          timestamp: classDate.getTime(),
          repeatFrequency: RepeatFrequency.WEEKLY, // Repeats this class alarm every week forever
        };

        if (__DEV__) {
          console.log(
            `[PRODUCTION ALARM] -> "${subj.code}" (${dayStr}) armed for:`,
            new Date(trigger.timestamp).toLocaleString(),
          );
        }

        await notifee.createTriggerNotification(
          {
            id: `${subj.id}-${dayStr}`,
            title: `Next class: ${subj.code}`,
            body: `${subj.title || 'Subject'} starts in 15 mins at ${
              subj.room || 'Room TBA'
            }.`,
            android: {
              channelId: 'academic-schedule',
              pressAction: {id: 'default'},
            },
          },
          trigger,
        );
      }
    }
  }
}

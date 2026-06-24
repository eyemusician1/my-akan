import notifee, { TimestampTrigger, TriggerType, RepeatFrequency } from '@notifee/react-native';
import Subject from '../database/models/Subject';

const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function getNextOccurringDate(now: Date, targetDayOfWeek: number, timeString: string): Date | null {
  try {
    const parts = timeString.trim().split(' ');
    const [hoursStr, minsStr] = parts[0].split(':');
    let hours = parseInt(hoursStr, 10);
    const mins = parseInt(minsStr, 10);
    const isPM = parts[1]?.toUpperCase() === 'PM';

    if (isNaN(hours) || isNaN(mins)) return null;

    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;

    const result = new Date(now.getTime());
    result.setHours(hours, mins, 0, 0);

    const currentDayOfWeek = result.getDay();
    let dayDifference = targetDayOfWeek - currentDayOfWeek;

    if (dayDifference < 0) {
      dayDifference += 7;
    } else if (dayDifference === 0 && result.getTime() <= now.getTime()) {
      dayDifference = 7;
    }

    result.setDate(result.getDate() + dayDifference);
    return result;
  } catch (e) {
    return null;
  }
}

export class NotificationService {

  static async requestPermissions() {
    await notifee.requestPermission();
  }

  static async syncScheduleAlarms(subjects: Subject[]) {
    await notifee.cancelAllNotifications();

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

        const classDate = getNextOccurringDate(now, targetDayNum, subj.startTime);
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

        // Real truth tracker for your console
        console.log(`[PRODUCTION ALARM] -> "${subj.code}" (${dayStr}) armed for:`, new Date(trigger.timestamp).toLocaleString());

        await notifee.createTriggerNotification(
          {
            id: `${subj.id}-${dayStr}`,
            title: `Next class: ${subj.code}`,
            body: `${subj.title || 'Subject'} starts in 15 mins at ${subj.room || 'Room TBA'}.`,
            android: {
              channelId: 'academic-schedule',
              pressAction: { id: 'default' },
            },
          },
          trigger
        );
      }
    }
  }
}
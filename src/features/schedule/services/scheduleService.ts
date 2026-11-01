import {NotificationService} from '../../../core/notifications/NotificationService';
import {syncScheduleToWidget} from '../../../core/widgets/widgetSync';
import {scheduleRepository} from '../data';
import {SaveSubjectInput} from '../domain/types';

// Serialize refreshes so a slower, older snapshot cannot overwrite a newer one.
let refreshQueue: Promise<string[]> = Promise.resolve([]);

export function refreshScheduleIntegrations(): Promise<string[]> {
  const refresh = async () => {
    const issues: string[] = [];
    await Promise.all([
      (async () => {
        const schedule = await scheduleRepository.getLatestSchedule();
        const subjects = schedule ? await schedule.subjects.fetch() : [];
        await NotificationService.syncScheduleAlarms(subjects);
      })().catch(error => {
        console.warn('Schedule saved, but reminders could not refresh:', error);
        issues.push('reminders');
      }),
      syncScheduleToWidget().catch(error => {
        console.warn(
          'Schedule saved, but the widget could not refresh:',
          error,
        );
        issues.push('widget');
      }),
    ]);
    return issues;
  };
  refreshQueue = refreshQueue.then(refresh, refresh);
  return refreshQueue;
}

export const scheduleService = {
  async saveSubject(input: SaveSubjectInput) {
    const subject = await scheduleRepository.saveSubject(input);
    return {subject, syncIssues: await refreshScheduleIntegrations()};
  },
  async deleteSubject(id: string) {
    await scheduleRepository.deleteSubject(id);
    return refreshScheduleIntegrations();
  },
  async deleteSchedule(id: string) {
    await scheduleRepository.deleteSchedule(id);
    return refreshScheduleIntegrations();
  },
};

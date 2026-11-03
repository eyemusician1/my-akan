import {parseTimeToMinutes} from '../features/schedule/domain/time';

export const WIDGET_CACHE_KEY = '@widget_schedule_cache';
export const WIDGET_NAME = 'RNWidgetProvider';
export const SCHEDULE_URI = 'trakn://home/schedule';
export const ADD_SCHEDULE_URI = 'trakn://home/add';
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export interface WidgetSubject {
  id: string;
  code: string;
  title: string;
  room: string;
  days: string[];
  startTime: string;
  endTime: string;
}
export interface WidgetSchedule {
  version: 2;
  subjects: WidgetSubject[];
}

// Store recurring days, never a dated snapshot of today's classes.
export function makeWidgetSchedule(
  subjects: Array<Omit<WidgetSubject, 'room'> & {room?: string}>,
): WidgetSchedule {
  return {
    version: 2,
    subjects: subjects.map(subject => ({
      id: subject.id,
      code: subject.code,
      title: subject.title,
      room: subject.room || '',
      days: subject.days.filter(day => DAY_NAMES.includes(day)),
      startTime: subject.startTime || '',
      endTime: subject.endTime || '',
    })),
  };
}

export function parseWidgetSchedule(raw: string | null): WidgetSchedule | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 2 || !Array.isArray(value.subjects)) return null;
    const valid = value.subjects.every(
      (subject: WidgetSubject) =>
        subject &&
        ['id', 'code', 'title', 'room', 'startTime', 'endTime'].every(
          key => typeof subject[key as keyof WidgetSubject] === 'string',
        ) &&
        Array.isArray(subject.days) &&
        subject.days.every(day => DAY_NAMES.includes(day)),
    );
    return valid ? value : null;
  } catch {
    return null;
  }
}

export function widgetDateLabel(date: Date): string {
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${
    [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][date.getMonth()]
  }`;
}
function clock(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${
    hour >= 12 ? 'PM' : 'AM'
  }`;
}
export function widgetTimeLabel(subject: WidgetSubject): string {
  const start = parseTimeToMinutes(subject.startTime);
  const end = parseTimeToMinutes(subject.endTime);
  if (start === null) return 'Time TBA';
  if (end === null || end <= start) return clock(start);
  const samePeriod = start < 720 === end < 720;
  return `${
    samePeriod ? clock(start).replace(/ [AP]M$/, '') : clock(start)
  }–${clock(end)}`;
}
export function widgetAgenda(schedule: WidgetSchedule, now: Date) {
  const days: Array<{key: string; label: string; subjects: WidgetSubject[]}> =
    [];
  for (let offset = 0; offset < 7; offset++) {
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    const subjects = schedule.subjects
      .filter(subject => subject.days.includes(DAY_NAMES[date.getDay()]))
      .sort((a, b) => {
        const difference =
          (parseTimeToMinutes(a.startTime) ?? 1440) -
          (parseTimeToMinutes(b.startTime) ?? 1440);
        return difference || a.code.localeCompare(b.code);
      });
    if (offset === 0 || subjects.length) {
      days.push({key: String(offset), label: widgetDateLabel(date), subjects});
    }
  }
  return days;
}

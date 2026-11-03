import {parseTimeToMinutes} from './time';

export function modificationDate(schedule: {
  updatedAt?: Date | null;
  createdAt?: Date;
}): Date | undefined {
  return schedule.updatedAt &&
    schedule.updatedAt.getTime() > (schedule.createdAt?.getTime() ?? 0)
    ? schedule.updatedAt
    : undefined;
}

export function relativeTime(
  date: Date | null | undefined,
  now = new Date(),
): string {
  if (!date || !Number.isFinite(date.getTime())) return '';
  const minutes = Math.max(
    0,
    Math.floor((now.getTime() - date.getTime()) / 60000),
  );
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? 'day' : 'days'} ago`;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
interface ClassTime {
  days: string[];
  startTime: string;
  endTime: string;
}

export function nextClass<T extends ClassTime>(
  subjects: T[],
  now: Date,
):
  | {
      subject: T;
      startsAt: Date;
      endsAt: Date;
      ongoing: boolean;
    }
  | undefined {
  let next: ReturnType<typeof nextClass<T>>;
  for (const subject of subjects) {
    const start = parseTimeToMinutes(subject.startTime),
      end = parseTimeToMinutes(subject.endTime);
    if (start === null || end === null || start >= end) continue;
    for (const day of new Set(subject.days)) {
      const index = DAYS.indexOf(day);
      if (index < 0) continue;
      const offset = (index - now.getDay() + 7) % 7;
      const startsAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
        Math.floor(start / 60),
        start % 60,
      );
      const endsAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + offset,
        Math.floor(end / 60),
        end % 60,
      );
      if (endsAt <= now) {
        startsAt.setDate(startsAt.getDate() + 7);
        endsAt.setDate(endsAt.getDate() + 7);
      }
      if (!next || startsAt < next.startsAt)
        next = {
          subject,
          startsAt,
          endsAt,
          ongoing: startsAt <= now && endsAt > now,
        };
    }
  }
  return next;
}

export function classDayLabel(date: Date, now: Date) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return date.toLocaleDateString('en-US', {weekday: 'short'});
}

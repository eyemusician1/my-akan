import {SubjectDraft} from './types';
import {parseTimeToMinutes} from './time';

export class ScheduleValidationError extends Error {
  constructor(public readonly title: string, message: string) {
    super(message);
    this.name = 'ScheduleValidationError';
  }
}

export function getUnitLimit(academicTerm: string): number {
  return academicTerm.toLowerCase().includes('sum') ? 6 : 24;
}

export function normalizeSemester(raw?: string | null): string {
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (lower.includes('sum')) return 'Summer';
  if (/\b(second|2nd)\b|^\s*2\b/.test(lower)) return '2nd Sem';
  return '1st Sem';
}

export function validateSubject(subject: SubjectDraft): void {
  if (!subject.code.trim() || !subject.title.trim()) {
    throw new ScheduleValidationError(
      'Incomplete Details',
      'Enter a subject code and title.',
    );
  }
  if (
    !Number.isInteger(subject.units) ||
    subject.units < 1 ||
    subject.units > 6
  ) {
    throw new ScheduleValidationError(
      'Invalid Units',
      'A subject must have 1 to 6 units.',
    );
  }

  // A subject with no logistics is deliberately TBA.
  if (!subject.startTime && !subject.endTime && subject.days.length === 0) {
    return;
  }
  const start = parseTimeToMinutes(subject.startTime);
  const end = parseTimeToMinutes(subject.endTime);
  const validDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  if (
    start === null ||
    end === null ||
    !subject.days.length ||
    subject.days.some(day => !validDays.includes(day))
  ) {
    throw new ScheduleValidationError(
      'Invalid Time',
      'Choose valid days and complete start and end times, or leave all three blank for TBA.',
    );
  }
  if (start >= end) {
    throw new ScheduleValidationError(
      'Invalid Time',
      'The end time must be later than the start time.',
    );
  }
}

export function findTimeConflict<
  T extends Pick<SubjectDraft, 'days' | 'startTime' | 'endTime'>,
>(subject: SubjectDraft, existingSubjects: T[]): T | undefined {
  const start = parseTimeToMinutes(subject.startTime);
  const end = parseTimeToMinutes(subject.endTime);
  if (start === null || end === null) {
    return undefined;
  }
  return existingSubjects.find(existing => {
    if (!subject.days.some(day => existing.days.includes(day))) {
      return false;
    }
    const existingStart = parseTimeToMinutes(existing.startTime);
    const existingEnd = parseTimeToMinutes(existing.endTime);
    return (
      existingStart !== null &&
      existingEnd !== null &&
      start < existingEnd &&
      end > existingStart
    );
  });
}

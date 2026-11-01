import {it, expect} from '@jest/globals';
import {
  findTimeConflict,
  getUnitLimit,
  normalizeSemester,
  validateSubject,
} from '../src/features/schedule/domain/rules';
import {
  getNextOccurringDate,
  parseTimeToMinutes,
  toTimeInput,
} from '../src/features/schedule/domain/time';
import {SubjectDraft} from '../src/features/schedule/domain/types';

const subject: SubjectDraft = {
  code: 'CSC101',
  title: 'Introduction to Computing',
  section: '',
  units: 3,
  days: ['Mon', 'Wed'],
  startTime: '08:00 AM',
  endTime: '09:00 AM',
  room: '',
  instructor: '',
};

it.each([
  ['12:00 AM', 0],
  ['12:00 PM', 720],
  ['01:30 PM', 810],
  ['8:05 am', 485],
  ['23:59', 1439],
  ['00:00', 0],
  ['', null],
  ['TBA', null],
  ['13:00 PM', null],
  ['00:30 AM', null],
  ['10:99 AM', null],
  ['24:00', null],
  ['08:00 AM junk', null],
])('parses %s as %s minutes', (input, expected) => {
  expect(parseTimeToMinutes(input)).toBe(expected);
});

it('allows adjacent classes and classes on different days, but rejects shared-day overlap', () => {
  expect(
    findTimeConflict({...subject, startTime: '09:00 AM', endTime: '10:00 AM'}, [
      subject,
    ]),
  ).toBeUndefined();
  expect(
    findTimeConflict({...subject, days: ['Tue']}, [subject]),
  ).toBeUndefined();
  expect(
    findTimeConflict({...subject, startTime: '08:30 AM', endTime: '10:00 AM'}, [
      subject,
    ]),
  ).toBe(subject);
});

it('allows entirely TBA logistics, but rejects partial logistics and backwards times', () => {
  expect(() =>
    validateSubject({...subject, days: [], startTime: '', endTime: ''}),
  ).not.toThrow();
  expect(() => validateSubject({...subject, days: []})).toThrow(
    'Choose valid days',
  );
  expect(() => validateSubject({...subject, endTime: '07:00 AM'})).toThrow(
    'end time must be later',
  );
  expect(() => validateSubject({...subject, units: 0})).toThrow('1 to 6');
});

it('uses the summer limit even when the academic year is present', () => {
  expect(getUnitLimit('Summer, 2026-2027')).toBe(6);
  expect(getUnitLimit('1st Sem')).toBe(24);
});

it('normalizes the semester label without mistaking year digits for the semester', () => {
  expect(normalizeSemester('Summer, 2026-2027')).toBe('Summer');
  expect(normalizeSemester('2nd Sem, 2021-2022')).toBe('2nd Sem');
  expect(normalizeSemester('First Semester')).toBe('1st Sem');
});

it('converts stored times to padded form values and resets missing periods to AM', () => {
  expect(toTimeInput('8:00 AM')).toEqual({time: '08:00', period: 'AM'});
  expect(toTimeInput('13:30')).toEqual({time: '01:30', period: 'PM'});
  expect(toTimeInput('')).toEqual({time: '', period: 'AM'});
});

it('finds the next weekly occurrence using local calendar dates', () => {
  const monday = new Date(2026, 10, 2, 8, 0);
  expect(getNextOccurringDate(monday, 1, '08:00 AM')).toEqual(
    new Date(2026, 10, 9, 8, 0),
  );
  expect(getNextOccurringDate(monday, 1, '09:00 AM')).toEqual(
    new Date(2026, 10, 2, 9, 0),
  );
  expect(getNextOccurringDate(monday, 0, '09:00 AM')).toEqual(
    new Date(2026, 10, 8, 9, 0),
  );
  expect(getNextOccurringDate(monday, 9, '09:00 AM')).toBeNull();
  expect(getNextOccurringDate(monday, 1, 'TBA')).toBeNull();
});

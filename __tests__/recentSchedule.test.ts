import {expect, it} from '@jest/globals';
import {nextClass, relativeTime} from '../src/features/schedule/domain/recent';

const monday = new Date(2026, 10, 2, 9, 0);
const subject = {
  id: 'one',
  days: ['Mon'],
  startTime: '10:00 AM',
  endTime: '11:00 AM',
};

it('finds an ongoing class, then advances at the end boundary', () => {
  const ongoing = {
    ...subject,
    id: 'ongoing',
    startTime: '08:30 AM',
    endTime: '09:30 AM',
  };
  expect(nextClass([subject, ongoing], monday)).toMatchObject({
    subject: {id: 'ongoing'},
    ongoing: true,
  });
  expect(
    nextClass([subject, ongoing], new Date(2026, 10, 2, 9, 30)),
  ).toMatchObject({subject: {id: 'one'}, ongoing: false});
});

it('supports Sunday classes, week rollover, and excludes TBA/invalid intervals', () => {
  const sunday = {
    ...subject,
    id: 'rotc',
    days: ['Sun'],
    startTime: '08:00 AM',
    endTime: '12:00 PM',
  };
  expect(nextClass([sunday], new Date(2026, 10, 7, 15))?.startsAt).toEqual(
    new Date(2026, 10, 8, 8),
  );
  expect(nextClass([sunday], new Date(2026, 10, 8, 8))?.ongoing).toBe(true);
  expect(nextClass([subject], new Date(2026, 10, 2, 11))?.startsAt).toEqual(
    new Date(2026, 10, 9, 10),
  );
  expect(
    nextClass(
      [
        {...subject, startTime: '', endTime: ''},
        {...subject, endTime: '09:00 AM'},
      ],
      monday,
    ),
  ).toBeUndefined();
});

it('ages real timestamps without claiming missing dates were just updated', () => {
  expect(relativeTime(monday, monday)).toBe('just now');
  expect(relativeTime(monday, new Date(+monday + 120000))).toBe('2 min ago');
  expect(relativeTime(monday, new Date(+monday + 3600000))).toBe('1 hr ago');
  expect(relativeTime(monday, new Date(+monday + 86400000))).toBe('1 day ago');
  expect(relativeTime(undefined, monday)).toBe('');
});

import {expect, it} from '@jest/globals';
import {
  makeWidgetSchedule,
  parseWidgetSchedule,
  widgetAgenda,
  widgetTimeLabel,
  WidgetSubject,
} from '../src/widgets/scheduleData';

const subject: WidgetSubject = {
  id: 'math',
  code: 'M101',
  title: 'Mathematics',
  room: '201',
  days: ['Mon', 'Wed'],
  startTime: '08:00 AM',
  endTime: '09:30 AM',
};
it('sorts each day by actual time and includes single-day and Sunday classes', () => {
  const schedule = makeWidgetSchedule([
    {...subject, id: 'afternoon', code: 'CS102', startTime: '01:00 PM'},
    {...subject, id: 'tba', startTime: 'TBA'},
    subject,
    {...subject, id: 'friday', days: ['Fri']},
    {...subject, id: 'rotc', days: ['Sun']},
    {...subject, id: 'unknown', days: []},
  ]);
  const week = widgetAgenda(schedule, new Date(2026, 10, 2, 10));
  expect(week.map(day => day.label)).toEqual([
    'Mon, 2 Nov',
    'Wed, 4 Nov',
    'Fri, 6 Nov',
    'Sun, 8 Nov',
  ]);
  expect(week[0].subjects.map(item => item.id)).toEqual([
    'math',
    'afternoon',
    'tba',
  ]);
  expect(week[3].subjects[0].id).toBe('rotc');
});
it('changes the displayed day from the same offline cache at midnight and across months', () => {
  const raw = JSON.stringify(makeWidgetSchedule([subject]));
  const cached = parseWidgetSchedule(raw)!;
  const sunday = widgetAgenda(cached, new Date(2026, 10, 1, 23, 59));
  const monday = widgetAgenda(cached, new Date(2026, 10, 2, 0, 0));
  expect(sunday[0].subjects).toHaveLength(0);
  expect(monday[0].subjects[0].code).toBe('M101');
  expect(widgetAgenda(cached, new Date(2026, 9, 31))[1].label).toBe(
    'Mon, 2 Nov',
  );
});
it('rejects legacy daily caches and malformed data instead of displaying stale or broken rows', () => {
  for (const value of [
    null,
    'bad json',
    'null',
    '[]',
    '{"version":2}',
    JSON.stringify({version: 2, subjects: [{...subject, days: 'MW'}]}),
    JSON.stringify({version: 2, subjects: [null]}),
    JSON.stringify({version: 2, subjects: [{...subject, days: ['Notaday']}]}),
  ])
    expect(parseWidgetSchedule(value)).toBeNull();
  expect(parseWidgetSchedule(JSON.stringify(makeWidgetSchedule([])))).toEqual({
    version: 2,
    subjects: [],
  });
});
it('keeps noon unambiguous, formats 24-hour times and handles TBA safely', () => {
  expect(widgetTimeLabel(subject)).toBe('8:00–9:30 AM');
  expect(
    widgetTimeLabel({...subject, startTime: '11:30 AM', endTime: '01:00 PM'}),
  ).toBe('11:30 AM–1:00 PM');
  expect(
    widgetTimeLabel({...subject, startTime: '13:00', endTime: '14:30'}),
  ).toBe('1:00–2:30 PM');
  expect(widgetTimeLabel({...subject, startTime: '', endTime: ''})).toBe(
    'Time TBA',
  );
});

import {expect, it} from '@jest/globals';
import {
  inferEndPeriod,
  maskClockInput,
  parseClockField,
  parseTimeEntry,
  TimePeriod,
} from '../src/features/schedule/domain/time';
import {getLogisticsError} from '../src/features/schedule/domain/rules';

it.each([
  ['8', '08:00', 'AM'],
  ['830', '08:30', 'AM'],
  ['0830', '08:30', 'AM'],
  ['8:30', '08:30', 'AM'],
  ['8.30', '08:30', 'AM'],
  ['8:30 p.m.', '08:30', 'PM'],
  ['13:30', '01:30', 'PM'],
  ['1330', '01:30', 'PM'],
  ['00:15', '12:15', 'AM'],
  ['0000', '12:00', 'AM'],
  ['12 AM', '12:00', 'AM'],
  ['12pm', '12:00', 'PM'],
  ['23:59', '11:59', 'PM'],
  [' 9:05 am ', '09:05', 'AM'],
])(
  'normalizes %s without changing its intended time',
  (value, time, period) => {
    expect(parseTimeEntry(value)).toMatchObject({valid: true, time, period});
  },
);

it.each([
  '',
  '0',
  '24:00',
  '99:00',
  '8:60',
  '1260',
  '8:3',
  '8:',
  ':30',
  '8:001',
  '13:00 PM',
  '00:30 AM',
  '-8:00',
  '8:00 junk',
  'NaN',
  'Infinity',
  '8e2',
  '8/30',
  '99999',
])('rejects invalid input %s', value => {
  expect(parseTimeEntry(value).valid).toBe(false);
});

it('honors the selected period for 12-hour shortcuts', () => {
  expect(parseTimeEntry('830', 'PM')).toMatchObject({
    valid: true,
    minutes: 1230,
  });
  expect(parseTimeEntry('12:00', 'AM')).toMatchObject({
    valid: true,
    minutes: 0,
  });
});

it('checks the full range and partial logistics before save', () => {
  expect(getLogisticsError(['Mon'], '11:30 AM', '01:00 PM')).toBeNull();
  expect(getLogisticsError(['Mon'], '08:00 AM', '08:00 AM')).toContain('later');
  expect(getLogisticsError(['Mon'], '09:00 PM', '08:00 AM')).toContain('later');
  expect(getLogisticsError([], '08:00 AM', '09:00 AM')).toContain(
    'Choose class days',
  );
  expect(getLogisticsError([], '', '')).toBeNull();
});

it.each([
  ['0800', '08:00'],
  ['0830', '08:30'],
  ['1530', '15:30'],
  ['08:300000', '08:30'],
  ['5000000', '50:00'],
  ['08:0', '08:0'],
  ['08:', '08'],
  ['', ''],
  ['08:99', '08:99'],
])('masks %s without allowing extra digits', (value, expected) => {
  expect(maskClockInput(value)).toBe(expected);
});

it('rejects non-clock text and incomplete clock fields', () => {
  expect(maskClockInput('08:3oops', '08:30')).toBe('08:30');
  for (const value of ['8', '080', '8:30', '08:0', '08:99', '24:00', '50:00']) {
    expect(parseClockField(value, 'AM').valid).toBe(false);
  }
  expect(parseClockField(maskClockInput('0800'), 'AM')).toMatchObject({
    valid: true,
    minutes: 480,
  });
});

it.each<[string, TimePeriod, string, TimePeriod]>([
  ['08:00', 'AM', '09:00', 'AM'],
  ['08:30', 'AM', '05:00', 'PM'],
  ['11:00', 'AM', '01:00', 'PM'],
  ['11:00', 'AM', '12:00', 'PM'],
  ['12:00', 'PM', '01:00', 'PM'],
  ['08:00', 'AM', '08:00', 'AM'],
  ['09:00', 'PM', '08:00', 'PM'],
  ['08:99', 'AM', '05:00', 'AM'],
])('infers a same-day end for %s %s to %s', (start, period, end, expected) => {
  expect(inferEndPeriod(start, period, end)).toBe(expected);
});

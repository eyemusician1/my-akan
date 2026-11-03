import {
  formatTimeEntry,
  parseTimeEntry,
  parseTimeToMinutes,
} from '../../schedule/domain/time';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_NAMES: Record<string, string> = {
  MONDAY: 'Mon',
  MON: 'Mon',
  TUESDAY: 'Tue',
  TUES: 'Tue',
  TUE: 'Tue',
  WEDNESDAY: 'Wed',
  WED: 'Wed',
  THURSDAY: 'Thu',
  THURS: 'Thu',
  THUR: 'Thu',
  THU: 'Thu',
  FRIDAY: 'Fri',
  FRI: 'Fri',
  SATURDAY: 'Sat',
  SAT: 'Sat',
  SUNDAY: 'Sun',
  SUN: 'Sun',
  M: 'Mon',
  T: 'Tue',
  W: 'Wed',
  TH: 'Thu',
  H: 'Thu',
  F: 'Fri',
  S: 'Sat',
  SU: 'Sun',
};

export function parseScheduleDays(value: string): string[] {
  const text = value
    .toUpperCase()
    .replace(/\b((?:TH|SU|[MTWHFS]){1,7})(?=\d)/g, '$1 ')
    .replace(/([MTWHFS])\.(?=[MTWHFS.])/g, '$1');
  const days = new Set<string>();
  const words =
    text.match(
      /\b(?:MONDAY|MON|TUESDAY|TUES|TUE|WEDNESDAY|WED|THURSDAY|THURS|THUR|THU|FRIDAY|FRI|SATURDAY|SAT|SUNDAY|SUN)\b/g,
    ) ?? [];
  words.forEach(word => days.add(DAY_NAMES[word]));
  for (const token of text.match(/\b(?:TH|SU|[MTWHFS]){1,7}\b/g) ?? []) {
    for (const part of token.match(/TH|SU|[MTWHFS]/g) ?? [])
      days.add(DAY_NAMES[part]);
  }
  const range = text.match(
    /\b(MON(?:DAY)?|TUE(?:S(?:DAY)?)?|WED(?:NESDAY)?|THU(?:RS(?:DAY)?)?|FRI(?:DAY)?|SAT(?:URDAY)?|SUN(?:DAY)?|TH|SU|[MTWFS])\s*(?:-|TO)\s*(MON(?:DAY)?|TUE(?:S(?:DAY)?)?|WED(?:NESDAY)?|THU(?:RS(?:DAY)?)?|FRI(?:DAY)?|SAT(?:URDAY)?|SUN(?:DAY)?|TH|SU|[MTWFS])\b/,
  );
  if (range) {
    const from = DAY_ORDER.indexOf(DAY_NAMES[range[1]]);
    const to = DAY_ORDER.indexOf(DAY_NAMES[range[2]]);
    if (from >= 0 && to >= from)
      DAY_ORDER.slice(from, to + 1).forEach(day => days.add(day));
  }
  return DAY_ORDER.filter(day => days.has(day));
}

const ENDPOINT = '(\\d{3,4}|\\d{1,2}(?:[:.]\\d{1,2})?)\\s*([ap]\\.?m\\.?)?';
const RANGE = `\\b${ENDPOINT}\\s*(?:[-–—]|\\bto\\b)\\s*${ENDPOINT}(?![\\d:.a-z])`;

function cleanClock(value: string): string {
  return value
    .replace(/\b((?:TH|SU|[MTWHFS]){1,7})(?=\d)/gi, '$1 ')
    .replace(
      /([0-9OlI|]{1,2})[:;]([0-9OlI|]{2})/g,
      (_all, hour: string, minute: string) =>
        `${hour.replace(/O/g, '0').replace(/[lI|]/g, '1')}:${minute
          .replace(/O/g, '0')
          .replace(/[lI|]/g, '1')}`,
    )
    .replace(/(\d)\s*arn\b/gi, '$1am')
    .replace(/(\d)\s*(?:pn|prn)\b/gi, '$1pm');
}

function as24Hour(value: string): string {
  if (/^\d{3,4}$/.test(value))
    return `${value.slice(0, -2).padStart(2, '0')}:${value.slice(-2)}`;
  if (/^\d{1,2}$/.test(value)) return `${value.padStart(2, '0')}:00`;
  return value.replace('.', ':');
}

export function extractTimeRanges(value: string) {
  const text = cleanClock(value);
  return [...text.matchAll(new RegExp(RANGE, 'gi'))]
    .filter(match => !/[\d:.]/.test(text[(match.index ?? 0) - 1] ?? ''))
    .map(match => {
      const startRaw = match[1];
      const endRaw = match[3];
      const startPeriod = match[2]?.replace(/\./g, '').toUpperCase();
      const endPeriod = match[4]?.replace(/\./g, '').toUpperCase();
      let startTime = '';
      let endTime = '';
      let inferred = false;
      if (!startPeriod && !endPeriod) {
        const s = as24Hour(startRaw);
        const e = as24Hour(endRaw);
        const unambiguous =
          /^0\d[:.]|^0\d{3}$/.test(startRaw) ||
          Number(s.split(':')[0]) > 12 ||
          Number(e.split(':')[0]) > 12 ||
          s.startsWith('00:');
        const start = parseTimeToMinutes(s);
        const end = parseTimeToMinutes(e);
        if (unambiguous && start !== null && end !== null && start < end) {
          // Convert a 24-hour endpoint directly, including noon.
          const to12 = (minutes: number) =>
            `${String(Math.floor(minutes / 60) % 12 || 12).padStart(
              2,
              '0',
            )}:${String(minutes % 60).padStart(2, '0')} ${
              minutes >= 720 ? 'PM' : 'AM'
            }`;
          startTime = to12(start);
          endTime = to12(end);
        }
      } else {
        const hint = (startPeriod ?? endPeriod) as 'AM' | 'PM';
        let start = parseTimeEntry(`${startRaw}${startPeriod ?? ''}`, hint);
        let end = parseTimeEntry(`${endRaw}${endPeriod ?? ''}`, hint);
        if (
          start.valid &&
          end.valid &&
          start.minutes >= end.minutes &&
          (!startPeriod || !endPeriod)
        ) {
          const opposite = hint === 'AM' ? 'PM' : 'AM';
          if (!startPeriod) start = parseTimeEntry(startRaw, opposite);
          else end = parseTimeEntry(endRaw, opposite);
          inferred = true;
        }
        if (start.valid && end.valid && start.minutes < end.minutes) {
          startTime = formatTimeEntry(start);
          endTime = formatTimeEntry(end);
        }
      }
      return {
        raw: match[0],
        index: match.index!,
        startTime,
        endTime,
        inferred,
        valid: !!startTime && !!endTime,
        days: parseScheduleDays(value),
      };
    });
}

export function stripScheduleText(value: string): string {
  let result = cleanClock(value).replace(new RegExp(RANGE, 'gi'), ' ');
  result = result.replace(
    /\b(?:MONDAY|MON|TUESDAY|TUES|TUE|WEDNESDAY|WED|THURSDAY|THURS|THUR|THU|FRIDAY|FRI|SATURDAY|SAT|SUNDAY|SUN|(?:TH|SU|[MTWHFS]){1,7})\b/gi,
    ' ',
  );
  return result.replace(/\s+/g, ' ').trim();
}

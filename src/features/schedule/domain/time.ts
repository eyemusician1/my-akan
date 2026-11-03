/** Minutes since midnight, or null for TBA/invalid input. Accepts 12h and 24h time. */
export function parseTimeToMinutes(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = match[3]?.toUpperCase();
  if (minutes > 59 || (period ? hours < 1 || hours > 12 : hours > 23)) {
    return null;
  }
  if (period) {
    hours = (hours % 12) + (period === 'PM' ? 12 : 0);
  }
  return hours * 60 + minutes;
}

export function timeToDecimal(value: string): number {
  return (parseTimeToMinutes(value) ?? 0) / 60;
}

export function toTimeInput(value: string): {
  time: string;
  period: 'AM' | 'PM';
} {
  const minutes = parseTimeToMinutes(value);
  if (minutes === null) return {time: '', period: 'AM'};
  const hours = Math.floor(minutes / 60);
  return {
    time: `${String(hours % 12 || 12).padStart(2, '0')}:${String(
      minutes % 60,
    ).padStart(2, '0')}`,
    period: hours >= 12 ? 'PM' : 'AM',
  };
}

export type TimePeriod = 'AM' | 'PM';
export type TimeEntryResult =
  | {valid: true; time: string; period: TimePeriod; minutes: number}
  | {valid: false; error: string};

/** Parse editing shortcuts without clamping invalid hours or minutes. */
export function parseTimeEntry(
  value: string,
  defaultPeriod: TimePeriod = 'AM',
): TimeEntryResult {
  const raw = value.trim().replace(/\u00a0/g, ' ');
  if (!raw) return {valid: false, error: 'Enter a time.'};
  const match = raw.match(/^(\d{1,4}(?:[:.]\d{1,2})?)\s*([ap]\.?m\.?)?$/i);
  if (!match) return {valid: false, error: 'Use a time like 8:30 or 0830.'};
  const suffix = match[2]?.replace(/\./g, '').toUpperCase() as
    | TimePeriod
    | undefined;
  const number = match[1];
  let hours: number;
  let minutes: number;
  if (/[:.]/.test(number)) {
    const parts = number.split(/[:.]/);
    if (parts[0].length > 2 || parts[1].length !== 2)
      return {valid: false, error: 'Enter two minute digits.'};
    hours = Number(parts[0]);
    minutes = Number(parts[1]);
  } else if (number.length > 2) {
    hours = Number(number.slice(0, -2));
    minutes = Number(number.slice(-2));
  } else {
    hours = Number(number);
    minutes = 0;
  }
  if (minutes > 59) return {valid: false, error: 'Minutes must be 00–59.'};
  if (hours === 0 && number === '0' && !suffix)
    return {valid: false, error: 'Use 00:00 for midnight.'};
  if (
    hours > (suffix ? 12 : 23) ||
    (hours === 0 && (suffix || number === '0'))
  ) {
    return {
      valid: false,
      error: suffix ? 'Hours must be 1–12 with AM/PM.' : 'Hours must be 0–23.',
    };
  }
  const period: TimePeriod =
    suffix ?? (hours === 0 ? 'AM' : hours > 12 ? 'PM' : defaultPeriod);
  const total =
    (hours > 12 || hours === 0) && !suffix
      ? hours * 60 + minutes
      : ((hours % 12) + (period === 'PM' ? 12 : 0)) * 60 + minutes;
  const input = toTimeInput(
    `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(
      total % 60,
    ).padStart(2, '0')}`,
  );
  return {valid: true, time: input.time, period: input.period, minutes: total};
}

export function formatTimeEntry(value: TimeEntryResult): string {
  return value.valid ? `${value.time} ${value.period}` : '';
}

/** Four-digit clock mask. Keep invalid hours/minutes visible instead of clamping them. */
export function maskClockInput(text: string, previous = ''): string {
  if (!/^[\d:\s]*$/.test(text)) return previous;
  const raw = text.trim();
  const colon = raw.indexOf(':');
  if (colon >= 0) {
    if (raw.indexOf(':', colon + 1) >= 0) return previous;
    const hour = raw.slice(0, colon).replace(/\s/g, '').slice(0, 2);
    const minute = raw
      .slice(colon + 1)
      .replace(/\s/g, '')
      .slice(0, 2);
    if (!hour) return previous;
    if (!minute) return hour;
    return `${hour.padStart(2, '0')}:${minute}`;
  }
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  return digits.length > 2
    ? `${digits.slice(0, 2)}:${digits.slice(2)}`
    : digits;
}

export function parseClockField(
  value: string,
  period: TimePeriod,
): TimeEntryResult {
  if (!/^\d{2}:\d{2}$/.test(value))
    return {valid: false, error: 'Complete the time.'};
  return parseTimeEntry(value, period);
}

/** Pick a same-day end period; explicit user/scanned periods bypass this inference. */
export function inferEndPeriod(
  startValue: string,
  startPeriod: TimePeriod,
  endValue: string,
): TimePeriod {
  const start = parseClockField(startValue, startPeriod);
  const end = parseClockField(endValue, startPeriod);
  if (
    !start.valid ||
    !end.valid ||
    end.minutes >= start.minutes ||
    startPeriod === 'PM'
  )
    return startPeriod;
  const afternoon = parseClockField(endValue, 'PM');
  return afternoon.valid && afternoon.minutes > start.minutes
    ? 'PM'
    : startPeriod;
}

export function getNextOccurringDate(
  now: Date,
  targetDay: number,
  time: string,
): Date | null {
  const minutes = parseTimeToMinutes(time);
  if (
    minutes === null ||
    !Number.isInteger(targetDay) ||
    targetDay < 0 ||
    targetDay > 6
  ) {
    return null;
  }

  const result = new Date(now.getTime());
  result.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  let daysAhead = (targetDay - now.getDay() + 7) % 7;
  if (daysAhead === 0 && result.getTime() <= now.getTime()) {
    daysAhead = 7;
  }
  result.setDate(result.getDate() + daysAhead);
  return result;
}

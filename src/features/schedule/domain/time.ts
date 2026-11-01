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

import {SubjectDraft} from '../../schedule/domain/types';

export type ParsedSubject = SubjectDraft;

export type ParseResult = {
  detectedSemester: string | null;
  academicTerm: string | null;
  subjects: ParsedSubject[];
};

const NON_CODE_PREFIXES = new Set([
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
  'MWF',
  'TTH',
  'MTH',
  'MWS',
  'MFS',
  'MF',
  'MW',
  'TF',
  'WF',
  'FS',
  'TBA',
  'AND',
  'FOR',
  'THE',
  'SEM',
  'NOT',
  'AM',
  'PM',
  'SUM',
]);

const ROOM_EXCLUDES = new Set([
  ...Array.from(NON_CODE_PREFIXES),
  'TH',
  'TU',
  'MO',
  'WE',
  'FR',
  'SA',
  'SU',
  'TBA',
  'NONE',
  'MTWTHF',
  'SUM',
]);

const DAY_COMPOUNDS: [string, string[]][] = [
  ['MTWTHF', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']],
  ['MTTHF', ['Mon', 'Tue', 'Thu', 'Fri']],
  ['MWTHF', ['Mon', 'Wed', 'Thu', 'Fri']],
  ['MWTH', ['Mon', 'Wed', 'Thu']],
  ['TWTH', ['Tue', 'Wed', 'Thu']],
  ['MWF', ['Mon', 'Wed', 'Fri']],
  ['MTH', ['Mon', 'Thu']],
  ['TTH', ['Tue', 'Thu']],
  ['MWS', ['Mon', 'Wed', 'Sat']],
  ['MFS', ['Mon', 'Fri', 'Sat']],
  ['FS', ['Fri', 'Sat']],
  ['MF', ['Mon', 'Fri']],
  ['MW', ['Mon', 'Wed']],
  ['TF', ['Tue', 'Fri']],
  ['WF', ['Wed', 'Fri']],
];

function parseDays(raw: string): string[] {
  const d = raw.toUpperCase().replace(/\s+/g, '').trim();
  for (const [pat, result] of DAY_COMPOUNDS) if (d === pat) return result;
  for (const [pat, result] of DAY_COMPOUNDS)
    if (d.startsWith(pat)) return result;
  const out: string[] = [];
  let i = 0;
  while (i < d.length) {
    if (d.slice(i, i + 2) === 'TH') {
      out.push('Thu');
      i += 2;
      continue;
    }
    if (d[i] === 'M') {
      out.push('Mon');
      i++;
      continue;
    }
    if (d[i] === 'T') {
      out.push('Tue');
      i++;
      continue;
    }
    if (d[i] === 'W') {
      out.push('Wed');
      i++;
      continue;
    }
    if (d[i] === 'F') {
      out.push('Fri');
      i++;
      continue;
    }
    if (d[i] === 'S') {
      out.push('Sat');
      i++;
      continue;
    }
    i++;
  }
  return [...new Set(out)];
}

function normalizeTime(raw: string, ampmHint: string): string {
  let s = raw.trim();
  if (!s.includes(':')) {
    s = `${s}:00`;
  }
  const [hStr, mStr = '00'] = s.split(':');
  const h = parseInt(hStr, 10);
  const mins = (mStr || '00').slice(0, 2).padStart(2, '0');
  const cleaned = ampmHint.toUpperCase().replace(/[^AMPM]/g, '');
  const period: 'AM' | 'PM' =
    cleaned === 'AM' || cleaned === 'PM'
      ? cleaned
      : h >= 7 && h < 12
      ? 'AM'
      : 'PM';
  return `${h.toString().padStart(2, '0')}:${mins} ${period}`;
}

export const isGenuineCorDocument = (
  rawText: string,
  subjects: ParsedSubject[],
): boolean => {
  if (subjects.length === 0) return false;

  const lower = rawText.toLowerCase();

  // Tier 1: Check for Institutional Keywords
  const institutionalKeywords = [
    'mindanao state university',
    'msu',
    'certificate of registration',
    'office of the registrar',
    'student registration',
    'matriculation',
    'cor',
  ];
  const hasInstitutional = institutionalKeywords.some(kw => lower.includes(kw));

  // Tier 2: Check for Table Headers & Academic Keywords
  const structuralKeywords = [
    'subject',
    'code',
    'title',
    'units',
    'schedule',
    'instructor',
    'room',
    'section',
    'semester',
    'lec',
    'lab',
  ];
  const structuralScore = structuralKeywords.filter(kw =>
    lower.includes(kw),
  ).length;

  // Tier 3: Temporal & Day Density Check
  const timeMatches = (rawText.match(/\d{1,2}:\d{2}/g) || []).length;
  const dayMatches = (
    rawText.match(/\b(MON|TUE|WED|THU|FRI|SAT|SUN|MWF|TTH|MTH|MTWTHF)\b/gi) ||
    []
  ).length;

  // Case A: Full document scan with institutional header and valid subjects
  if (hasInstitutional && subjects.length >= 1) return true;

  // Case B: Tightly cropped schedule table (must have academic column headers OR strong time/day patterns)
  if (structuralScore >= 2 && subjects.length >= 1) return true;
  if ((timeMatches >= 1 || dayMatches >= 1) && subjects.length >= 1)
    return true;

  // False positive (e.g., random receipt or non-academic image)
  return false;
};

export function parseCorText(rawText: string): ParseResult {
  const text = rawText
    .replace(/\bOpm\b/g, '0pm')
    .replace(/\bpn\b/gi, 'pm')
    .replace(/\barn\b/gi, 'am')
    .replace(/STTO/gi, 'STT0')
    .replace(
      /\b[1l|]([A-Z]{2,3}\d{3})(?!\d)/gi,
      (_, p1) => 'I' + p1.toUpperCase(),
    )
    .replace(
      /\b([A-Z]{2,4}[1-9])O(\d)(?!\d)/gi,
      (_, p1, p2) => p1.toUpperCase() + '0' + p2,
    )
    .replace(/(\d{1,2}:\d{2})\s*[Aa][l1|][Mm]/g, '$1am')
    .replace(/(\d{1,2}:\d{2})\s*[Pp][l1|][Mm]/g, '$1pm')
    .replace(/[–—]/g, '-')
    .replace(/[ \t]+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');

  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
  const fullText = lines.join(' ');

  let detectedSemester: string | null = null;
  const semLabelMatch = fullText.match(
    /Semester\s*[:]\s*(first|1st|second|2nd|summer)\s*sem(?:ester)?/i,
  );
  if (semLabelMatch) {
    const r = semLabelMatch[1].toLowerCase();
    detectedSemester =
      r.startsWith('1') || r === 'first'
        ? '1st Sem'
        : r.startsWith('2') || r === 'second'
        ? '2nd Sem'
        : 'Summer';
  } else {
    for (const [pat, label] of [
      [/first\s+sem(?:ester)?/i, '1st Sem'],
      [/1st\s+sem(?:ester)?/i, '1st Sem'],
      [/second\s+sem(?:ester)?/i, '2nd Sem'],
      [/2nd\s+sem(?:ester)?/i, '2nd Sem'],
      [/summer\s*(?:class|term|sem)?/i, 'Summer'],
    ] as [RegExp, string][]) {
      if (pat.test(fullText)) detectedSemester = label;
    }
  }

  const yearMatch = fullText.match(
    /(?:A\.?Y\.?|S\.?Y\.?|Acad\.?\s+Year|Academic\s+Year)\s*[:–-]?\s*(\d{4}[-–]\d{4}|\d{4}[-–]\d{2})/i,
  );
  const yearSuffix = yearMatch ? `, ${yearMatch[1].replace('–', '-')}` : '';
  const academicTerm = detectedSemester
    ? `${detectedSemester}${yearSuffix}`
    : null;

  const CODE_SRC = /\b([A-Z]{2,4})\s?(\d{3}(?:\.\d)?)(?!\d)/.source;
  const codeItems: {code: string; lineIndex: number}[] = [];

  for (let i = 0; i < lines.length; i++) {
    const local = new RegExp(CODE_SRC, 'gi');
    let m: RegExpExecArray | null;
    while ((m = local.exec(lines[i])) !== null) {
      const prefix = m[1].toUpperCase();
      const normalized = `${prefix}${m[2]}`;

      if (!NON_CODE_PREFIXES.has(prefix)) {
        const isDuplicate = codeItems.some(
          c => c.code === normalized && Math.abs(c.lineIndex - i) <= 2,
        );
        if (!isDuplicate) {
          codeItems.push({code: normalized, lineIndex: i});
        }
      }
    }
  }

  const TIME_SRC =
    /(\d{1,2}(?::\d{2})?)\s*([AaPp][Mm])?\s*[-–to]+\s*(\d{1,2}(?::\d{2})?)\s*([AaPp][Mm])/
      .source;
  const DAY_SRC =
    /\b(MTWTHF|MTTHF|MWTHF|MWTH|TWTH|MWF|MTH|TTH|MWS|MFS|FS|MF|MW|TF|WF|[MTWFHS]{1,6})\b/
      .source;
  const DAY_RE = new RegExp(DAY_SRC);

  interface FoundSchedule {
    lineIndex: number;
    start: string;
    end: string;
    days: string[];
  }
  const foundSchedules: FoundSchedule[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const localRx = new RegExp(TIME_SRC, 'gi');
    let m: RegExpExecArray | null;
    while ((m = localRx.exec(line)) !== null) {
      const endAmPm = (m[4] || '').toLowerCase();
      const startAmPm = (m[2] || endAmPm).toLowerCase();
      let daysRaw = '';
      const sameMatch = line.match(DAY_RE);
      if (sameMatch) daysRaw = sameMatch[1];
      else if (i > 0 && DAY_RE.test(lines[i - 1]))
        daysRaw = lines[i - 1].match(DAY_RE)![1];
      else if (i + 1 < lines.length && DAY_RE.test(lines[i + 1]))
        daysRaw = lines[i + 1].match(DAY_RE)![1];
      foundSchedules.push({
        lineIndex: i,
        start: normalizeTime(m[1], startAmPm),
        end: normalizeTime(m[3], endAmPm || startAmPm),
        days: daysRaw ? parseDays(daysRaw) : [],
      });
    }
  }

  const TIME_TEST_RE = /\d{1,2}:\d{2}/;
  const CODE_TEST_RE = new RegExp(CODE_SRC, 'i');
  const DAY_ONLY_RE = new RegExp(`^(${DAY_SRC.slice(3, -4)})$`, 'i');

  const isValidRoom = (t: string): boolean => {
    return (
      t.length >= 2 &&
      t.length <= 10 &&
      !t.includes(' ') &&
      !codeItems.some(c => c.code === t.toUpperCase()) &&
      !ROOM_EXCLUDES.has(t.toUpperCase()) &&
      !DAY_ONLY_RE.test(t) &&
      !TIME_TEST_RE.test(t) &&
      !/^[1-6]$/.test(t) &&
      !/^\d{1,2}$/.test(t) &&
      (/^\d{3,4}$/.test(t) ||
        (/[A-Za-z]/.test(t) && /\d/.test(t)) ||
        /[Ll]ab$/.test(t) ||
        /^[A-Z]{2,4}$/.test(t))
    );
  };

  const extractInstructor = (ctx: string): string => {
    const m = ctx.match(
      /(?:Prof\.?|Dr\.?|Mr\.?|Ms\.?|Mrs\.?|Engr\.?|Atty\.?|Inst\.?)\s+[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*/,
    );
    return m ? m[0].trim() : '';
  };

  const subjects: ParsedSubject[] = codeItems.map((item, idx) => {
    const nextCodeLine = codeItems[idx + 1]?.lineIndex ?? lines.length;
    const windowEnd = Math.min(item.lineIndex + 8, nextCodeLine);
    const ctxLines = lines.slice(item.lineIndex, windowEnd);
    const ctxText = ctxLines.join(' ');

    let bestSchedule: FoundSchedule | null = null;
    let bestDist = Infinity;
    for (const sched of foundSchedules) {
      const dist = sched.lineIndex - item.lineIndex;
      if (dist >= 0 && dist < bestDist && sched.lineIndex < windowEnd) {
        bestDist = dist;
        bestSchedule = sched;
      }
    }

    let section = '';
    let titleStart = 1;
    if (ctxLines.length > 1) {
      const candidate = ctxLines[1].trim();
      if (
        candidate.length >= 1 &&
        candidate.length <= 8 &&
        !candidate.includes(' ') &&
        !CODE_TEST_RE.test(candidate) &&
        !TIME_TEST_RE.test(candidate) &&
        !DAY_ONLY_RE.test(candidate) &&
        !/^\d+$/.test(candidate)
      ) {
        section = candidate;
        titleStart = 2;
      }
    }

    let title = '';
    for (let j = titleStart; j < ctxLines.length; j++) {
      const l = ctxLines[j];
      if (
        l.includes(' ') &&
        l.length >= 8 &&
        /[a-zA-Z]/.test(l) &&
        !CODE_TEST_RE.test(l) &&
        !TIME_TEST_RE.test(l) &&
        !DAY_ONLY_RE.test(l.trim())
      ) {
        title = l;
        break;
      }
    }

    let units = 3;
    let unitsLineIdx = -1;
    for (let j = 0; j < ctxLines.length; j++) {
      if (/^[1-6]$/.test(ctxLines[j].trim())) {
        units = parseInt(ctxLines[j].trim(), 10);
        unitsLineIdx = j;
        break;
      }
    }

    let room = '';
    if (unitsLineIdx >= 0 && unitsLineIdx + 1 < ctxLines.length) {
      const candidate = ctxLines[unitsLineIdx + 1].trim();
      if (isValidRoom(candidate)) room = candidate;
    }

    if (unitsLineIdx === -1) {
      const explicit =
        ctxText.match(/\b([1-6])\s*units?\b/i) || ctxText.match(/\(([1-6])\)/);
      if (explicit) {
        units = Math.min(6, Math.max(1, parseInt(explicit[1], 10)));
      } else {
        const allTimeMatches = [
          ...ctxText.matchAll(/\d{1,2}:\d{2}\s*[AaPp][Mm]/g),
        ];
        const lastTimeMatch = allTimeMatches.pop();
        if (lastTimeMatch) {
          const afterStr = ctxText
            .slice(lastTimeMatch.index! + lastTimeMatch[0].length)
            .trim();
          const tokens = afterStr.split(/\s+/).filter(t => t.length > 0);
          if (tokens.length >= 1 && /^[1-6]$/.test(tokens[0])) {
            units = parseInt(tokens[0], 10);
            if (!room && tokens.length >= 2 && isValidRoom(tokens[1])) {
              room = tokens[1];
            }
          }
        }
      }
    }

    return {
      code: item.code,
      section,
      title,
      units,
      days: bestSchedule?.days || [],
      startTime: bestSchedule?.start || '',
      endTime: bestSchedule?.end || '',
      room,
      instructor: extractInstructor(ctxText),
    };
  });

  return {detectedSemester, academicTerm, subjects};
}

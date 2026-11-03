import {identifyColumn, readTable, TableRecord} from './ocrLayout';
import {
  extractTimeRanges,
  parseScheduleDays,
  stripScheduleText,
} from './scheduleText';
import type {
  OcrDocument,
  ParsedSubject,
  ParseResult,
  ScanReview,
} from './scanTypes';
export type {ParsedSubject, ParseResult} from './scanTypes';

const CODE = /^([A-Z]{2,8})[\s-]*(\d{1,4}(?:\.\d{1,2})?[A-Z]?)(?=\s|$|[|])/i;
const EXCLUDED_CODES = new Set([
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
  'MWF',
  'TTH',
  'TBA',
  'SEM',
  'ROOM',
  'YEAR',
  'TOTAL',
  'UNITS',
  'SECTION',
]);
const UNIT = /^(?:[1-6](?:\.0)?)$/;
const INSTRUCTOR =
  /(?:Prof\.?|Dr\.?|Mr\.?|Ms\.?|Mrs\.?|Engr\.?|Atty\.?|Inst\.?)\s+[A-Za-z][A-Za-z.,-]*(?:\s+[A-Za-z][A-Za-z.,-]*){0,4}/i;

function normalizeText(text: string) {
  return text
    .replace(/\r/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\u00a0/g, ' ')
    .replace(/[–—]/g, '-')
    .replace(/\b([A-Z]{2,8}\s*\d)O(\d)\b/g, '$10$2');
}
function normalizeCode(value: string) {
  const match = value.trim().match(CODE);
  return match && !EXCLUDED_CODES.has(match[1].toUpperCase())
    ? `${match[1]}${match[2]}`.toUpperCase()
    : '';
}
/** Class/section identifiers are distinct from numeric course identifiers. */
function isClassCode(value: string) {
  return (
    /^\*?(?=[A-Za-z0-9]*[A-Za-z])[A-Za-z0-9]{2,8}$/.test(value) &&
    !/^(?:IT|AI|SQL|ROTC|CWTS|NSTP|TBA)$/i.test(value)
  );
}
function cleanTitle(value: string, code: string, section: string) {
  let title = value.replace(/\s+/g, ' ').trim();
  // Remove a duplicated course or known section only at the start of the cell.
  for (const identifier of [code, section]) {
    if (!identifier) continue;
    const first = title.split(/\s+/)[0];
    if (first.toUpperCase() === identifier.toUpperCase())
      title = title.slice(first.length).trim();
  }
  if (!/\s/.test(title) && normalizeCode(title) === title.toUpperCase())
    return '';
  if (isClassCode(title) && /\d/.test(title)) return '';
  if (/^(?:[A-Z][a-z]){2,}\d?$/.test(title) || /^TBA$/i.test(title)) return '';
  return /[A-Za-z]{3}/.test(title) ? title : '';
}
function isDaysOnly(value: string) {
  return (
    parseScheduleDays(value).length > 0 &&
    !stripScheduleText(value).replace(/[\s.,/\-]/g, '')
  );
}
function isRoom(value: string) {
  return (
    !isDaysOnly(value) &&
    !/^(?:TBA|AM|PM|NONE)$/i.test(value) &&
    /^(?:\d{3,4}|[A-Z]{1,8}[- ]?\d{1,4}|[A-Z]{1,6}LAB)$/i.test(value)
  );
}
function readTerm(text: string) {
  const semester = text.match(
    /\b(first|1st|second|2nd)\s+sem(?:ester)?\b|\b(summer)\b/i,
  );
  const detectedSemester = semester
    ? semester[2]
      ? 'Summer'
      : /^(?:first|1st)$/i.test(semester[1])
      ? '1st Sem'
      : '2nd Sem'
    : null;
  const year = text.match(
    /\b(?:A\.?Y\.?|S\.?Y\.?|Acad\.?\s+Year|Academic\s+Year)\s*[:\-]?\s*(\d{4})\s*-\s*(\d{4}|\d{2})\b/i,
  );
  const suffix = year
    ? `, ${year[1]}-${
        year[2].length === 2 ? year[1].slice(0, 2) + year[2] : year[2]
      }`
    : '';
  return {
    detectedSemester,
    academicTerm: detectedSemester ? detectedSemester + suffix : null,
  };
}

function delimitedTable(lines: string[]): TableRecord[] {
  const split = (line: string) =>
    line
      .replace(/^\s*\||\|\s*$/g, '')
      .split(/\s*\|\s*|\t+| {2,}/)
      .map(cell => cell.trim());
  const headerIndex = lines.findIndex(line => {
    const names = split(line).map(identifyColumn);
    return (
      names.includes('code') &&
      names.includes('title') &&
      names.filter(Boolean).length >= 3
    );
  });
  if (headerIndex < 0) return [];
  const names = split(lines[headerIndex]).map(identifyColumn);
  const result: TableRecord[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const cells = split(line);
    if (cells.length < 3) continue;
    const fields: TableRecord['fields'] = {};
    cells.forEach((cell, index) => {
      const name = names[index];
      if (name) fields[name] = cell;
    });
    if (fields.code && normalizeCode(fields.code))
      result.push({fields, raw: line});
  }
  return result;
}

function subjectFromTable(record: TableRecord): ParsedSubject {
  const fields = record.fields;
  const schedule = [fields.days, fields.time].filter(Boolean).join(' ');
  const code = normalizeCode(fields.code ?? '');
  const codeMatch = fields.code?.trim().match(CODE);
  const combinedSection = codeMatch
    ? fields.code!.trim().slice(codeMatch[0].length).trim()
    : '';
  let section =
    fields.section?.trim() ||
    (isClassCode(combinedSection) ? combinedSection : '');
  let title = fields.title ?? '';
  // Recover a short class code accidentally included before a description, not ordinary words.
  const [first, ...rest] = title.trim().split(/\s+/);
  if (
    !section &&
    rest.length &&
    isClassCode(first) &&
    (/\d/.test(first) || /^(?:[A-Z][a-z]){2,}$/.test(first))
  ) {
    section = first;
    title = rest.join(' ');
  }
  return finishSubject(
    {
      code,
      section,
      title,
      units: Number(fields.units),
      room: fields.room ?? '',
      instructor: fields.instructor ?? '',
    },
    schedule,
    /^TBA$/i.test(fields.time?.trim() ?? ''),
  );
}

function finishSubject(
  details: Omit<ParsedSubject, 'days' | 'startTime' | 'endTime' | 'review'>,
  scheduleText: string,
  explicitTBA: boolean,
): ParsedSubject {
  const fields: ScanReview['fields'] = [];
  const notes: string[] = [];
  const title = cleanTitle(details.title, details.code, details.section);
  const units =
    Number.isInteger(details.units) && details.units >= 1 && details.units <= 6
      ? details.units
      : 0;
  if (!title) fields.push('title');
  if (!units) fields.push('units');
  const ranges = extractTimeRanges(scheduleText);
  let days = parseScheduleDays(scheduleText);
  let startTime = '';
  let endTime = '';
  const unique = new Set(
    ranges
      .filter(range => range.valid)
      .map(range => `${range.startTime}|${range.endTime}`),
  );
  if (unique.size === 1 && ranges.every(range => range.valid)) {
    startTime = ranges[0].startTime;
    endTime = ranges[0].endTime;
    if (ranges.some(range => range.inferred)) {
      fields.push('time');
      notes.push('Check inferred AM/PM.');
    }
  } else if (unique.size > 1) {
    days = [];
    fields.push('time', 'days');
    notes.push('Multiple meeting times. Review the schedule.');
  }
  if (!explicitTBA) {
    if (!days.length && !fields.includes('days')) fields.push('days');
    if (!startTime && !fields.includes('time')) fields.push('time');
  }
  return {
    ...details,
    title,
    section: details.section.trim(),
    room: details.room.trim(),
    instructor: details.instructor.replace(/\s+/g, ' ').trim(),
    units,
    days,
    startTime,
    endTime,
    review: {fields, notes, scheduleText, explicitTBA},
  };
}

function textSubjects(lines: string[]): ParsedSubject[] {
  const starts: Array<{index: number; code: string; tail: string}> = [];
  lines.forEach((line, index) => {
    const match = line.match(CODE);
    if (!match || EXCLUDED_CODES.has(match[1].toUpperCase())) return;
    const tail = line
      .slice(match[0].length)
      .replace(/^\s*[-|:]\s*/, '')
      .trim();
    const previousStart = starts[starts.length - 1];
    if (
      !tail &&
      previousStart?.index === index - 1 &&
      line.length <= 5 &&
      isClassCode(line) &&
      /[A-Za-z]{3}/.test(lines[index + 1] ?? '') &&
      !normalizeCode(lines[index + 1] ?? '')
    )
      return;
    // A standalone room after units is not a second course.
    if (
      !tail &&
      UNIT.test(lines[index - 1] ?? '') &&
      (extractTimeRanges(lines[index + 1] ?? '').length ||
        isDaysOnly(lines[index + 1] ?? '') ||
        /^(?:MAC|CICS|ROOM|LAB)\d/i.test(line))
    )
      return;
    starts.push({index, code: normalizeCode(match[0]), tail});
  });
  return starts
    .map((item, index) => {
      const context = [
        item.tail,
        ...lines.slice(
          item.index + 1,
          starts[index + 1]?.index ?? lines.length,
        ),
      ].filter(Boolean);
      let section =
        context
          .find(line => /^\s*(?:section|sec)\s*[:.]\s*/i.test(line))
          ?.replace(/^\s*(?:section|sec)\s*[:.]\s*/i, '') ?? '';
      let titleStart = 0;
      let first = context[0] ?? '';
      const sectionMatch = first.match(/^(\*?[A-Za-z0-9]{2,8})\b(?:\s+|$)/);
      if (
        !section &&
        sectionMatch &&
        isClassCode(sectionMatch[1]) &&
        (/\d/.test(sectionMatch[1]) ||
          /^\*?(?:[A-Z]{2,8}|(?:[A-Z][a-z]){1,4})$/.test(sectionMatch[1])) &&
        !isDaysOnly(sectionMatch[1]) &&
        !/^TBA$/i.test(sectionMatch[1]) &&
        (sectionMatch[0].trim() !== first.trim() ||
          !UNIT.test(context[1] ?? ''))
      ) {
        section = sectionMatch[1];
        first = first.slice(sectionMatch[0].length).trim();
        if (first) context[0] = first;
        else titleStart = 1;
      }

      const explicitUnits = context
        .join(' ')
        .match(
          /\b(?:units?|credits?)\s*[:=]\s*([\d.]+)|\b([1-6](?:\.0)?)\s*(?:units?|credits?)\b/i,
        );
      const unitIndex = context.findIndex(line => UNIT.test(line));
      let units = explicitUnits
        ? Number(explicitUnits[1] ?? explicitUnits[2])
        : unitIndex >= 0
        ? Number(context[unitIndex])
        : 0;
      let room =
        context
          .find(line => /^room\s*[:.]/i.test(line))
          ?.replace(/^room\s*[:.]\s*/i, '') ?? '';
      if (!room && unitIndex >= 0 && isRoom(context[unitIndex + 1] ?? ''))
        room = context[unitIndex + 1];
      const instructorLine = context.find(line =>
        /^(?:instructor|faculty)\s*[:.]/i.test(line),
      );
      const instructor =
        instructorLine?.replace(/^(?:instructor|faculty)\s*[:.]\s*/i, '') ??
        context.map(line => line.match(INSTRUCTOR)?.[0]).find(Boolean) ??
        '';

      const scheduleLines = context.filter(
        (line, i) =>
          extractTimeRanges(line).length ||
          isDaysOnly(line) ||
          /^TBA$/i.test(line) ||
          /\b(?:time|schedule)\s*:/i.test(line) ||
          (extractTimeRanges(context[i - 1] ?? '').length &&
            /\b(?:am|pm)\b/i.test(line)),
      );
      const titles: string[] = [];
      for (const line of context.slice(titleStart)) {
        if (
          UNIT.test(line) ||
          isRoom(line) ||
          isDaysOnly(line) ||
          /^TBA$/i.test(line) ||
          INSTRUCTOR.test(line) ||
          /^(?:section|sec|room|instructor|faculty|units?|credits?|total|assessment|fees?)\b/i.test(
            line,
          )
        ) {
          if (titles.length) break;
          continue;
        }
        let candidate = stripScheduleText(line);
        if (extractTimeRanges(line).length) {
          // In a one-line row, a numeric unit immediately before the schedule is structural evidence.
          const range = extractTimeRanges(line)[0];
          const prefix = stripScheduleText(line.slice(0, range.index));
          const inlineUnit = prefix.match(/\s([1-6](?:\.0)?)\s*$/);
          if (inlineUnit) {
            units = Number(inlineUnit[1]);
            candidate = prefix.slice(0, inlineUnit.index).trim();
          } else candidate = prefix;
          const suffix = stripScheduleText(
            line.slice(range.index + range.raw.length),
          );
          if (!room)
            room =
              suffix
                .split(/\s+/)
                .find(token => isRoom(token) && token !== section) ?? '';
        }
        candidate = candidate
          .replace(
            /\b(?:units?|credits?)\s*[:=]\s*[\d.]+|\b[1-6](?:\.0)?\s*(?:units?|credits?)\b/gi,
            '',
          )
          .trim();
        if (candidate && /[A-Za-z]{3}/.test(candidate)) titles.push(candidate);
        if (extractTimeRanges(line).length) break;
      }
      return finishSubject(
        {
          code: item.code,
          section,
          title: titles.join(' '),
          units,
          room,
          instructor,
        },
        scheduleLines.map(line => line.replace(INSTRUCTOR, '')).join('\n'),
        scheduleLines.some(line => /^TBA$/i.test(line)),
      );
    })
    .filter(subject => subject.code);
}

export function parseCorDocument(document: OcrDocument): ParseResult {
  const text = normalizeText(document.text);
  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const table = readTable(document);
  const records = table.length ? table : delimitedTable(lines);
  const subjects = records.length
    ? records.map(subjectFromTable)
    : textSubjects(lines);
  const merged: ParsedSubject[] = [];
  for (const subject of subjects) {
    const existingIndex = merged.findIndex(
      existing =>
        existing.code === subject.code && existing.section === subject.section,
    );
    if (existingIndex < 0) {
      merged.push(subject);
      continue;
    }
    const previous = merged[existingIndex];
    const combined = finishSubject(
      {
        code: previous.code,
        section: previous.section,
        title: previous.title || subject.title,
        units:
          previous.units && subject.units && previous.units !== subject.units
            ? 0
            : previous.units || subject.units,
        room: previous.room || subject.room,
        instructor: previous.instructor || subject.instructor,
      },
      [previous.review.scheduleText, subject.review.scheduleText]
        .filter(Boolean)
        .join('\n'),
      previous.review.explicitTBA && subject.review.explicitTBA,
    );
    if (previous.room && subject.room && previous.room !== subject.room) {
      combined.room = `${previous.room} / ${subject.room}`;
      combined.review.notes.push('Multiple rooms; check the meeting details.');
    }
    merged[existingIndex] = combined;
  }
  return {...readTerm(text), subjects: merged};
}

export function parseCorText(text: string): ParseResult {
  return parseCorDocument({text});
}

export function isGenuineCorDocument(
  rawText: string,
  subjects: ParsedSubject[],
): boolean {
  if (!subjects.length) return false;
  const institutional =
    /\b(?:mindanao state university|msu|certificate of registration|office of the registrar|student registration|matriculation|cor)\b/i.test(
      rawText,
    );
  const headers = [
    'subject',
    'code',
    'title',
    'units',
    'schedule',
    'instructor',
    'room',
    'section',
    'semester',
  ].filter(word => new RegExp(`\\b${word}\\b`, 'i').test(rawText));
  return (
    institutional ||
    headers.length >= 2 ||
    subjects.some(
      subject =>
        subject.title &&
        subject.days.length &&
        subject.startTime &&
        subject.endTime,
    )
  );
}

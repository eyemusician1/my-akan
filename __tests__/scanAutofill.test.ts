import {expect, it} from '@jest/globals';
import {
  parseCorDocument,
  parseCorText,
  isGenuineCorDocument,
} from '../src/features/scanner/domain/corParser';
import {
  extractTimeRanges,
  parseScheduleDays,
} from '../src/features/scanner/domain/scheduleText';
import type {OcrDocument} from '../src/features/scanner/domain/scanTypes';
import corTable from './fixtures/corTable.json';

it('keeps class codes out of descriptions in the photographed Subject/Section layout', () => {
  const {subjects} = parseCorDocument(corTable);
  expect(subjects).toHaveLength(8);
  expect(subjects[0]).toMatchObject({
    code: 'ITD110',
    section: 'EeFf',
    title: 'NoSQL Databases',
  });
  expect(subjects[2]).toMatchObject({
    section: 'CcUu2',
    title: 'Probability and Statistical Inference for Computing',
  });
  expect(subjects[4]).toMatchObject({section: '*MACATO', title: 'CAPSTONE 2'});
  expect(subjects[6]).toMatchObject({
    section: 'MN',
    title: 'Special Topics in IT',
    days: ['Fri'],
    startTime: '08:30 AM',
    endTime: '11:30 AM',
  });
  expect(subjects[7]).toMatchObject({
    section: 'CcUu2',
    title: 'Probability and Statistical Inference for Computing',
  });
  // Missing digits and malformed OCR stay unresolved, instead of inventing times/units.
  expect(subjects[3]).toMatchObject({startTime: '', endTime: '', units: 0});
  expect(subjects[3].review.fields).toEqual(
    expect.arrayContaining(['time', 'units']),
  );
});

it('does not append a distant watermark/footer fragment as another class day', () => {
  const document: OcrDocument = {
    ...corTable,
    blocks: [
      ...corTable.blocks,
      {
        lines: [
          {text: 's', frame: {left: 2120, top: 1800, width: 25, height: 35}},
        ],
      },
    ],
  };
  const {subjects} = parseCorDocument(document);
  expect(subjects[subjects.length - 1].days).toEqual(['Mon', 'Wed']);
});

it.each(['EeFf', 'CcUu2', 'A1B2', '12AB', 'QqRr'])(
  'uses %s as the class/section code in a text-only row',
  section => {
    const {subjects} = parseCorText(
      `ITD110\n${section}\nNoSQL Databases\n3\nMW 8am-9am`,
    );
    expect(subjects).toHaveLength(1);
    expect(subjects[0]).toMatchObject({
      code: 'ITD110',
      section,
      title: 'NoSQL Databases',
    });
  },
);

it('handles an explicit Class Code column and flags a code-only description', () => {
  const {subjects} = parseCorText(
    'Subject Code | Class Code | Description | Units | Schedule\nITD110 | CcUu2 | CcUu2 | 3 | MW 8am-9am\nITE182 | EeFf | Systems Integration and Administration | 3 | TTH 1pm-2pm',
  );
  expect(subjects[0]).toMatchObject({
    code: 'ITD110',
    section: 'CcUu2',
    title: '',
  });
  expect(subjects[0].review.fields).toContain('title');
  expect(subjects[1]).toMatchObject({
    section: 'EeFf',
    title: 'Systems Integration and Administration',
  });
});

it.each([
  ['MW', ['Mon', 'Wed']],
  ['TTH', ['Tue', 'Thu']],
  ['FS', ['Fri', 'Sat']],
  ['F', ['Fri']],
  ['Friday', ['Fri']],
  ['Su', ['Sun']],
  ['Sun', ['Sun']],
  ['Sunday', ['Sun']],
  ['MWF', ['Mon', 'Wed', 'Fri']],
  ['TTh', ['Tue', 'Thu']],
  ['MTThFS', ['Mon', 'Tue', 'Thu', 'Fri', 'Sat']],
  ['Mon / Wed / Fri', ['Mon', 'Wed', 'Fri']],
  ['Monday-Friday', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']],
  ['Sat Sun', ['Sat', 'Sun']],
  ['M.W.F.', ['Mon', 'Wed', 'Fri']],
])('recognizes day notation %s', (input, expected) =>
  expect(parseScheduleDays(input)).toEqual(expected),
);

it('autofills paired COR days, Friday-only subjects, and Sunday NSTP classes', () => {
  const result = parseCorText(
    'Subject Code | Title | Units | Days | Time\n' +
      'CSC101 | Computing | 3 | MW | 8am-9am\n' +
      'MAT101 | Mathematics | 3 | TTH | 9am-10am\n' +
      'ENG101 | English | 3 | FS | 1pm-2pm\n' +
      'PE1 | Physical Education | 2 | F | 10am-12pm\n' +
      'NSTP1 | ROTC | 3 | Sunday | 8am-12pm\n' +
      'NSTP2 | CWTS | 3 | Su | 1pm-5pm',
  );
  expect(result.subjects.map(s => s.days)).toEqual([
    ['Mon', 'Wed'],
    ['Tue', 'Thu'],
    ['Fri', 'Sat'],
    ['Fri'],
    ['Sun'],
    ['Sun'],
  ]);
  expect(result.subjects[4]).toMatchObject({
    title: 'ROTC',
    startTime: '08:00 AM',
    endTime: '12:00 PM',
  });
  expect(result.subjects[5]).toMatchObject({
    title: 'CWTS',
    startTime: '01:00 PM',
    endTime: '05:00 PM',
  });
  expect(result.subjects.every(s => s.review.fields.length === 0)).toBe(true);
});

it.each([
  ['MWF 8-9am', '08:00 AM', '09:00 AM'],
  ['TTH 11-1pm', '11:00 AM', '01:00 PM'],
  ['Mon 13:30-15:00', '01:30 PM', '03:00 PM'],
  ['MWF 0830-0930', '08:30 AM', '09:30 AM'],
  ['Fri 08:00-09:00', '08:00 AM', '09:00 AM'],
  ['Mon 8:O0am to 9:00am', '08:00 AM', '09:00 AM'],
  ['F08:30am-11:30am', '08:30 AM', '11:30 AM'],
])('normalizes scanned range %s', (text, startTime, endTime) => {
  expect(extractTimeRanges(text)[0]).toMatchObject({
    valid: true,
    startTime,
    endTime,
  });
});

it.each([
  'MWF 8:75am-9:00am',
  'Mon 13:00pm-14:00pm',
  'TTH 9:00am-8:00am',
  'Wed 8:00-9:00',
  'TH 10:302am-01:00prm',
  'MW 08:30am-09:001am',
])('flags invalid or ambiguous scanned time %s', text => {
  expect(extractTimeRanges(text).some(range => range.valid)).toBe(false);
});

it('does not turn a room code into a course or lose the original course schedule', () => {
  const result = parseCorText(
    'Certificate of Registration\nCSC101\nA1\nIntroduction to Computing\n3\nMAC101\nMWF 8am-9am\nMAT102\nB1\nCollege Mathematics\n3\nENG201\nTTH 1pm-2pm',
  );
  expect(result.subjects.map(subject => subject.code)).toEqual([
    'CSC101',
    'MAT102',
  ]);
  expect(result.subjects[0]).toMatchObject({
    room: 'MAC101',
    startTime: '08:00 AM',
  });
  expect(result.subjects[1]).toMatchObject({
    room: 'ENG201',
    startTime: '01:00 PM',
  });
});

it('extracts same-line rows with named table columns and nonstandard course codes', () => {
  const result = parseCorText(
    `Semester: Second Semester\nSubject Code | Section | Descriptive Title | Units | Days | Time | Room | Instructor\nPE 1 | A1 | Physical Education | 2 | Sat | 9am-10am | GYM1 | Cruz, Ana\nCSC 101.1 | B2 | Data Structures | 3 | TTh | 13:00-14:30 | MAC101 | Prof. Santos`,
  );
  expect(result.subjects).toHaveLength(2);
  expect(result.subjects[0]).toMatchObject({
    code: 'PE1',
    title: 'Physical Education',
    units: 2,
    room: 'GYM1',
    instructor: 'Cruz, Ana',
  });
  expect(result.subjects[1]).toMatchObject({
    code: 'CSC101.1',
    section: 'B2',
    days: ['Tue', 'Thu'],
    endTime: '02:30 PM',
  });
});

it('reads column-ordered OCR blocks by coordinates and preserves wrapped titles', () => {
  const columns = [
    ['Subject Code', 'CSC101', 'MAT102'],
    ['Section', 'A1', 'B1'],
    ['Description', 'Introduction to', 'College Mathematics'],
    ['Units', '3', '4'],
    ['Days', 'MWF', 'TTH'],
    ['Time', '8am-9am', '1pm-2pm'],
    ['Room', 'MAC101', 'ENG201'],
    ['Instructor', 'Prof. Santos', 'Maria Cruz'],
  ];
  const xs = [10, 140, 240, 650, 740, 840, 1110, 1260];
  const document: OcrDocument = {
    text: 'Certificate of Registration\nFirst Semester\nAcademic Year: 2026-2027',
    blocks: columns.map((column, i) => ({
      lines: column.map((text, row) => ({
        text,
        frame: {
          left: xs[i],
          top: row === 0 ? 10 : row === 1 ? 50 : 100,
          width: i === 2 ? 270 : 80,
          height: 18,
        },
        elements: [],
      })),
    })),
  };
  document.blocks![2].lines.push({
    text: 'Computing',
    frame: {left: 240, top: 72, width: 100, height: 18},
  });
  const result = parseCorDocument(document);
  expect(result.subjects).toHaveLength(2);
  expect(result.subjects[0]).toMatchObject({
    code: 'CSC101',
    title: 'Introduction to Computing',
    room: 'MAC101',
    units: 3,
  });
  expect(result.subjects[1]).toMatchObject({
    code: 'MAT102',
    instructor: 'Maria Cruz',
    room: 'ENG201',
    units: 4,
  });
});

it('does not invent units or silently convert missing logistics into TBA', () => {
  const result = parseCorText('CSC101\nIntroduction to Computing').subjects[0];
  expect(result.units).toBe(0);
  expect(result.review.fields).toEqual(
    expect.arrayContaining(['units', 'time', 'days']),
  );
  expect(result.review.explicitTBA).toBe(false);
  expect(
    parseCorText('CSC101\nIntroduction to Computing\n3\nTBA').subjects[0].review
      .explicitTBA,
  ).toBe(true);
});

it('merges repeated course rows without double-counting units and flags different meeting times', () => {
  const result = parseCorText(
    'Subject Code | Section | Title | Units | Days | Time | Room\nCSC101 | A1 | Computing | 3 | Mon | 8am-9am | MAC101\nCSC101 | A1 | Computing | 3 | Wed | 10am-11am | LAB2',
  );
  expect(result.subjects).toHaveLength(1);
  expect(result.subjects[0]).toMatchObject({
    units: 3,
    startTime: '',
    endTime: '',
  });
  expect(result.subjects[0].review.notes.join(' ')).toContain(
    'Multiple meeting times',
  );
  expect(result.subjects[0].review.scheduleText).toContain('10am-11am');
});

it('rejects a non-academic document with a code-like reference', () => {
  const text = 'Receipt\nABC123\nPurchased groceries\n300';
  const parsed = parseCorText(text);
  expect(isGenuineCorDocument(text, parsed.subjects)).toBe(false);
});

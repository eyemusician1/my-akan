import {it, expect} from '@jest/globals';
import {
  isGenuineCorDocument,
  parseCorText,
} from '../src/features/scanner/domain/corParser';

const document = `Mindanao State University
Certificate of Registration
Semester: First Semester
Academic Year: 2026-2027
Subject Code Title Units Room Schedule
CSC101
A1
Introduction to Computing
3
301
MWF 8:00am - 9:00am
Prof. Maria Santos
MAT102
B1
College Mathematics
3
302
TTH 1:00pm - 2:30pm`;

it('extracts the term and independently associates each subject with its schedule', () => {
  const result = parseCorText(document);
  expect(result.academicTerm).toBe('1st Sem, 2026-2027');
  expect(result.subjects).toHaveLength(2);
  expect(result.subjects[0]).toMatchObject({
    code: 'CSC101',
    section: 'A1',
    title: 'Introduction to Computing',
    units: 3,
    room: '301',
    days: ['Mon', 'Wed', 'Fri'],
    startTime: '08:00 AM',
    endTime: '09:00 AM',
  });
  expect(result.subjects[1]).toMatchObject({
    code: 'MAT102',
    days: ['Tue', 'Thu'],
    startTime: '01:00 PM',
    endTime: '02:30 PM',
  });
  expect(isGenuineCorDocument(document, result.subjects)).toBe(true);
});

it('normalizes bare hours to hours rather than minutes', () => {
  const result = parseCorText(
    'CSC101\nIntroduction to Computing\nMWF 8am - 9am',
  );
  expect(result.subjects[0]).toMatchObject({
    startTime: '08:00 AM',
    endTime: '09:00 AM',
  });
});

it('preserves TBA subjects for review and rejects documents without academic evidence', () => {
  const result = parseCorText('CSC101\nIntroduction to Computing\n3\nTBA');
  expect(result.subjects[0]).toMatchObject({
    days: [],
    startTime: '',
    endTime: '',
  });
  expect(isGenuineCorDocument('A random receipt', result.subjects)).toBe(false);
  expect(parseCorText('Nothing useful here').subjects).toEqual([]);
});

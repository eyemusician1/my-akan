import {expect, it} from '@jest/globals';
import {
  calculateGpa,
  cumulativeScope,
  GRADE_VALUES,
  gradeProgress,
  isValidGrade,
} from '../src/features/grades/domain/gpa';

it('accepts the supplied subject-grade scale and leaves ungraded subjects incomplete', () => {
  expect([...GRADE_VALUES]).toEqual([
    1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 5,
  ]);
  for (const value of GRADE_VALUES) expect(isValidGrade(value)).toBe(true);
  for (const value of [
    null,
    undefined,
    0,
    3.25,
    4,
    4.75,
    5.25,
    NaN,
    Infinity,
    '1.00',
  ])
    expect(isValidGrade(value)).toBe(false);
  expect(gradeProgress([{id: 'one', units: 3, grade: null}])).toMatchObject({
    graded: 0,
    ready: false,
  });
  expect(gradeProgress([]).ready).toBe(false);
});
it('weights grades by units and includes failed subjects in the denominator', () => {
  expect(
    calculateGpa([
      {id: 'one', units: 3, grade: 1},
      {id: 'two', units: 1, grade: 3},
    ]),
  ).toMatchObject({value: 1.5, units: 4, subjects: 2, failed: 0});
  expect(
    calculateGpa([
      {id: 'one', units: 3, grade: 5},
      {id: 'two', units: 1, grade: 1},
    ]),
  ).toMatchObject({value: 4, units: 4, failed: 1});
  expect(
    calculateGpa([
      {id: 'one', units: 2, grade: 1.25},
      {id: 'two', units: 2, grade: 2},
    ]).value,
  ).toBe(1.63);
});
it.each([null, 4, NaN])(
  'blocks a final GPA for an incomplete/invalid grade %s',
  grade => {
    expect(() => calculateGpa([{id: 'one', units: 3, grade}])).toThrow(
      'Complete all grades',
    );
  },
);
it.each([0, -1, Infinity, NaN])('rejects an invalid unit weight %s', units => {
  expect(() => calculateGpa([{id: 'one', units, grade: 1}])).toThrow();
});
it('calculates CGPA from total weighted units, excluding incomplete semesters', () => {
  const scope = cumulativeScope([
    {id: 'first', subjects: [{id: 'a', units: 6, grade: 1}]},
    {id: 'second', subjects: [{id: 'b', units: 3, grade: 3}]},
    {id: 'current', subjects: [{id: 'c', units: 3, grade: null}]},
  ]);
  expect(scope.completed).toHaveLength(2);
  expect(scope.incomplete).toBe(1);
  expect(calculateGpa(scope.subjects)).toMatchObject({value: 1.67, units: 9});
});

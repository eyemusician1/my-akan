export const GRADE_VALUES = [
  1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 5,
] as const;
export interface GradedSubject {
  id: string;
  units: number;
  grade?: number | null;
}
export interface GradeTerm {
  id: string;
  subjects: GradedSubject[];
}
export interface GradeBookSubject extends GradedSubject {
  code: string;
  title: string;
  scheduleId: string;
}
export interface GradeBookTerm extends GradeTerm {
  academicTerm: string;
  subjects: GradeBookSubject[];
}
export interface GpaResult {
  value: number;
  units: number;
  subjects: number;
  failed: number;
  weightedPoints: number;
}

export function isValidGrade(value: unknown): value is number {
  return (
    typeof value === 'number' && GRADE_VALUES.some(grade => grade === value)
  );
}
export function gradeProgress(subjects: GradedSubject[]) {
  const graded = subjects.filter(subject => isValidGrade(subject.grade)).length;
  const validWeights = subjects.every(
    subject => Number.isFinite(subject.units) && subject.units > 0,
  );
  return {
    graded,
    total: subjects.length,
    ready: subjects.length > 0 && graded === subjects.length && validWeights,
    validWeights,
  };
}
export function calculateGpa(subjects: GradedSubject[]): GpaResult {
  const progress = gradeProgress(subjects);
  if (!progress.ready)
    throw new Error('Complete all grades and check subject units.');
  const units = subjects.reduce((sum, subject) => sum + subject.units, 0);
  // Preserve grade hundredths until the single final rounding step; 5.00 is included.
  const weightedPoints = subjects.reduce(
    (sum, subject) => sum + Math.round(subject.grade! * 100) * subject.units,
    0,
  );
  const hundredths = Math.floor((weightedPoints * 2 + units) / (units * 2));
  return {
    value: hundredths / 100,
    units,
    subjects: subjects.length,
    failed: subjects.filter(subject => subject.grade === 5).length,
    weightedPoints,
  };
}
export function cumulativeScope(terms: GradeTerm[]) {
  const completed = terms.filter(term => gradeProgress(term.subjects).ready);
  return {
    completed,
    subjects: completed.flatMap(term => term.subjects),
    incomplete: terms.filter(
      term => term.subjects.length && !gradeProgress(term.subjects).ready,
    ).length,
  };
}
export function gradeFingerprint(scope: string, subjects: GradedSubject[]) {
  return JSON.stringify([
    scope,
    subjects.map(subject => [subject.id, subject.units, subject.grade ?? null]),
  ]);
}

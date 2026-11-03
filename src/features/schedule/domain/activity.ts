import type {SubjectDraft} from './types';

export function changedSubjectFields(
  previous: Partial<SubjectDraft>,
  next: SubjectDraft,
): string[] {
  const fields: Array<[keyof SubjectDraft, string]> = [
    ['code', 'Code'],
    ['title', 'Title'],
    ['section', 'Section'],
    ['units', 'Units'],
    ['room', 'Room'],
    ['instructor', 'Instructor'],
    ['startTime', 'Time'],
    ['endTime', 'Time'],
  ];
  const changed = new Set(
    fields
      .filter(([key]) => (previous[key] ?? '') !== next[key])
      .map(([, label]) => label),
  );
  if (
    [...(previous.days ?? [])].sort().join(',') !==
    [...next.days].sort().join(',')
  )
    changed.add('Days');
  return [...changed];
}

export interface SubjectDraft {
  code: string;
  section: string;
  title: string;
  units: number;
  days: string[];
  startTime: string;
  endTime: string;
  room: string;
  instructor: string;
}

export interface SaveSubjectInput {
  academicTerm: string;
  declaredUnits?: number;
  subjectId?: string;
  subject: SubjectDraft;
}

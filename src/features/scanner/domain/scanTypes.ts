import type {SubjectDraft} from '../../schedule/domain/types';

export interface ScanReview {
  fields: Array<'title' | 'units' | 'days' | 'time'>;
  notes: string[];
  scheduleText: string;
  explicitTBA: boolean;
}

export interface ParsedSubject extends SubjectDraft {
  review: ScanReview;
}

export interface ParseResult {
  detectedSemester: string | null;
  academicTerm: string | null;
  subjects: ParsedSubject[];
}

export interface OcrFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface OcrPoint {
  x: number;
  y: number;
}
export interface OcrDocument {
  text: string;
  blocks?: Array<{
    lines: Array<{
      text: string;
      frame?: OcrFrame;
      cornerPoints?: readonly OcrPoint[];
      elements?: Array<{
        text: string;
        frame?: OcrFrame;
        cornerPoints?: readonly OcrPoint[];
      }>;
    }>;
  }>;
}

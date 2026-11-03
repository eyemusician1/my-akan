import TextRecognition from '@react-native-ml-kit/text-recognition';
import ImageResizer from 'react-native-image-resizer';
import {parseCorDocument, isGenuineCorDocument} from '../domain/corParser';
import {readTable} from '../domain/ocrLayout';
import {orientOcrDocument} from '../domain/ocrOrientation';
import type {ParseResult, OcrDocument} from '../domain/scanTypes';

export type Rotation = 0 | 90 | 180 | 270;
export interface RecognizedSchedule {
  text: string;
  angle: Rotation;
  parsed: ParseResult;
  previewUri: string;
}

const WORKING_EDGE = 2400;

function expectedSubjectCount(text: string): number | null {
  const match = text.match(
    /\b(\d{1,2})\s+subjects?\s*(?:\(s\))?\s*(?:only|total)?[.\s]*$/im,
  );
  return match ? Number(match[1]) : null;
}

function isReadableOrientation(document: OcrDocument, parsed: ParseResult) {
  if (!isGenuineCorDocument(document.text, parsed.subjects)) return false;
  // Missing cells need review or more image detail, not three unrelated rotations.
  if (readTable(document).length > 0) return true;
  return (
    parsed.subjects.length > 0 &&
    parsed.subjects.every(
      subject =>
        subject.title &&
        subject.days.length &&
        subject.startTime &&
        subject.endTime,
    )
  );
}

export function scoreRecognition(
  document: OcrDocument,
  parsed: ParseResult,
): number {
  if (!parsed.subjects.length) return 0;
  return (
    parsed.subjects.reduce(
      (score, subject) =>
        score +
        10 +
        (subject.title ? 15 : 0) +
        (subject.units ? 8 : 0) +
        (subject.startTime && subject.endTime ? 18 : 0) +
        (subject.days.length ? 8 : 0) +
        (subject.room ? 3 : 0) -
        subject.review.fields.length * 4,
      0,
    ) + (isGenuineCorDocument(document.text, parsed.subjects) ? 20 : 0)
  );
}

export async function rotateImageFile(
  sourceUri: string,
  angle: Rotation,
  origWidth: number,
  origHeight: number,
): Promise<string> {
  if (angle === 0) return sourceUri;
  const isSideways = angle === 90 || angle === 270;
  const targetWidth = isSideways ? origHeight : origWidth;
  const targetHeight = isSideways ? origWidth : origHeight;

  const result = await ImageResizer.createResizedImage(
    sourceUri,
    targetWidth,
    targetHeight,
    'JPEG',
    100,
    angle,
    undefined,
    false,
    {mode: 'contain', onlyScaleDown: false},
  );
  return result.uri;
}

export async function recognizeWithBestOrientation(
  originalUri: string,
  preferredAngle: Rotation,
  origWidth: number,
  origHeight: number,
): Promise<RecognizedSchedule> {
  if (
    !Number.isFinite(origWidth) ||
    !Number.isFinite(origHeight) ||
    origWidth <= 0 ||
    origHeight <= 0
  ) {
    throw new Error('Invalid image dimensions.');
  }
  const alternatives: Rotation[] =
    origWidth < origHeight ? [270, 90, 180, 0] : [180, 90, 270, 0];
  const angles: Rotation[] = [
    preferredAngle,
    ...alternatives.filter(angle => angle !== preferredAngle),
  ];
  let best: RecognizedSchedule | null = null;
  let bestScore = -Infinity;
  let readable = false;
  let previewCorrection: Rotation = 0;
  let previewWidth = origWidth;
  let previewHeight = origHeight;
  const recognize = async (
    uri: string,
    angle: Rotation,
    width: number,
    height: number,
  ) => {
    const native = await TextRecognition.recognize(uri);
    const oriented = orientOcrDocument(native, width, height);
    const result = oriented.document;
    const parsed = parseCorDocument(result);
    const score = scoreRecognition(result, parsed);
    if (score > bestScore) {
      bestScore = score;
      best = {
        text: result.text,
        parsed,
        angle: ((angle + oriented.correction) % 360) as Rotation,
        previewUri: uri,
      };
      previewCorrection = oriented.correction;
      previewWidth = width;
      previewHeight = height;
    }
    return isReadableOrientation(result, parsed);
  };
  for (const angle of angles) {
    try {
      const scale = Math.min(1, WORKING_EDGE / Math.max(origWidth, origHeight));
      const sideways = angle === 90 || angle === 270;
      const width = Math.round((sideways ? origHeight : origWidth) * scale);
      const height = Math.round((sideways ? origWidth : origHeight) * scale);
      const uri =
        angle === 0 && scale === 1
          ? originalUri
          : (
              await ImageResizer.createResizedImage(
                originalUri,
                width,
                height,
                'JPEG',
                95,
                angle,
                undefined,
                false,
                {mode: 'contain', onlyScaleDown: false},
              )
            ).uri;
      readable = await recognize(uri, angle, width, height);
      if (readable) break;
    } catch {
      // A failed orientation does not discard successful passes.
    }
  }
  const selected = best as RecognizedSchedule | null;
  if (!selected) throw new Error('Text recognition failed.');
  const expected = expectedSubjectCount(selected.text);
  const missingRows =
    expected !== null && selected.parsed.subjects.length < expected;
  const missingTitles = selected.parsed.subjects.filter(
    subject => !subject.title,
  ).length;
  const needsDetail =
    missingRows ||
    missingTitles > selected.parsed.subjects.length * 0.2 ||
    Math.min(origWidth, origHeight) < 1000;
  if (
    needsDetail &&
    (missingRows ||
      selected.parsed.subjects.some(subject => subject.review.fields.length))
  ) {
    const width =
      selected.angle === 90 || selected.angle === 270 ? origHeight : origWidth;
    const height =
      selected.angle === 90 || selected.angle === 270 ? origWidth : origHeight;
    // One detail retry at the readable orientation, retaining the original's detail.
    // Full-size camera photos are decoded once at a bounded working resolution first.
    const factor =
      Math.max(width, height) > WORKING_EDGE
        ? 1
        : Math.min(2, WORKING_EDGE / Math.max(width, height));
    if (
      readable &&
      (Math.max(width, height) > WORKING_EDGE ||
        (Math.min(width, height) < 1000 && factor > 1))
    ) {
      try {
        const enlarged = await ImageResizer.createResizedImage(
          originalUri,
          Math.round(width * factor),
          Math.round(height * factor),
          'JPEG',
          100,
          selected.angle,
          undefined,
          false,
          {mode: 'contain', onlyScaleDown: false},
        );
        await recognize(
          enlarged.uri,
          selected.angle,
          Math.round(width * factor),
          Math.round(height * factor),
        );
      } catch {
        // Keep the best original pass if the optional detail pass fails.
      }
    }
  }
  const result = (best ?? selected) as RecognizedSchedule;
  if (previewCorrection) {
    try {
      result.previewUri = await rotateImageFile(
        result.previewUri,
        previewCorrection,
        previewWidth,
        previewHeight,
      );
    } catch {
      // Autofill remains valid if only the optional upright preview fails.
    }
  }
  return result;
}

import TextRecognition from '@react-native-ml-kit/text-recognition';
import ImageResizer from 'react-native-image-resizer';

export type Rotation = 0 | 90 | 180 | 270;
const GOOD_SCORE_THRESHOLD = 15;

function scoreOcrQuality(text: string): number {
  const codeMatches = (text.match(/\b[A-Z]{2,4}\d{3}(?:\.\d)?\b/g) || [])
    .length;
  const timeMatches = (text.match(/\d{1,2}:\d{2}\s*[ap]m/gi) || []).length;
  const alphaCount = (text.match(/[a-zA-Z]/g) || []).length;
  const alphaRatio = alphaCount / Math.max(text.length, 1);
  return codeMatches * 10 + timeMatches * 5 + alphaRatio * 20;
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
): Promise<{text: string; angle: Rotation}> {
  const allAngles: Rotation[] = [0, 90, 180, 270];
  const orderedAngles = [
    preferredAngle,
    ...allAngles.filter(a => a !== preferredAngle),
  ];

  let best: {text: string; angle: Rotation} | null = null;
  let bestScore = -1;

  for (const angle of orderedAngles) {
    try {
      const uri = await rotateImageFile(
        originalUri,
        angle,
        origWidth,
        origHeight,
      );
      const result = await TextRecognition.recognize(uri);
      const score = scoreOcrQuality(result.text);

      if (score > bestScore) {
        bestScore = score;
        best = {text: result.text, angle};
      }
      if (angle === preferredAngle && score >= GOOD_SCORE_THRESHOLD) break;
    } catch {
      // Ignore
    }
  }

  return best ?? {text: '', angle: preferredAngle};
}

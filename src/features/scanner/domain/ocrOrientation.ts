import type {OcrDocument, OcrFrame, OcrPoint} from './scanTypes';

type QuarterTurn = 0 | 90 | 180 | 270;

/** ML Kit can read sideways text. Reframe its boxes without running OCR again. */
export function orientOcrDocument(
  document: OcrDocument,
  width: number,
  height: number,
): {
  document: OcrDocument;
  correction: QuarterTurn;
} {
  const votes = [0, 0, 0, 0];
  for (const line of document.blocks?.flatMap(block => block.lines) ?? []) {
    const points = line.cornerPoints;
    if (!points || points.length < 2 || line.text.trim().length < 3) continue;
    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < 3)
      continue;
    const quarter = (Math.round(Math.atan2(dy, dx) / (Math.PI / 2)) + 4) % 4;
    votes[quarter] += Math.min(line.text.length, 60);
  }
  const total = votes.reduce((sum, vote) => sum + vote, 0);
  const dominant = votes.indexOf(Math.max(...votes));
  if (!total || dominant === 0 || votes[dominant] / total < 0.75)
    return {document, correction: 0};
  const correction = (((4 - dominant) % 4) * 90) as QuarterTurn;
  const point = ({x, y}: OcrPoint): OcrPoint => {
    if (correction === 90) return {x: height - y, y: x};
    if (correction === 180) return {x: width - x, y: height - y};
    return {x: y, y: width - x};
  };
  const frame = (box?: OcrFrame): OcrFrame | undefined => {
    if (!box) return box;
    const corners = [
      point({x: box.left, y: box.top}),
      point({x: box.left + box.width, y: box.top + box.height}),
    ];
    return {
      left: Math.min(...corners.map(p => p.x)),
      top: Math.min(...corners.map(p => p.y)),
      width: Math.abs(corners[1].x - corners[0].x),
      height: Math.abs(corners[1].y - corners[0].y),
    };
  };
  return {
    correction,
    document: {
      ...document,
      blocks: document.blocks?.map(block => ({
        ...block,
        lines: block.lines.map(line => ({
          ...line,
          frame: frame(line.frame),
          cornerPoints: line.cornerPoints?.map(point),
          elements: line.elements?.map(element => ({
            ...element,
            frame: frame(element.frame),
            cornerPoints: element.cornerPoints?.map(point),
          })),
        })),
      })),
    },
  };
}

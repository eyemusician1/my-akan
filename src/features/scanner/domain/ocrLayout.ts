import type {OcrDocument, OcrFrame} from './scanTypes';

export type Column =
  | 'code'
  | 'section'
  | 'title'
  | 'units'
  | 'days'
  | 'time'
  | 'room'
  | 'instructor';
interface Cell {
  text: string;
  frame: OcrFrame;
}
export interface TableRecord {
  fields: Partial<Record<Column, string>>;
  raw: string;
}

export function identifyColumn(text: string): Column | null {
  const label = text
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (/^(?:subject|course)(?: code)? (?:section|sec)$/.test(label))
    return 'code';
  if (/^(?:subject|course)?\s*code$|^(?:subject|course)$/.test(label))
    return 'code';
  if (
    /^(?:(?:descriptive|subject|course) )?(?:title|description)$|^description title$/.test(
      label,
    )
  )
    return 'title';
  if (/^(?:sec|section|class code)$/.test(label)) return 'section';
  if (/^(?:units?|credits?|credit units?)$/.test(label)) return 'units';
  if (/^days?$/.test(label)) return 'days';
  if (/^(?:time|schedule|class schedule)$/.test(label)) return 'time';
  if (/^(?:room|venue|location)$/.test(label)) return 'room';
  if (/^(?:instructor|faculty|teacher|professor)$/.test(label))
    return 'instructor';
  return null;
}

/** Rebuild table rows from image coordinates instead of OCR's column/block order. */
export function readTable(document: OcrDocument): TableRecord[] {
  const cells: Cell[] = [];
  for (const block of document.blocks ?? []) {
    for (const line of block.lines) {
      const elements = line.elements?.filter(
        element => element.frame && element.text.trim(),
      );
      if (elements?.length)
        elements.forEach(element =>
          cells.push({text: element.text, frame: element.frame!}),
        );
      else if (line.frame && line.text.trim())
        cells.push({text: line.text, frame: line.frame});
    }
  }
  if (!cells.length) return [];
  const valid = cells.filter(
    cell =>
      cell.frame.height > 0 &&
      cell.frame.width > 0 &&
      Object.values(cell.frame).every(Number.isFinite),
  );
  valid.sort(
    (a, b) =>
      a.frame.top + a.frame.height / 2 - b.frame.top - b.frame.height / 2,
  );
  const rows: Array<{center: number; height: number; cells: Cell[]}> = [];
  for (const cell of valid) {
    const center = cell.frame.top + cell.frame.height / 2;
    const row = rows.find(
      candidate =>
        Math.abs(candidate.center - center) <=
        Math.min(candidate.height, cell.frame.height) * 0.55,
    );
    if (row) row.cells.push(cell);
    else rows.push({center, height: cell.frame.height, cells: [cell]});
  }
  const grouped = rows.map(row => {
    const sorted = row.cells.sort((a, b) => a.frame.left - b.frame.left);
    const groups: Cell[] = [];
    sorted.forEach(cell => {
      const last = groups[groups.length - 1];
      if (
        last &&
        cell.frame.left - last.frame.left - last.frame.width <
          Math.max(6, row.height * 0.55)
      ) {
        last.text += ` ${cell.text}`;
        last.frame.width = Math.max(
          last.frame.width,
          cell.frame.left + cell.frame.width - last.frame.left,
        );
      } else groups.push({text: cell.text, frame: {...cell.frame}});
    });
    return {top: row.center, cells: groups};
  });
  const headerIndex = grouped.findIndex(row => {
    const columns = row.cells.map(cell => identifyColumn(cell.text));
    return (
      columns.includes('code') &&
      columns.includes('title') &&
      columns.filter(Boolean).length >= 3
    );
  });
  if (headerIndex < 0) return [];
  const headers = grouped[headerIndex].cells
    .flatMap(cell => {
      const name = identifyColumn(cell.text);
      return name ? [{name, left: cell.frame.left}] : [];
    })
    .filter(
      (header, index, all) =>
        index === 0 || header.name !== all[index - 1].name,
    );
  const records: TableRecord[] = [];
  let previousRow: {center: number; height: number} | undefined;
  // Assign individual words before joining them. A line can cross the section/title boundary.
  for (const row of rows.filter(row => row.center > grouped[headerIndex].top)) {
    const fields: TableRecord['fields'] = {};
    for (const cell of [...row.cells].sort(
      (a, b) => a.frame.left - b.frame.left,
    )) {
      let index = 0;
      for (let i = 1; i < headers.length; i++) {
        if (cell.frame.left >= headers[i].left - row.height * 0.9) index = i;
      }
      const name = headers[index].name;
      fields[name] = [fields[name], cell.text].filter(Boolean).join(' ');
    }
    const raw = row.cells.map(cell => cell.text).join(' | ');
    const code = fields.code?.trim() ?? '';
    if (
      !/^[A-Z]{2,8}[\s-]*\d/i.test(code) &&
      /\b(?:total|assessment|remarks|printed|approved|receipt)\b|\bsubject\(s\)\s*only/i.test(
        raw,
      )
    )
      break;
    if (
      /^[A-Z]{2,8}[\s-]*\d{1,4}(?:\.\d{1,2})?[A-Z]?(?:\s+[^|]+)?$/i.test(code)
    ) {
      records.push({fields, raw});
      previousRow = row;
    } else if (
      records.length &&
      !code &&
      Object.keys(fields).length &&
      previousRow &&
      row.center - previousRow.center <= previousRow.height * 1.8
    ) {
      // Wrapped descriptions/schedules remain attached to the preceding course.
      const previous = records[records.length - 1];
      for (const key of Object.keys(fields) as Column[])
        previous.fields[key] = [previous.fields[key], fields[key]]
          .filter(Boolean)
          .join('\n');
      previous.raw += `\n${raw}`;
      previousRow = row;
    }
  }
  return records;
}

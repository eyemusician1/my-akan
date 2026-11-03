/** Android's expanded text supports HTML; keep user-entered titles literal. */
export function notificationLines(lines: string[]) {
  return lines
    .map(line =>
      line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;'),
    )
    .join('<br/>');
}

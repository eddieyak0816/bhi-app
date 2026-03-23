/** Escape a single CSV cell value (RFC 4180) */
function escapeCsvCell(val: string | number | null | undefined): string {
  const s = val == null ? '' : String(val)
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s
}

/** Build a CSV string from headers + rows */
export function buildCsvString(
  headers: string[],
  rows: Array<Array<string | number | null | undefined>>
): string {
  const lines = [headers.map(escapeCsvCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCsvCell).join(','))
  }
  return lines.join('\r\n')
}

/** Trigger a browser download for a CSV string */
export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Returns today as YYYY-MM-DD */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

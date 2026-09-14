export function escapeCsv(value: unknown): string {
  if (!value) return '';
  return `"${String(value).replaceAll('"', '""')}"`;
}

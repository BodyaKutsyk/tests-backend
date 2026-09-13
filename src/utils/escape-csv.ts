export type CsvValue = string | number | boolean | null | undefined;

export function escapeCsv(value: CsvValue): CsvValue {
  if (!value) return '';
  return `"${String(value).replaceAll('"', '""')}"`;
}

import * as XLSX from 'xlsx';

export interface ExcelSheet {
  name: string;
  rows: unknown[];
}

function flattenRow(input: unknown) {
  const flattened: Record<string, string | number | boolean> = {};

  const visit = (value: unknown, prefix: string) => {
    if (value === null || value === undefined) {
      flattened[prefix] = '';
    } else if (value instanceof Date) {
      flattened[prefix] = value.toISOString();
    } else if (Array.isArray(value)) {
      flattened[prefix] = value.map(item => String(item ?? '')).join(', ');
    } else if (typeof value === 'object') {
      Object.entries(value as Record<string, unknown>).forEach(([key, nested]) => {
        visit(nested, prefix ? `${prefix}.${key}` : key);
      });
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      flattened[prefix] = value;
    } else {
      flattened[prefix] = String(value);
    }
  };

  if (input && typeof input === 'object' && !Array.isArray(input)) {
    Object.entries(input as Record<string, unknown>).forEach(([key, value]) => visit(value, key));
  } else {
    visit(input, 'Value');
  }
  return flattened;
}

export function exportExcel(filename: string, sheets: ExcelSheet[]) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ name, rows }) => {
    const worksheet = rows.length
      ? XLSX.utils.json_to_sheet(rows.map(flattenRow))
      : XLSX.utils.aoa_to_sheet([['No records']]);
    XLSX.utils.book_append_sheet(workbook, worksheet, name.slice(0, 31));
  });

  XLSX.writeFile(workbook, `${filename.replace(/\.xlsx$/i, '')}.xlsx`, {
    bookType: 'xlsx',
    compression: true,
  });
}

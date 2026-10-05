'use client';

import { Button } from '@/components/ui/button';
import { exportExcel } from '@/lib/excel-export';
import { Download } from 'lucide-react';

export default function ExcelExportButton({
  filename,
  sheetName,
  rows,
  disabled = false,
}: {
  filename: string;
  sheetName: string;
  rows: Record<string, unknown>[];
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      onClick={() => exportExcel(filename, [{ name: sheetName, rows }])}
      disabled={disabled}
    >
      <Download className="h-4 w-4 mr-2" />Export Excel
    </Button>
  );
}

import type { AdminOrderExportRow } from '../types/order-export';
import { normalizeOrderCalendarDate } from '../types/order-export';

export interface ExportOrdersToExcelOptions {
  rows: AdminOrderExportRow[];
  dateFrom: string;
  dateTo: string;
}

const HEADERS = [
  'Order Number',
  'Website',
  'Order Type',
  'Product',
  'Buyer',
  'Buyer Name / Order ID',
  'Seller',
  'Supplier',
  'Status',
  'Order Date',
  'Created At',
  'Sale Price (USD)',
  'Supplier Cost (USD)',
  'Selling Fee (USD)',
  'Withdrawal Fee (USD)',
  'Net Revenue (USD)',
  'Profit (USD)',
  'Seller Notes',
] as const;

const HEADER_FILL = 'FF17365D';
const WHITE = 'FFFFFFFF';
const CURRENCY_FORMAT = '$#,##0.00';

const getStatusCount = (rows: AdminOrderExportRow[], status: string): number =>
  rows.filter((row) => row.status === status).length;

const sum = (values: Array<number | null>): number =>
  values.reduce<number>((total, value) => total + (value ?? 0), 0);

// Keep user-controlled strings as literal spreadsheet text. Numeric values are
// passed through separately so legitimate negative/positive numbers still work.
const safeSpreadsheetText = (value: string): string =>
  /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;

const getExportFileName = (
  rows: AdminOrderExportRow[],
  dateFrom: string,
  dateTo: string,
): string => {
  if (!dateFrom && !dateTo) {
    const today = normalizeOrderCalendarDate(new Date().toISOString());
    return `POROGOLD_Orders_${today}.xlsx`;
  }

  const exportedDates = rows.map((row) => row.orderDate).filter(Boolean).sort();
  const today = normalizeOrderCalendarDate(new Date().toISOString());
  const rangeStart = dateFrom || exportedDates[0] || dateTo || today;
  const rangeEnd = dateTo || exportedDates.at(-1) || dateFrom || today;
  return `POROGOLD_Orders_${rangeStart}_to_${rangeEnd}.xlsx`;
};

export const exportOrdersToExcel = async ({
  rows,
  dateFrom,
  dateTo,
}: ExportOrdersToExcelOptions): Promise<void> => {
  if (rows.length === 0) throw new Error('At least one order is required for export.');

  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'POROGOLD';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Orders', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  worksheet.columns = HEADERS.map((header) => ({ header, width: 16 }));
  rows.forEach((row) => {
    worksheet.addRow([
      safeSpreadsheetText(row.orderNumber),
      safeSpreadsheetText(row.website),
      safeSpreadsheetText(row.orderType),
      safeSpreadsheetText(row.product),
      safeSpreadsheetText(row.buyer),
      safeSpreadsheetText(row.buyerReference),
      safeSpreadsheetText(row.seller),
      safeSpreadsheetText(row.supplier),
      safeSpreadsheetText(row.status),
      safeSpreadsheetText(row.orderDate),
      safeSpreadsheetText(row.createdAt),
      row.salePrice,
      row.supplierCost,
      row.sellingFee,
      row.withdrawalFee,
      row.netRevenue,
      row.profit,
      safeSpreadsheetText(row.notes),
    ]);
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: WHITE } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;

  const dataEndRow = rows.length + 1;
  worksheet.autoFilter = { from: 'A1', to: `R${dataEndRow}` };

  for (let rowNumber = 2; rowNumber <= dataEndRow; rowNumber += 1) {
    for (let columnNumber = 12; columnNumber <= 17; columnNumber += 1) {
      worksheet.getCell(rowNumber, columnNumber).numFmt = CURRENCY_FORMAT;
    }
    worksheet.getCell(rowNumber, 18).alignment = { wrapText: true, vertical: 'top' };
  }

  worksheet.addRow([]);
  const summaryStartRow = dataEndRow + 2;
  const summaryRows: Array<[string, number]> = [
    ['Total Orders', rows.length],
    ['Submitted', getStatusCount(rows, 'Submitted')],
    ['In Progress', getStatusCount(rows, 'In Progress')],
    ['Completed', getStatusCount(rows, 'Completed')],
    ['Refunded', getStatusCount(rows, 'Refunded')],
    ['Cancelled', getStatusCount(rows, 'Cancelled')],
    ['Total Sale Price', sum(rows.map((row) => row.salePrice))],
    ['Total Profit', sum(rows.map((row) => row.profit))],
  ];

  summaryRows.forEach(([label, value], index) => {
    const excelRow = worksheet.addRow([label, value]);
    excelRow.getCell(1).font = { bold: true, color: { argb: HEADER_FILL } };
    if (index >= 6) excelRow.getCell(2).numFmt = CURRENCY_FORMAT;
  });

  worksheet.columns.forEach((column, index) => {
    let width = HEADERS[index]?.length ?? 10;
    column.eachCell?.({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber >= summaryStartRow && index > 1) return;
      const valueLength = String(cell.value ?? '').length;
      width = Math.max(width, valueLength);
    });
    column.width = Math.min(Math.max(width + 2, 12), index === 17 ? 48 : 32);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = getExportFileName(rows, dateFrom, dateTo);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
};

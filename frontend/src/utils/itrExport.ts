import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PaymentRecord } from '../types';

export const exportPaymentsToPDF = (
  records: PaymentRecord[],
  monthLabel: string,
  userFullName?: string
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Calculate totals
  const totalIncome = records
    .filter((r) => r.type === 'INCOME')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpense = records
    .filter((r) => r.type === 'EXPENSE')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const netBalance = totalIncome - totalExpense;

  // Title & Header Branding
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text('LOOSERS VAULT — INCOME TAX RETURN (ITR) LEDGER', 14, 16);

  doc.setFontSize(11);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(`Period / Month: ${monthLabel}`, 14, 23);
  doc.text(`Generated On: ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`, 14, 29);
  if (userFullName) {
    doc.text(`Account Holder: ${userFullName}`, 180, 23);
  }

  // Summary Box
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setFillColor(248, 250, 252); // slate-50
  doc.roundedRect(14, 34, 268, 16, 2, 2, 'FD');

  doc.setFontSize(10);
  doc.setTextColor(22, 101, 52); // green-800
  doc.text(`Total Income: ${totalIncome.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`, 20, 44);

  doc.setTextColor(153, 27, 27); // red-800
  doc.text(`Total Expense: ${totalExpense.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`, 105, 44);

  doc.setTextColor(30, 58, 138); // blue-900
  doc.text(`Net Balance: ${netBalance.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}`, 190, 44);

  // Table rows
  const tableData = records.map((r, index) => [
    index + 1,
    r.date,
    r.type,
    r.forWhat,
    r.category || 'General',
    `${r.currency || 'INR'} ${Number(r.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    r.paymentMethod || 'N/A',
    r.invoiceAttachment?.name ? 'Attached' : 'None',
    r.specialNotes || '-',
  ]);

  autoTable(doc, {
    startY: 54,
    head: [['#', 'Date', 'Type', 'Purpose (For What)', 'Category', 'Amount', 'Payment Mode', 'Invoice', 'Special Tax/ITR Notes']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [37, 99, 235], // blue-600
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 24 },
      2: { cellWidth: 20 },
      3: { cellWidth: 50 },
      4: { cellWidth: 28 },
      5: { cellWidth: 32, halign: 'right' },
      6: { cellWidth: 28 },
      7: { cellWidth: 20, halign: 'center' },
      8: { cellWidth: 'auto' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        if (data.cell.raw === 'INCOME') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'EXPENSE') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    },
  });

  // Save PDF
  const safeFilename = `ITR_Ledger_${monthLabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(safeFilename);
};

export const exportPaymentsToExcel = (
  records: PaymentRecord[],
  monthLabel: string
) => {
  const totalIncome = records
    .filter((r) => r.type === 'INCOME')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpense = records
    .filter((r) => r.type === 'EXPENSE')
    .reduce((sum, r) => sum + Number(r.amount), 0);
  const netBalance = totalIncome - totalExpense;

  const rows: Record<string, any>[] = records.map((r, i) => ({
    'Sl No': i + 1,
    'Date': r.date,
    'Type': r.type,
    'Purpose / For What': r.forWhat,
    'Category': r.category || 'General',
    'Currency': r.currency || 'INR',
    'Amount': Number(r.amount),
    'Payment Method': r.paymentMethod || 'N/A',
    'Invoice Number': r.invoiceNumber || 'N/A',
    'Invoice Attached': r.invoiceAttachment?.name || 'No',
    'Special Notes / ITR Remarks': r.specialNotes || '',
    'Recorded At': new Date(r.createdAt).toLocaleString(),
  }));

  // Add Summary Rows at bottom
  rows.push({} as any);
  rows.push({
    'Sl No': '' as any,
    'Date': '' as any,
    'Type': 'TOTAL INCOME',
    'Purpose / For What': '',
    'Category': '',
    'Currency': 'INR',
    'Amount': totalIncome,
    'Payment Method': '',
    'Invoice Number': '',
    'Invoice Attached': '',
    'Special Notes / ITR Remarks': 'Summary Total Income',
    'Recorded At': '',
  });
  rows.push({
    'Sl No': '' as any,
    'Date': '' as any,
    'Type': 'TOTAL EXPENSE',
    'Purpose / For What': '',
    'Category': '',
    'Currency': 'INR',
    'Amount': totalExpense,
    'Payment Method': '',
    'Invoice Number': '',
    'Invoice Attached': '',
    'Special Notes / ITR Remarks': 'Summary Total Expense',
    'Recorded At': '',
  });
  rows.push({
    'Sl No': '' as any,
    'Date': '' as any,
    'Type': 'NET BALANCE',
    'Purpose / For What': '',
    'Category': '',
    'Currency': 'INR',
    'Amount': netBalance,
    'Payment Method': '',
    'Invoice Number': '',
    'Invoice Attached': '',
    'Special Notes / ITR Remarks': 'Net Margin / Taxable Ledger',
    'Recorded At': '',
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, monthLabel.slice(0, 31));

  // Auto-column sizing
  const columnWidths = [
    { wch: 8 },  // Sl No
    { wch: 14 }, // Date
    { wch: 16 }, // Type
    { wch: 35 }, // Purpose
    { wch: 20 }, // Category
    { wch: 10 }, // Currency
    { wch: 15 }, // Amount
    { wch: 18 }, // Payment Method
    { wch: 18 }, // Invoice Number
    { wch: 22 }, // Invoice Attached
    { wch: 35 }, // Special Notes
    { wch: 22 }, // Recorded At
  ];
  worksheet['!cols'] = columnWidths;

  const safeFilename = `ITR_Ledger_${monthLabel.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(workbook, safeFilename);
};

export const exportPaymentsToCSV = (
  records: PaymentRecord[],
  monthLabel: string
) => {
  const headers = [
    'Sl No',
    'Date',
    'Type',
    'Purpose',
    'Category',
    'Currency',
    'Amount',
    'Payment Method',
    'Invoice File',
    'Special Notes / ITR Remarks',
  ];

  const csvRows = [
    headers.join(','),
    ...records.map((r, i) =>
      [
        i + 1,
        `"${r.date}"`,
        `"${r.type}"`,
        `"${(r.forWhat || '').replace(/"/g, '""')}"`,
        `"${(r.category || '').replace(/"/g, '""')}"`,
        `"${r.currency || 'INR'}"`,
        r.amount,
        `"${(r.paymentMethod || '').replace(/"/g, '""')}"`,
        `"${(r.invoiceAttachment?.name || '').replace(/"/g, '""')}"`,
        `"${(r.specialNotes || '').replace(/"/g, '""')}"`,
      ].join(',')
    ),
  ];

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `ITR_Ledger_${monthLabel.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

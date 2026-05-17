/* eslint-disable @typescript-eslint/no-explicit-any */
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function exportToCsv(filename: string, data: any[], columns: { header: string; key: string }[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");

  worksheet.columns = columns;
  worksheet.addRows(data);

  const buffer = await workbook.csv.writeBuffer();
  downloadBuffer(buffer, `${filename}.csv`, "text/csv;charset=utf-8;");
}

export async function exportToXlsx(filename: string, data: any[], columns: { header: string; key: string; width?: number }[]) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Data");

  worksheet.columns = columns.map(c => ({ ...c, width: c.width || 15 }));
  worksheet.addRows(data);

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF10B981" }, // Tailwind emerald-500
  };
  headerRow.eachCell((cell) => {
    cell.font = { color: { argb: "FFFFFFFF" }, bold: true };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, `${filename}.xlsx`, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function exportToPdf(filename: string, title: string, data: any[], columns: { header: string; key: string }[]) {
  const doc = new jsPDF();

  // Add title
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 22);

  const tableData = data.map((row) => columns.map((col) => row[col.key] || ""));
  const tableHeaders = [columns.map((col) => col.header)];

  autoTable(doc, {
    startY: 28,
    head: tableHeaders,
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [15, 118, 110] }, // Tailwind teal-700
    styles: { fontSize: 8 },
  });

  doc.save(`${filename}.pdf`);
}

function downloadBuffer(buffer: any, filename: string, type: string) {
  const blob = new Blob([buffer], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
}

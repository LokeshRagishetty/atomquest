"use client";

import { Download, FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { RequestError } from "@/components/shared/request-error";

export function ExportButtons() {
  const [loading, setLoading] = useState(false);
  const [quarter, setQuarter] = useState<string>("q1");
  const [department, setDepartment] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [lastExportType, setLastExportType] = useState<"csv" | "xlsx" | "pdf">("csv");

  async function fetchReportData() {
    const params = new URLSearchParams({ format: "json", quarter });
    if (department) params.set("department", department);
    const res = await fetch(`/api/reports?${params.toString()}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || "Export failed");
    return data.rows;
  }

  const columns = [
    { header: "Employee", key: "employee", width: 25 },
    { header: "Department", key: "department", width: 20 },
    { header: "Thrust Area", key: "thrustArea", width: 20 },
    { header: "Goal Title", key: "title", width: 35 },
    { header: "Target", key: "target", width: 20 },
    { header: "Weightage (%)", key: "weightage", width: 15 },
    { header: "Achievement", key: "achievement", width: 20 },
    { header: "Completion (%)", key: "completionPercentage", width: 15 },
    { header: "Status", key: "status", width: 15 },
  ];

  async function handleExport(type: "csv" | "xlsx" | "pdf") {
    setLoading(true);
    setError(null);
    setLastExportType(type);
    try {
      const data = await fetchReportData();
      const { exportToCsv, exportToXlsx, exportToPdf } = await import("@/lib/exports");
      const filename = `atomquest-report-${quarter}${department ? `-${department}` : ""}`;
      
      if (type === "csv") await exportToCsv(filename, data, columns);
      if (type === "xlsx") await exportToXlsx(filename, data, columns);
      if (type === "pdf") exportToPdf(filename, "Achievement Report Preview", data, columns);
      
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Report quarter"
        value={quarter}
        onChange={(e) => setQuarter(e.target.value)}
        className="rounded-md border bg-background p-2 text-sm"
      >
        <option value="q1">Q1</option>
        <option value="q2">Q2</option>
        <option value="q3">Q3</option>
        <option value="q4">Q4</option>
      </select>
      <input
        aria-label="Department filter"
        value={department}
        onChange={(e) => setDepartment(e.target.value)}
        placeholder="Department (optional)"
        className="min-w-0 rounded-md border bg-background px-3 py-2 text-sm"
      />
      
      <div className="flex items-center gap-2 ml-2">
        <Button variant="outline" type="button" onClick={() => handleExport("csv")} disabled={loading}>
          <Download className="mr-2 h-4 w-4" aria-hidden="true" />
          CSV
        </Button>
        <Button variant="outline" type="button" onClick={() => handleExport("xlsx")} disabled={loading}>
          <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />
          Excel
        </Button>
        <Button variant="outline" type="button" onClick={() => handleExport("pdf")} disabled={loading}>
          <FileText className="mr-2 h-4 w-4" aria-hidden="true" />
          PDF
        </Button>
      </div>
      
      {error ? <RequestError message={error} onRetry={() => void handleExport(lastExportType)} /> : null}
    </div>
  );
}

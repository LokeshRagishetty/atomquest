"use client";

import { useState } from "react";

export function DashboardFilters({ onChange }: { onChange?: (filters: { quarter?: string; department?: string; status?: string }) => void }) {
  const [quarter, setQuarter] = useState("q1");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Dashboard quarter"
        className="rounded-md border bg-background p-2"
        value={quarter}
        onChange={(e) => { setQuarter(e.target.value); onChange?.({ quarter: e.target.value, department, status }); }}
      >
        <option value="q1">Q1</option>
        <option value="q2">Q2</option>
        <option value="q3">Q3</option>
        <option value="q4">Q4</option>
      </select>
      <input
        aria-label="Dashboard department"
        placeholder="Department"
        className="rounded-md border bg-background px-2 py-1"
        value={department}
        onChange={(e) => { setDepartment(e.target.value); onChange?.({ quarter, department: e.target.value, status }); }}
      />
      <select
        aria-label="Dashboard status"
        className="rounded-md border bg-background p-2"
        value={status}
        onChange={(e) => { setStatus(e.target.value); onChange?.({ quarter, department, status: e.target.value }); }}
      >
        <option value="">All</option>
        <option value="submitted">Submitted</option>
        <option value="approved">Approved</option>
        <option value="delayed">Delayed</option>
      </select>
    </div>
  );
}

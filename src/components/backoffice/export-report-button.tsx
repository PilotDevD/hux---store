"use client";

import { Download } from "lucide-react";

export type ReportSection = { title: string; headers: string[]; rows: (string | number)[][] };

const esc = (v: string | number) =>
  String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Exports report sections as an Excel-compatible .xls file (HTML tables that
 * Excel opens natively — no external library needed).
 */
export function ExportReportButton({ title, filename, sections }: { title: string; filename: string; sections: ReportSection[] }) {
  function exportXls() {
    const tables = sections.map((s) => {
      const head = `<tr>${s.headers.map((h) => `<th style="background:#14161A;color:#fff;text-align:left;padding:6px;border:1px solid #ccc">${esc(h)}</th>`).join("")}</tr>`;
      const body = s.rows.map((r) => `<tr>${r.map((c) => `<td style="padding:6px;border:1px solid #ddd">${esc(c)}</td>`).join("")}</tr>`).join("");
      return `<h3 style="font-family:Arial">${esc(s.title)}</h3><table style="border-collapse:collapse;font-family:Arial;font-size:12px;margin-bottom:18px">${head}${body}</table>`;
    }).join("");

    const html =
      `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">` +
      `<head><meta charset="utf-8"></head><body>` +
      `<h2 style="font-family:Arial">${esc(title)}</h2>${tables}</body></html>`;

    const blob = new Blob(["﻿" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button onClick={exportXls} className="btn btn-primary">
      <Download size={16} /> Exportar Excel
    </button>
  );
}

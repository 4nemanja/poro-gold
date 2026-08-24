"use client";

import { Printer } from "lucide-react";

// Print / Save as PDF. The page carries print styles (globals.css) that drop the
// sidebar, topbar and controls, so the browser's own "Save as PDF" produces a
// clean handout — no server-side PDF pipeline needed.
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors print:hidden"
      title="Print or save this week as a PDF"
    >
      <Printer size={15} />
      Save as PDF
    </button>
  );
}

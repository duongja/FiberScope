"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function CopyableCode({
  code,
  label = "Copy",
}: {
  code: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="copy-code">
      <button
        aria-label={copied ? "Copied" : label}
        className="copy-code-button"
        onClick={copyCode}
        type="button"
      >
        {copied ? (
          <>
            <Check size={14} aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Copy size={14} aria-hidden="true" />
            {label}
          </>
        )}
      </button>
      <pre>{code}</pre>
    </div>
  );
}

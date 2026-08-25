"use client";

import { useEffect, useId, useState } from "react";
import { formatThousands, parseMoney } from "@/lib/format";

export interface MoneyInputProps {
  label?: string;
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  note?: string;
  /** Show a gold "Auto-filled from your LES" badge next to the label. */
  lesBadge?: boolean;
  error?: string;
  min?: number;
  id?: string;
}

/** Gold pill used for LES auto-fill provenance. */
export function LesBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-gold/20 px-2 py-0.5 text-xs font-semibold text-[#8a6d10]">
      Auto-filled from your LES
    </span>
  );
}

/**
 * $-formatted number input: thousands separators on blur, raw number while
 * focused for easy editing.
 */
export default function MoneyInput({
  label,
  value,
  onChange,
  placeholder,
  note,
  lesBadge = false,
  error,
  min = 0,
  id,
}: MoneyInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState(value ? formatThousands(value) : "");

  // Sync external value changes (e.g. LES auto-fill) while not editing.
  useEffect(() => {
    if (!focused) setText(value ? formatThousands(value) : "");
  }, [value, focused]);

  return (
    <div>
      {label && (
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="label mb-0">
            {label}
          </label>
          {lesBadge && <LesBadge />}
        </div>
      )}
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
        >
          $
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          className={`input pl-8 ${error ? "border-mulberry" : ""}`}
          placeholder={placeholder ?? "0"}
          value={text}
          onFocus={() => {
            setFocused(true);
            setText(value ? String(value) : "");
          }}
          onBlur={() => {
            setFocused(false);
            const n = Math.max(min, parseMoney(text));
            onChange(n);
            setText(n ? formatThousands(n) : "");
          }}
          onChange={(e) => {
            setText(e.target.value);
            const n = parseMoney(e.target.value);
            if (Number.isFinite(n)) onChange(Math.max(min, n));
          }}
        />
      </div>
      {note && <p className="mt-1 text-sm text-gray-600">{note}</p>}
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

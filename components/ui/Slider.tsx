"use client";

import { useId } from "react";

export interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  /** Format the value chip, e.g. (v) => `${v}%`. Defaults to String. */
  format?: (value: number) => string;
  minLabel?: string;
  maxLabel?: string;
  /** Optional tick markers rendered under the track. */
  ticks?: { value: number; label: string }[];
  /** Optional gold marker on the track (e.g. the user's MRA). */
  marker?: { value: number; label: string };
  disabled?: boolean;
  note?: string;
}

/**
 * Branded range slider: navy track, mulberry thumb (via accent-color +
 * .ub-range styles in globals.css), mulberry value chip, ≥44px hit area.
 */
export default function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  format = String,
  minLabel,
  maxLabel,
  ticks,
  marker,
  disabled = false,
  note,
}: SliderProps) {
  const id = useId();
  const posPct = (v: number) => ((v - min) / (max - min)) * 100;

  return (
    <div className={disabled ? "opacity-50" : ""}>
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <label htmlFor={id} className="label mb-0">
          {label}
        </label>
        <span className="inline-flex min-w-[3.5rem] items-center justify-center rounded-full bg-mulberry px-3 py-1 text-sm font-bold text-white">
          {format(value)}
        </span>
      </div>
      <div className="relative">
        {marker && marker.value >= min && marker.value <= max && (
          <span
            aria-hidden="true"
            title={marker.label}
            className="pointer-events-none absolute -top-1 z-10 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white bg-gold shadow"
            style={{ left: `${posPct(marker.value)}%` }}
          />
        )}
        <input
          id={id}
          type="range"
          className="ub-range h-11 w-full cursor-pointer"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-valuetext={format(value)}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-500">
        <span>{minLabel ?? format(min)}</span>
        {ticks && (
          <span className="flex-1">
            <span className="relative block h-4">
              {ticks.map((t) => (
                <span
                  key={t.value}
                  className="absolute -translate-x-1/2 whitespace-nowrap"
                  style={{ left: `${posPct(t.value)}%` }}
                >
                  {t.label}
                </span>
              ))}
            </span>
          </span>
        )}
        <span>{maxLabel ?? format(max)}</span>
      </div>
      {note && <p className="mt-1 text-sm text-gray-600">{note}</p>}
    </div>
  );
}

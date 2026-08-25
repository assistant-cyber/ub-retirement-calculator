"use client";

import { useState, type ReactNode } from "react";

export interface AccordionProps {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: ReactNode;
  /** Fired the first time the section is opened (e.g. lazy AI fetch). */
  onFirstOpen?: () => void;
}

/**
 * Collapsible report section: navy header bar with Playfair title + chevron,
 * smooth height animation (CSS grid rows trick). Content stays mounted so
 * print styles can force every section open.
 */
export default function Accordion({
  title,
  subtitle,
  defaultOpen = false,
  children,
  onFirstOpen,
}: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [everOpened, setEverOpened] = useState(defaultOpen);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !everOpened) {
      setEverOpened(true);
      onFirstOpen?.();
    }
  };

  return (
    <section className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="acc-header flex min-h-[52px] w-full items-center justify-between gap-4 bg-navy px-5 py-3.5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-gold"
      >
        <span>
          <span className="block font-heading text-lg font-semibold text-white">{title}</span>
          {subtitle && <span className="block text-sm text-white/70">{subtitle}</span>}
        </span>
        <svg
          aria-hidden="true"
          className={`h-5 w-5 shrink-0 text-gold transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>
      <div
        className={`acc-body grid transition-[grid-template-rows] duration-300 ease-in-out ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-5 py-5 sm:px-6">{children}</div>
        </div>
      </div>
    </section>
  );
}

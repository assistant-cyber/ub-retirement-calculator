"use client";

import { useRef, useState } from "react";
import type {
  FEGLIEnrollment,
  LESParseResult,
  RetirementSystem,
  TSPTaxType,
} from "@/types/federal";
import { fegliAnnualCost } from "@/lib/fegli-rates";
import { ageFromISO, usdCents } from "@/lib/format";
import MoneyInput, { LesBadge } from "@/components/ui/MoneyInput";
import Slider from "@/components/ui/Slider";
import Callout from "@/components/ui/Callout";
import type { WizardState } from "@/components/wizard-state";

interface Props {
  state: WizardState;
  setState: (updater: (prev: WizardState) => WizardState) => void;
  onNext: () => void;
  onBack: () => void;
}

const FUNDS = ["G", "F", "C", "S", "I", "L"];
const MAX_LES_BYTES = 10 * 1024 * 1024;

const FEGLI_OPTIONS: { value: FEGLIEnrollment; label: string }[] = [
  { value: "none", label: "None" },
  { value: "basic", label: "Basic Only" },
  { value: "basic-a", label: "Basic + Option A" },
  { value: "basic-b", label: "Basic + Option B" },
  { value: "basic-c", label: "Basic + Option C" },
];

export default function Step2Benefits({ state, setState, onNext, onBack }: Props) {
  const { tsp, fegli, federal } = state;
  const setTsp = (patch: Partial<WizardState["tsp"]>) =>
    setState((prev) => ({ ...prev, tsp: { ...prev.tsp, ...patch } }));
  const setFegli = (patch: Partial<WizardState["fegli"]>) =>
    setState((prev) => ({ ...prev, fegli: { ...prev.fegli, ...patch } }));

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lesLoading, setLesLoading] = useState(false);
  const [lesError, setLesError] = useState<string | null>(null);
  const [lesDone, setLesDone] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const age = ageFromISO(federal.dob) ?? 45;
  const fegliPremium = fegliAnnualCost(fegli, age, federal.salary);

  const toggleFund = (fund: string) => {
    const has = tsp.allocation.includes(fund);
    setTsp({
      allocation: has ? tsp.allocation.filter((f) => f !== fund) : [...tsp.allocation, fund],
    });
  };

  const handleLesFile = async (file: File) => {
    setLesError(null);
    setLesDone(false);
    const okTypes = ["application/pdf", "image/png", "image/jpeg"];
    if (!okTypes.includes(file.type)) {
      setLesError("Please upload a PDF, PNG, or JPG file.");
      return;
    }
    if (file.size > MAX_LES_BYTES) {
      setLesError("That file is over the 10MB limit. Try a smaller scan or photo.");
      return;
    }
    setLesLoading(true);
    try {
      const buf = await file.arrayBuffer();
      // Chunked base64 to avoid call-stack limits on large files.
      const bytes = new Uint8Array(buf);
      let binary = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      const fileBase64 = btoa(binary);

      const res = await fetch("/api/ai/parse-les", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileBase64, mediaType: file.type }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "The LES could not be read.");
      }
      const parsed = (await res.json()) as LESParseResult;

      setState((prev) => {
        const next = { ...prev, lesAutofill: { ...prev.lesAutofill } };
        // Salary: gross per period × 26 if biweekly (default assumption).
        if (parsed.grossPay && parsed.grossPay > 0) {
          const biweekly = !parsed.payPeriod || /bi-?week/i.test(parsed.payPeriod);
          const annual = Math.round(parsed.grossPay * (biweekly ? 26 : 12));
          next.federal = { ...prev.federal, salary: annual };
          next.lesAutofill.salary = true;
        }
        // TSP contribution
        if (parsed.tspContribution && parsed.tspContribution > 0) {
          if (parsed.tspContributionType === "percent") {
            next.tsp = {
              ...prev.tsp,
              contributionMode: "percent",
              contributionValue: parsed.tspContribution,
              fullMatch: parsed.tspContribution >= 5,
            };
          } else {
            // dollar per pay period → annual
            next.tsp = {
              ...prev.tsp,
              contributionMode: "dollar",
              contributionValue: Math.round(parsed.tspContribution * 26),
            };
          }
          next.lesAutofill.tsp = true;
        }
        // FEGLI deduction presence → mark enrolled (at least Basic)
        if (parsed.fegliDeduction && parsed.fegliDeduction > 0) {
          if (prev.fegli.enrollment === "none") {
            next.fegli = { ...prev.fegli, enrollment: "basic" };
          }
          next.lesAutofill.fegli = true;
          next.lesAutofill.fegliDeductionPerPeriod = parsed.fegliDeduction;
        }
        return next;
      });
      setLesDone(true);
    } catch (e) {
      setLesError(
        e instanceof Error && e.message
          ? e.message
          : "We couldn't read your LES right now. You can still enter everything manually."
      );
    } finally {
      setLesLoading(false);
    }
  };

  return (
    <div className="card space-y-8">
      <div>
        <h2 className="text-2xl font-bold">Your federal benefits</h2>
        <p className="mt-1 text-gray-600">
          Tell us about your TSP, FEGLI, and health coverage — or upload your LES and we&apos;ll
          fill in what we can.
        </p>
      </div>

      {/* LES upload */}
      <div>
        <span className="label">
          Upload your most recent Leave &amp; Earnings Statement (optional but improves accuracy)
        </span>
        <div
          className={`flex min-h-[110px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition-colors ${
            dragOver ? "border-navy bg-navy/5" : "border-gray-300 bg-ivory hover:border-navy"
          }`}
          role="button"
          tabIndex={0}
          aria-label="Upload your Leave and Earnings Statement"
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void handleLesFile(file);
          }}
        >
          {lesLoading ? (
            <>
              <span
                className="h-6 w-6 animate-spin rounded-full border-2 border-navy border-t-transparent"
                aria-hidden="true"
              />
              <p className="text-sm font-semibold text-navy" role="status">
                Reading your LES…
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold text-navy">Drag &amp; drop your LES here, or click to browse</p>
              <p className="text-sm text-gray-500">PDF, PNG, or JPG — up to 10MB</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleLesFile(file);
              e.target.value = "";
            }}
          />
        </div>
        {lesDone && !lesError && (
          <p className="mt-2">
            <LesBadge />{" "}
            <span className="text-sm text-gray-600">
              We pre-filled what we could — please double-check the values below.
            </span>
          </p>
        )}
        {lesError && (
          <div className="mt-2">
            <Callout variant="warning" title="We couldn't read that file">
              {lesError} You can still enter everything manually below.
            </Callout>
          </div>
        )}
      </div>

      {/* Retirement system */}
      <div>
        <label htmlFor="system" className="label">
          Are you under FERS, CSRS, or FERS-RAE?
        </label>
        <select
          id="system"
          className="input"
          value={federal.system}
          onChange={(e) => {
            const system = e.target.value as RetirementSystem;
            setState((prev) => ({
              ...prev,
              federal: { ...prev.federal, system },
              goals: {
                ...prev.goals,
                ssPlan: system === "CSRS" ? "csrs" : prev.goals.ssPlan === "csrs" ? "yes" : prev.goals.ssPlan,
              },
            }));
          }}
        >
          <option value="FERS">FERS</option>
          <option value="CSRS">CSRS</option>
          <option value="FERS-RAE">FERS-RAE</option>
        </select>
        {federal.system === "CSRS" && (
          <p className="mt-1 text-sm text-gray-600">
            Note: CSRS employees do not receive Social Security or the FERS supplement.
          </p>
        )}
      </div>

      {/* TSP */}
      <fieldset className="space-y-5">
        <legend className="font-heading text-lg font-semibold text-navy">
          Thrift Savings Plan (TSP)
        </legend>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label mb-0">Current TSP balance</span>
            {state.lesAutofill.tsp && <LesBadge />}
          </div>
          <MoneyInput value={tsp.balance} onChange={(v) => setTsp({ balance: v })} placeholder="120,000" />
          <Slider
            label="Adjust balance"
            value={Math.min(1_000_000, Math.round(tsp.balance))}
            min={0}
            max={1_000_000}
            step={5_000}
            format={(v) => `$${(v / 1000).toFixed(0)}k`}
            onChange={(v) => setTsp({ balance: v })}
          />
        </div>

        <div>
          <span className="label">TSP contribution</span>
          <div className="mb-3 flex gap-2" role="group" aria-label="Contribution type">
            <button
              type="button"
              className={`pill flex-1 ${tsp.contributionMode === "percent" ? "pill-active" : ""}`}
              aria-pressed={tsp.contributionMode === "percent"}
              onClick={() => setTsp({ contributionMode: "percent", contributionValue: 5 })}
            >
              % of salary
            </button>
            <button
              type="button"
              className={`pill flex-1 ${tsp.contributionMode === "dollar" ? "pill-active" : ""}`}
              aria-pressed={tsp.contributionMode === "dollar"}
              onClick={() => setTsp({ contributionMode: "dollar", contributionValue: 0 })}
            >
              Flat dollar amount
            </button>
          </div>
          {tsp.contributionMode === "percent" ? (
            <Slider
              label="Contribution (% of salary)"
              value={tsp.contributionValue}
              min={0}
              max={15}
              step={1}
              format={(v) => `${v}%`}
              onChange={(v) => setTsp({ contributionValue: v, fullMatch: v >= 5 })}
            />
          ) : (
            <MoneyInput
              label="Annual TSP contribution"
              value={tsp.contributionValue}
              onChange={(v) => setTsp({ contributionValue: v })}
              placeholder="4,000"
              lesBadge={state.lesAutofill.tsp}
            />
          )}
        </div>

        <div>
          <label htmlFor="tsp-tax" className="label">
            Is your TSP Roth, Traditional, or Split?
          </label>
          <select
            id="tsp-tax"
            className="input"
            value={tsp.taxType}
            onChange={(e) => setTsp({ taxType: e.target.value as TSPTaxType })}
          >
            <option value="traditional">Traditional</option>
            <option value="roth">Roth</option>
            <option value="split">Split (both)</option>
          </select>
        </div>

        <div>
          <span className="label">
            Are you contributing at least 5% to get the full agency match?
          </span>
          <div className="flex gap-2" role="group" aria-label="Full agency match">
            {([true, false] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                className={`pill flex-1 ${tsp.fullMatch === v ? "pill-active" : ""}`}
                aria-pressed={tsp.fullMatch === v}
                onClick={() => setTsp({ fullMatch: v })}
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
          {!tsp.fullMatch && (
            <div className="mt-3">
              <Callout variant="warning" title="You may be leaving free money on the table.">
                Agency matches up to 5% automatically (1% automatic + 4% matching). Not matching =
                we&apos;ll add the missing match to your gap analysis.
              </Callout>
            </div>
          )}
        </div>

        <div>
          <span className="label">TSP investment allocation (optional)</span>
          <div className="flex flex-wrap gap-2">
            {FUNDS.map((fund) => {
              const checked = tsp.allocation.includes(fund);
              return (
                <label
                  key={fund}
                  className={`pill cursor-pointer ${checked ? "pill-active" : ""}`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={checked}
                    onChange={() => toggleFund(fund)}
                  />
                  {fund === "L" ? "Lifecycle (L)" : `${fund} Fund`}
                </label>
              );
            })}
          </div>
        </div>
      </fieldset>

      {/* FEGLI */}
      <fieldset className="space-y-5">
        <legend className="font-heading text-lg font-semibold text-navy">
          FEGLI — Federal Employees Group Life Insurance
        </legend>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <label htmlFor="fegli" className="label mb-0">
              Current FEGLI enrollment
            </label>
            {state.lesAutofill.fegli && <LesBadge />}
          </div>
          <select
            id="fegli"
            className="input"
            value={fegli.enrollment}
            onChange={(e) => setFegli({ enrollment: e.target.value as FEGLIEnrollment })}
          >
            {FEGLI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {fegli.enrollment === "basic-b" && (
          <div>
            <label htmlFor="option-b" className="label">
              Option B multiple of salary
            </label>
            <select
              id="option-b"
              className="input max-w-[10rem]"
              value={fegli.optionBMultiple}
              onChange={(e) =>
                setFegli({ optionBMultiple: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })
              }
            >
              {[1, 2, 3, 4, 5].map((m) => (
                <option key={m} value={m}>
                  {m}× salary
                </option>
              ))}
            </select>
          </div>
        )}

        {fegli.enrollment !== "none" && (
          <div className="rounded-lg bg-ivory px-4 py-3">
            <p className="text-sm text-gray-600">Estimated current annual FEGLI premium</p>
            <p className="font-heading text-2xl font-bold text-navy">{usdCents(fegliPremium)}</p>
            <p className="text-xs text-gray-500">
              Based on your age and salary using standard FEGLI rate tables (approximate).
            </p>
          </div>
        )}

        <div>
          <span className="label">
            Would you like to see a cost comparison with private term life?
          </span>
          <div className="flex gap-2" role="group" aria-label="FEGLI cost comparison">
            {([true, false] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                className={`pill flex-1 ${state.seeFegliComparison === v ? "pill-active" : ""}`}
                aria-pressed={state.seeFegliComparison === v}
                onClick={() => setState((prev) => ({ ...prev, seeFegliComparison: v }))}
              >
                {v ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Health */}
      <fieldset className="space-y-5">
        <legend className="font-heading text-lg font-semibold text-navy">Health insurance</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <span className="label">FEHB enrolled?</span>
            <div className="flex gap-2" role="group" aria-label="FEHB enrolled">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  className={`pill flex-1 ${state.fehb === v ? "pill-active" : ""}`}
                  aria-pressed={state.fehb === v}
                  onClick={() => setState((prev) => ({ ...prev, fehb: v }))}
                >
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <span className="label">HSA-eligible plan?</span>
            <div className="flex gap-2" role="group" aria-label="HSA eligible">
              {([true, false] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  className={`pill flex-1 ${state.hsa === v ? "pill-active" : ""}`}
                  aria-pressed={state.hsa === v}
                  onClick={() => setState((prev) => ({ ...prev, hsa: v }))}
                >
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
        </div>
      </fieldset>

      <div className="flex justify-between pt-2">
        <button type="button" className="btn-secondary" onClick={onBack}>
          ← Back
        </button>
        <button type="button" className="btn-primary" onClick={onNext}>
          Next: Retirement goals →
        </button>
      </div>
    </div>
  );
}

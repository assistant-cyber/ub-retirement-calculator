"use client";

import { useCallback, useEffect, useState } from "react";
import Stepper from "@/components/Stepper";
import Step1About from "@/components/steps/Step1About";
import Step2Benefits from "@/components/steps/Step2Benefits";
import Step3Goals from "@/components/steps/Step3Goals";
import Step4Accounts from "@/components/steps/Step4Accounts";
import ResultsDashboard from "@/components/report/ResultsDashboard";
import { ageFromISO } from "@/lib/format";
import {
  clearStoredState,
  DEFAULT_STATE,
  loadState,
  loadStep,
  saveState,
  saveStep,
  type WizardState,
} from "@/components/wizard-state";

/**
 * Single-page 5-step wizard. All state lives here (one source of truth),
 * persisted to sessionStorage so refresh doesn't lose progress.
 */
export default function Wizard() {
  const [state, setStateRaw] = useState<WizardState>(DEFAULT_STATE);
  const [step, setStep] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Rehydrate from sessionStorage on mount (client only).
  useEffect(() => {
    setStateRaw(loadState());
    setStep(loadStep());
    setHydrated(true);
  }, []);

  // Persist on change.
  useEffect(() => {
    if (hydrated) saveState(state);
  }, [state, hydrated]);
  useEffect(() => {
    if (hydrated) saveStep(step);
  }, [step, hydrated]);

  const setState = useCallback(
    (updater: (prev: WizardState) => WizardState) => setStateRaw(updater),
    []
  );

  const goTo = (next: number) => {
    setStep(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateStep1 = (): boolean => {
    const errs: Record<string, string> = {};
    const age = ageFromISO(state.federal.dob);
    if (!state.federal.dob) errs.dob = "Date of birth is required.";
    else if (age === null || age < 18 || age > 80)
      errs.dob = "Please enter a date of birth for an age between 18 and 80.";
    if (!state.federal.scd) errs.scd = "Service Computation Date is required.";
    else {
      const scdDate = new Date(`${state.federal.scd}T00:00:00`);
      if (Number.isNaN(scdDate.getTime()) || scdDate.getTime() > Date.now())
        errs.scd = "SCD must be a valid date on or before today.";
    }
    if (!(state.federal.salary > 0)) errs.salary = "Please enter your current annual salary.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const startOver = () => {
    clearStoredState();
    setStateRaw(DEFAULT_STATE);
    setErrors({});
    goTo(1);
  };

  if (!hydrated) {
    // Avoid hydration mismatch with sessionStorage-backed state.
    return (
      <div className="card animate-pulse space-y-4" aria-label="Loading calculator">
        <div className="h-6 w-1/3 rounded bg-gray-200" />
        <div className="h-4 w-2/3 rounded bg-gray-200" />
        <div className="h-32 rounded bg-gray-100" />
      </div>
    );
  }

  if (step === 5) {
    return (
      <ResultsDashboard
        state={state}
        setState={setState}
        onStartOver={startOver}
        onAdjust={() => goTo(4)}
      />
    );
  }

  return (
    <>
      <Stepper current={step} />
      {step === 1 && (
        <Step1About
          state={state}
          setState={setState}
          errors={errors}
          onNext={() => {
            if (validateStep1()) goTo(2);
          }}
        />
      )}
      {step === 2 && (
        <Step2Benefits
          state={state}
          setState={setState}
          onNext={() => goTo(3)}
          onBack={() => goTo(1)}
        />
      )}
      {step === 3 && (
        <Step3Goals
          state={state}
          setState={setState}
          onNext={() => goTo(4)}
          onBack={() => goTo(2)}
        />
      )}
      {step === 4 && (
        <Step4Accounts
          state={state}
          setState={setState}
          onNext={() => goTo(5)}
          onBack={() => goTo(3)}
        />
      )}
    </>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Stepper from "@/components/Stepper";
import Step1About from "@/components/steps/Step1About";
import Step2Benefits from "@/components/steps/Step2Benefits";
import ReportChoice from "@/components/steps/ReportChoice";
import Step3Goals from "@/components/steps/Step3Goals";
import Step4Accounts from "@/components/steps/Step4Accounts";
import MiniReportDashboard from "@/components/report/MiniReportDashboard";
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
 * Wizard flow:
 * 1 = About You
 * 2 = Benefits
 * 3 = Report Choice (branch point: mini vs full)
 * 4 = Goals (full path only)
 * 5 = Accounts (full path only)
 * 6 = Full Report
 * 7 = Mini Report
 *
 * Stepper shows 5 logical steps, but internally we track 7 states.
 */

type ReportPath = "undecided" | "mini" | "full";

export default function Wizard() {
  const [state, setStateRaw] = useState<WizardState>(DEFAULT_STATE);
  const [step, setStep] = useState(1);
  const [reportPath, setReportPath] = useState<ReportPath>("undecided");
  const [hydrated, setHydrated] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Rehydrate from sessionStorage on mount (client only).
  useEffect(() => {
    setStateRaw(loadState());
    const savedStep = loadStep();
    // If they were on the mini report or full report, keep them there
    if (savedStep === 7) {
      setReportPath("mini");
    } else if (savedStep === 6) {
      setReportPath("full");
    }
    setStep(savedStep);
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
    setReportPath("undecided");
    goTo(1);
  };

  // Map internal step to stepper display (1-5)
  const stepperStep = (() => {
    if (step <= 2) return step;
    if (step === 3) return 2; // Choice screen still shows step 2 as current
    if (step === 4) return 3; // Goals
    if (step === 5) return 4; // Accounts
    if (step === 6 || step === 7) return 5; // Report
    return step;
  })();

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

  // Mini Report
  if (step === 7) {
    return (
      <MiniReportDashboard
        state={state}
        onContinueToFull={() => {
          setReportPath("full");
          goTo(4); // Go to Goals step
        }}
        onStartOver={startOver}
      />
    );
  }

  // Full Report
  if (step === 6) {
    return (
      <ResultsDashboard
        state={state}
        setState={setState}
        onStartOver={startOver}
        onAdjust={() => goTo(5)}
      />
    );
  }

  return (
    <>
      <Stepper current={stepperStep} />
      
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
          onNext={() => goTo(3)} // Go to choice screen
          onBack={() => goTo(1)}
        />
      )}
      
      {step === 3 && (
        <ReportChoice
          state={state}
          onMiniReport={() => {
            setReportPath("mini");
            goTo(7);
          }}
          onFullReport={() => {
            setReportPath("full");
            goTo(4);
          }}
          onBack={() => goTo(2)}
        />
      )}
      
      {step === 4 && (
        <Step3Goals
          state={state}
          setState={setState}
          onNext={() => goTo(5)}
          onBack={() => goTo(3)}
        />
      )}
      
      {step === 5 && (
        <Step4Accounts
          state={state}
          setState={setState}
          onNext={() => goTo(6)}
          onBack={() => goTo(4)}
        />
      )}
    </>
  );
}

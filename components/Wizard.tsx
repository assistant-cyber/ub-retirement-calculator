"use client";

import { useState } from "react";
import Stepper from "@/components/Stepper";
import StepAbout from "@/components/StepAbout";
import StepBenefits from "@/components/StepBenefits";
import StepGoals from "@/components/StepGoals";
import StepAssets from "@/components/StepAssets";
import StepResults from "@/components/StepResults";
import { DEFAULT_ASSUMPTIONS } from "@/lib/calc";
import { initialBenefitsState } from "@/lib/profile";
import type { AboutState, AssetsState, Asset, BenefitsState, GoalsState } from "@/types";

let assetCounter = 0;
export function newAsset(): Asset {
  assetCounter += 1;
  return {
    id: `asset-${assetCounter}-${Date.now()}`,
    type: "401k",
    institution: "",
    balance: 0,
    contribution: 0,
    frequency: "monthly",
  };
}

const initialAbout = (): AboutState => ({
  currentAge: 35,
  retirementAge: 65,
  maritalStatus: null,
  federalStatus: null,
  agency: "",
  yearsOfService: null,
});

const initialGoals = (): GoalsState => ({
  lifestyle: null,
  monthlySpend: 0,
  homePaidOff: true,
  monthlyHousing: 0,
  monthlySocialSecurity: 0,
  idealRetirement: "",
  biggestWorry: "",
  priorities: [],
});

const initialAssets = (): AssetsState => ({
  assets: [newAsset()],
  annualEmployerMatch: 0,
  assumptions: { ...DEFAULT_ASSUMPTIONS },
});

export default function Wizard() {
  const [step, setStep] = useState(1);
  const [about, setAbout] = useState<AboutState>(initialAbout);
  const [benefits, setBenefits] = useState<BenefitsState>(initialBenefitsState);
  const [goals, setGoals] = useState<GoalsState>(initialGoals);
  const [assetsStep, setAssetsStep] = useState<AssetsState>(initialAssets);

  const startOver = () => {
    setAbout(initialAbout());
    setBenefits(initialBenefitsState());
    setGoals(initialGoals());
    setAssetsStep(initialAssets());
    setStep(1);
  };

  return (
    <div>
      <Stepper current={step} />
      {step === 1 && <StepAbout about={about} onChange={setAbout} onNext={() => setStep(2)} />}
      {step === 2 && (
        <StepBenefits
          benefits={benefits}
          onChange={setBenefits}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepGoals
          goals={goals}
          onChange={setGoals}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}
        />
      )}
      {step === 4 && (
        <StepAssets
          assetsStep={assetsStep}
          onChange={setAssetsStep}
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}
        />
      )}
      {step === 5 && (
        <StepResults
          about={about}
          benefits={benefits}
          goals={goals}
          assetsStep={assetsStep}
          onBack={() => setStep(4)}
          onStartOver={startOver}
        />
      )}
    </div>
  );
}

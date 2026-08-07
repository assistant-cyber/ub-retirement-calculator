"use client";

import { useState } from "react";
import Stepper from "@/components/Stepper";
import StepVision from "@/components/StepVision";
import StepAssets from "@/components/StepAssets";
import StepResults from "@/components/StepResults";
import { DEFAULT_ASSUMPTIONS } from "@/lib/calc";
import type { VisionState, AssetsState, Asset } from "@/types";

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

const initialVision = (): VisionState => ({
  currentAge: 35,
  retirementAge: 65,
  lifestyle: null,
  monthlySpend: 0,
  homePaidOff: true,
  monthlyHousing: 0,
  monthlySocialSecurity: 0,
});

const initialAssets = (): AssetsState => ({
  assets: [newAsset()],
  annualEmployerMatch: 0,
  assumptions: { ...DEFAULT_ASSUMPTIONS },
});

export default function Wizard() {
  const [step, setStep] = useState(1);
  const [vision, setVision] = useState<VisionState>(initialVision);
  const [assetsStep, setAssetsStep] = useState<AssetsState>(initialAssets);

  const startOver = () => {
    setVision(initialVision());
    setAssetsStep(initialAssets());
    setStep(1);
  };

  return (
    <div>
      <Stepper current={step} />
      {step === 1 && (
        <StepVision vision={vision} onChange={setVision} onNext={() => setStep(2)} />
      )}
      {step === 2 && (
        <StepAssets
          assetsStep={assetsStep}
          onChange={setAssetsStep}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}
        />
      )}
      {step === 3 && (
        <StepResults
          vision={vision}
          assetsStep={assetsStep}
          onBack={() => setStep(2)}
          onStartOver={startOver}
        />
      )}
    </div>
  );
}

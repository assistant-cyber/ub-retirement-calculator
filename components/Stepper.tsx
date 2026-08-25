const steps = ["About You", "Benefits", "Goals", "Accounts", "Report"];

export default function Stepper({ current }: { current: number }) {
  return (
    <nav aria-label="Progress" className="stepper mb-8">
      <ol className="flex items-center gap-2 sm:gap-4">
        {steps.map((label, i) => {
          const step = i + 1;
          const active = step === current;
          const done = step < current;
          return (
            <li key={label} className="flex flex-1 items-center gap-2 sm:gap-3">
              <span
                aria-current={active ? "step" : undefined}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  active
                    ? "bg-mulberry text-white"
                    : done
                      ? "bg-navy text-white"
                      : "bg-white border border-gray-300 text-gray-500"
                }`}
              >
                {done ? "✓" : step}
              </span>
              <span
                className={`hidden text-sm font-semibold sm:inline ${
                  active ? "text-mulberry" : done ? "text-navy" : "text-gray-500"
                }`}
              >
                {label}
              </span>
              {step < steps.length && (
                <span aria-hidden="true" className="h-px flex-1 bg-gray-300" />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2 text-sm text-gray-500 sm:hidden">
        Step {current} of {steps.length}: {steps[current - 1]}
      </p>
    </nav>
  );
}

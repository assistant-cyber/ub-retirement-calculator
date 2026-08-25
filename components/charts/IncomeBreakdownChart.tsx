"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { IncomeWindow } from "@/types/federal";
import { usd } from "@/lib/format";

export const SOURCE_COLORS = {
  pension: "#21205f", // navy
  supplement: "#c9a227", // gold
  ss: "#4a6da7", // mid blue
  tsp: "#9c221f", // mulberry
  outside: "#6b7280", // gray
};

interface Props {
  /** Bridge window (retirement → 62). Omit/undefined to hide. */
  preSS?: IncomeWindow;
  postSS: IncomeWindow;
  ssStartAge: number;
}

/**
 * Stacked bar chart of projected monthly income by source for the bridge
 * window (before 62) and the steady-state window after Social Security begins.
 */
export default function IncomeBreakdownChart({ preSS, postSS, ssStartAge }: Props) {
  const data = [
    ...(preSS
      ? [
          {
            name: `Before 62 (bridge years)`,
            Pension: Math.round(preSS.pensionMonthly),
            "FERS Supplement": Math.round(preSS.supplementMonthly),
            "Social Security": 0,
            TSP: Math.round(preSS.tspMonthly),
            Outside: Math.round(preSS.outsideMonthly),
          },
        ]
      : []),
    {
      name: `After SS begins (age ${ssStartAge})`,
      Pension: Math.round(postSS.pensionMonthly),
      "FERS Supplement": 0,
      "Social Security": Math.round(postSS.ssMonthly),
      TSP: Math.round(postSS.tspMonthly),
      Outside: Math.round(postSS.outsideMonthly),
    },
  ];

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => usd(v)} tick={{ fontSize: 12 }} width={72} />
          <Tooltip formatter={(v: number | string) => usd(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="Pension" stackId="income" fill={SOURCE_COLORS.pension} />
          <Bar dataKey="FERS Supplement" stackId="income" fill={SOURCE_COLORS.supplement} />
          <Bar dataKey="Social Security" stackId="income" fill={SOURCE_COLORS.ss} />
          <Bar dataKey="TSP" stackId="income" fill={SOURCE_COLORS.tsp} />
          <Bar dataKey="Outside" stackId="income" fill={SOURCE_COLORS.outside} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

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
import type { FEGLICostPoint } from "@/types/federal";
import { usd } from "@/lib/format";

interface Props {
  /** Year-by-year FEGLI annual cost (increasing with age bands). */
  fegliPoints: FEGLICostPoint[];
  /** Level private-term annual premium estimate. */
  privateAnnual: number;
}

/**
 * Grouped bar chart: cumulative FEGLI vs private term cost at 5-year
 * checkpoints over the 20-year window. FEGLI mulberry, private navy.
 */
export default function FEGLIComparisonChart({ fegliPoints, privateAnnual }: Props) {
  const checkpoints = [5, 10, 15, 20].filter((y) => y <= fegliPoints.length);
  const data = checkpoints.map((y) => {
    const fegliCum = fegliPoints.slice(0, y).reduce((s, p) => s + p.annualCost, 0);
    return {
      name: `${y} yrs`,
      FEGLI: Math.round(fegliCum),
      "Private term": Math.round(privateAnnual * y),
    };
  });

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={(v: number) => usd(v)} tick={{ fontSize: 11 }} width={76} />
          <Tooltip formatter={(v: number | string) => usd(Number(v))} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="FEGLI" fill="#9c221f" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Private term" fill="#21205f" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

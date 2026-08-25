"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TSPProjectionPoint } from "@/types/federal";
import { usd } from "@/lib/format";

/** Line chart of projected TSP balance year-by-year to retirement. */
export default function TSPGrowthChart({ points }: { points: TSPProjectionPoint[] }) {
  const data = points.map((p) => ({
    label: p.age !== undefined ? `Age ${Math.round(p.age)}` : `Year ${p.year}`,
    balance: Math.round(p.balance),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tickFormatter={(v: number) => usd(v)} tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(v: number | string) => [usd(Number(v)), "Projected balance"]} />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#21205f"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: "#9c221f" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

"use client";

import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { formatCents } from "@/lib/money";

export function RevenueChart({ data }: { data: { day: string; revenue: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#C6FF00" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#C6FF00" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2C313A" vertical={false} />
        <XAxis dataKey="day" stroke="#5B616C" fontSize={11} tickLine={false} axisLine={false} />
        <YAxis
          stroke="#5B616C"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v) => `${Math.round(v / 100)}`}
        />
        <Tooltip
          contentStyle={{
            background: "#1A1D23",
            border: "1px solid #2C313A",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "#8B929E" }}
          formatter={(v: number) => [formatCents(v), "Receita"]}
        />
        <Area type="monotone" dataKey="revenue" stroke="#C6FF00" strokeWidth={2} fill="url(#rev)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

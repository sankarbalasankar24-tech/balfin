import { useState } from "react";
import {
  Area, AreaChart, Pie, PieChart, Cell, ResponsiveContainer, Bar, BarChart,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { fmtMoney } from "./format";

export const PIE_COLORS = [
  "#0e6a76", "#c2703d", "#5b8a3c", "#a04f79", "#4569a8",
  "#8a7a3a", "#7055a0", "#3d8a86", "#b05b5b", "#5f6b7a",
];

export function SpendEarnArea({
  data,
}: {
  data: Array<{ label: string; income: number; expense: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1d8f7e" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#1d8f7e" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c2523d" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#c2523d" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v) => fmtMoney(Number(v), { compact: true }).replace(/[₹$€£]/, "")}
        />
        <Tooltip
          formatter={(v, name) => [fmtMoney(Number(v ?? 0)), String(name)]}
          contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e1d8" }}
        />
        <Area type="monotone" dataKey="income" name="Income" stroke="#1d8f7e" fill="url(#gInc)" strokeWidth={2} />
        <Area type="monotone" dataKey="expense" name="Expense" stroke="#c2523d" fill="url(#gExp)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export interface PieDatum {
  name: string;
  amount: number;
}

// Interactive donut: tap/click a slice to pin it; center shows the selection.
export function CategoryPie({ data }: { data: PieDatum[] }) {
  const [active, setActive] = useState<number | null>(null);
  if (!data.length)
    return (
      <div className="flex h-40 items-center justify-center text-sm text-ink-faint">
        No data yet
      </div>
    );
  const total = data.reduce((s, d) => s + d.amount, 0);
  const sel = active !== null ? data[active] : null;
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie
            data={data}
            dataKey="amount"
            nameKey="name"
            innerRadius={48}
            outerRadius={70}
            paddingAngle={2}
            strokeWidth={0}
            onClick={(_, index) => setActive(active === index ? null : index)}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={PIE_COLORS[i % PIE_COLORS.length]}
                opacity={active === null || active === i ? 1 : 0.35}
                style={{ cursor: "pointer" }}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, name) => [fmtMoney(Number(v ?? 0)), String(name)]}
            contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e1d8" }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="max-w-[90px] truncate text-[10px] text-ink-faint">
          {sel ? sel.name : "Total"}
        </span>
        <span className="text-sm font-semibold tabular">
          {fmtMoney(sel ? sel.amount : total, { compact: true })}
        </span>
        {sel && total > 0 && (
          <span className="text-[10px] text-ink-faint">{((sel.amount / total) * 100).toFixed(0)}%</span>
        )}
      </div>
    </div>
  );
}

export function WeekdayBars({ data }: { data: number[] }) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const chartData = data.map((amount, i) => ({ day: days[i], amount }));
  return (
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#eee9df" />
        <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(v) => [fmtMoney(Number(v ?? 0)), "Spent"]}
          contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid #e5e1d8" }}
        />
        <Bar dataKey="amount" fill="#0e6a76" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

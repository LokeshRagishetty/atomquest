"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["#10b981", "hsl(var(--muted))"];

export function CompletionDonut({ value }: { value: number }) {
  const data = [{ name: "completed", value }, { name: "remaining", value: Math.max(0, 100 - value) }];

  return (
  <div className="relative flex h-full min-h-[260px] w-full items-center justify-center overflow-hidden">
    
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
      <span className="text-3xl font-bold tracking-tighter">
        {value}%
      </span>

      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Done
      </span>
    </div>

    <div className="flex h-full w-full items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            innerRadius={50}
            outerRadius={70}
            startAngle={90}
            endAngle={-270}
            stroke="none"
            paddingAngle={2}
            cornerRadius={4}
            cx="50%"
            cy="50%"
          >
            {data.map((entry, index) => (
              <Cell
                key={index}
                fill={COLORS[index % COLORS.length]}
                className={
                  index === 0
                    ? "drop-shadow-sm"
                    : "opacity-30"
                }
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);
}

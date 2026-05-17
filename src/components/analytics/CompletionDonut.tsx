"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const COLORS = ["#10b981", "hsl(var(--muted))"];

export function CompletionDonut({ value }: { value: number }) {
  const data = [{ name: "completed", value }, { name: "remaining", value: Math.max(0, 100 - value) }];

  return (
    <div className="relative h-48 w-full flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center flex-col">
        <span className="text-3xl font-bold tracking-tighter">{value}%</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Done</span>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie 
            data={data} 
            dataKey="value" 
            innerRadius={65} 
            outerRadius={85} 
            startAngle={90} 
            endAngle={-270}
            stroke="none"
            paddingAngle={2}
            cornerRadius={4}
          >
            {data.map((entry, index) => (
              <Cell 
                key={index} 
                fill={COLORS[index % COLORS.length]} 
                className={index === 0 ? "drop-shadow-sm" : "opacity-30"}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

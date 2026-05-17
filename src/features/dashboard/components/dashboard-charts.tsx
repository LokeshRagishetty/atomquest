"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DepartmentPoint, PiePoint, TrendPoint } from "@/lib/analytics";

const chartColors = ["#10b981", "#f59e0b", "#f43f5e", "#6366f1", "#8b5cf6"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-background/95 p-3 shadow-xl backdrop-blur-sm">
        <p className="mb-2 text-sm font-medium">{label}</p>
        <div className="space-y-1">
          {payload.map((p: any) => (
            <div key={p.name} className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
              <span className="text-muted-foreground capitalize">{p.name}:</span>
              <span className="font-semibold">{p.value}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function QoqTrendChart({ data = [] }: { data?: TrendPoint[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="h-full"
    >
      <Card className="h-full bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/20 transition-colors">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Quarter-over-quarter trend</CardTitle>
          <CardDescription>Completion percentage across employee, team, and department views.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="quarter" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeWidth: 1, opacity: 0.1, strokeDasharray: '4 4' }} />
                <Line type="monotone" dataKey="employee" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="team" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="department" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function ThrustAreaPieChart({ data = [] }: { data?: PiePoint[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="h-full"
    >
      <Card className="h-full bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/20 transition-colors">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Goal distribution</CardTitle>
          <CardDescription>Weightage distribution by thrust area.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} label={({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  return (
                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12} fontWeight="bold">
                      {value}%
                    </text>
                  );
                }} labelLine={false}>
                  {data.map((entry, index) => (
                    <Cell key={entry.name} fill={chartColors[index % chartColors.length]} stroke="transparent" className="hover:opacity-80 transition-opacity outline-none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function DepartmentPerformanceChart({ data = [] }: { data?: DepartmentPoint[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="h-full"
    >
      <Card className="h-full bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/20 transition-colors">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Department performance</CardTitle>
          <CardDescription>Completion rate by department.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0.6}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} />
                <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                <Bar dataKey="completion" radius={[4, 4, 0, 0]} fill="url(#barGradient)" maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

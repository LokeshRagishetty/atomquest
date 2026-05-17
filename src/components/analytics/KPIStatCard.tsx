"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AnimatedCounter } from "./AnimatedCounter";
import { cn } from "@/lib/utils";

export function KPIStatCard({ title, subtitle, value, tone = "default" }: { title: string; subtitle?: string; value: number | string; tone?: "default" | "success" | "warning" | "danger" }) {
  const toneClass = 
    tone === "success" ? "text-emerald-600 dark:text-emerald-400" : 
    tone === "warning" ? "text-amber-600 dark:text-amber-400" : 
    tone === "danger" ? "text-rose-600 dark:text-rose-400" : 
    "text-slate-900 dark:text-slate-100";

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <Card className={cn(
        "h-full bg-background/60 backdrop-blur-sm border-border/50",
        "hover:shadow-xl hover:border-primary/20 transition-all duration-300"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium tracking-tight text-muted-foreground">{title}</CardTitle>
          {subtitle ? <CardDescription className="text-xs">{subtitle}</CardDescription> : null}
        </CardHeader>
        <CardContent>
          <div className={toneClass}>
            <AnimatedCounter value={typeof value === "number" ? value : Number(String(value).replace(/[^0-9.-]+/g, ""))} className="text-3xl font-bold tracking-tight" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

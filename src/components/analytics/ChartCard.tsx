"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import UiSkeleton from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function ChartCard({ title, description, loading, children }: { title: string; description?: string; loading?: boolean; children?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="h-full"
    >
      <Card className={cn(
        "h-full bg-background/60 backdrop-blur-sm border-border/50",
        "transition-all duration-300 hover:shadow-xl hover:border-primary/20"
      )}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold tracking-tight">{title}</CardTitle>
          {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
        </CardHeader>
        <CardContent className="overflow-hidden">
  {loading ? (
    <UiSkeleton className="h-72 w-full rounded-xl" />
  ) : (
    <div className="min-h-[320px] w-full overflow-hidden">
      {children}
    </div>
  )}
</CardContent>
      </Card>
    </motion.div>
  );
}

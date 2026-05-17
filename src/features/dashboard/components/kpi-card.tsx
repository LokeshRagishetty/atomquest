import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: string;
  description: string;
  icon: ReactNode;
  tone?: "default" | "success" | "warning" | "danger";
};

const toneClasses = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-amber-700 dark:text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function KpiCard({ title, value, description, icon, tone = "default" }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-semibold">{value}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-md", toneClasses[tone])}>
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

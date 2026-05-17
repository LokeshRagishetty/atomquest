"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestError } from "@/components/shared/request-error";
// small time-ago helper to avoid adding external dependency
function timeAgo(iso?: string) {
  if (!iso) return "just now";
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}
import type { AppUser } from "@/types/domain";

type ActivityItem = {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  timestamp: string;
  users?: AppUser;
  new_value?: unknown;
};

export function ActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadActivity = useCallback(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    fetch("/api/manager/activity")
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || "Unable to load activity.");
        return json;
      })
      .then((json) => {
        if (!mounted) return;
        setItems((json.activity || []) as ActivityItem[]);
      })
      .catch((e: unknown) => {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : String(e));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => loadActivity(), [loadActivity]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity feed</CardTitle>
      </CardHeader>
      <CardContent>
        {error ? (
          <RequestError message={error} onRetry={loadActivity} />
        ) : loading ? (
          <div className="text-sm text-muted-foreground">Loading activity…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No recent activity</div>
        ) : (
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={it.id} className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-medium">{it.users?.name ?? it.user_id}</span>
                    <span className="ml-2 text-muted-foreground">{it.action.replaceAll("_", " ")}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{it.entity_type} · {it.entity_id}</div>
                </div>
                <div className="text-xs text-muted-foreground">{timeAgo(it.timestamp)}</div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

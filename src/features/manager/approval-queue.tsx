"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Edit3 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { Goal } from "@/types/domain";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { useToastSafe } from "@/components/ui/toast-provider";
import { RequestError } from "@/components/shared/request-error";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type GoalRow = Goal & {
  employee: { id: string; name: string; email: string; department: string } | null;
};

export function ApprovalQueue() {
  const { currentUser } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[]>([]);

  const [inlineRejectOpen, setInlineRejectOpen] = useState(false);
  const [inlineRejectId, setInlineRejectId] = useState<string | null>(null);
  const toast = useToastSafe();
  const [inlineCommentOpen, setInlineCommentOpen] = useState(false);
  const [inlineCommentId, setInlineCommentId] = useState<string | null>(null);

  const loadApprovals = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/manager/approvals?status=submitted");
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Unable to load approval queue.");
      }

      setRows((json.goals || []) as GoalRow[]);
      setSelected({});
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    void loadApprovals();
  }, [loadApprovals]);

  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel(`manager-approvals:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goals",
        },
        () => {
          void loadApprovals();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser, loadApprovals, supabase]);

  const pendingCount = rows.length;
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  function toggleSelect(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  async function inlineUpdate(id: string, updates: Partial<Record<string, unknown>>) {
    if (!currentUser) return;
    try {
      const res = await fetch(`/api/manager/approvals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Update failed");

      setRows((currentRows) =>
        currentRows.flatMap((row) => {
          if (row.id !== id) return [row];

          const nextGoal = (json.goal || {}) as Partial<GoalRow>;
          const nextStatus = nextGoal.status ?? row.status;

          if (nextStatus !== "submitted") {
            return [];
          }

          return [
            {
              ...row,
              ...nextGoal,
              employee: nextGoal.employee ?? row.employee,
            },
          ];
        }),
      );

      if (updates.status === "approved") toast?.show?.("Goal approved", "success");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function bulkAction(action: "approve" | "reject") {
    if (!currentUser) return;
    const ids = selectedIds;
    if (ids.length === 0) return;
    // open confirmation dialog instead
    setConfirmIds(ids);
    setConfirmAction(action);
    setConfirmOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Approval Queue</h2>
        <div className="flex items-center gap-2">
          {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : null}
          <Button onClick={() => bulkAction("approve")} disabled={selectedIds.length === 0}>
            <Check className="mr-2 h-4 w-4" aria-hidden="true" /> Approve selected
          </Button>
          <Button variant="destructive" onClick={() => bulkAction("reject")} disabled={selectedIds.length === 0}>
            <X className="mr-2 h-4 w-4" aria-hidden="true" /> Reject selected
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submitted goals awaiting review ({pendingCount})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead />
                  <TableHead>Employee</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Weightage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.title}`}
                        checked={!!selected[row.id]}
                        onChange={() => toggleSelect(row.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{row.employee?.name || "Unknown"}</TableCell>
                    <TableCell>{row.title}</TableCell>
                    <TableCell>{row.uomType
  ? row.uomType.replace("_", " ")
  : "N/A"}</TableCell>
                    <TableCell>
                      <Input defaultValue={row.target} onBlur={(e) => inlineUpdate(row.id, { target: e.target.value })} />
                    </TableCell>
                    <TableCell>
                      <Input
                        defaultValue={String(row.weightage)}
                        type="number"
                        onBlur={(e) => inlineUpdate(row.id, { weightage: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant={row.status === "submitted" ? "warning" : row.status === "approved" ? "success" : "destructive"}>
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button size="sm" aria-label={`Approve ${row.title}`} onClick={() => inlineUpdate(row.id, { status: "approved", locked: true })}>
                          <Check className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => {
                          setInlineRejectId(row.id);
                          setInlineRejectOpen(true);
                        }} aria-label={`Reject ${row.title}`}>
                          <X className="h-4 w-4" aria-hidden="true" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          setInlineCommentId(row.id);
                          setInlineCommentOpen(true);
                        }} aria-label={`Comment on ${row.title}`}>
                          <Edit3 className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No submitted goals are waiting for approval.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {error ? <RequestError message={error} onRetry={loadApprovals} /> : null}
      <ConfirmationDialog
        open={confirmOpen}
        title={confirmAction === "approve" ? "Approve selected goals" : "Reject selected goals"}
        description={confirmAction === "approve" ? `Approve ${confirmIds.length} goal(s)? This will lock them.` : `Reject ${confirmIds.length} goal(s). Provide a reason.`}
        confirmLabel={confirmAction === "approve" ? "Approve" : "Reject"}
        requireInput={confirmAction === "reject"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async (payload) => {
          setConfirmOpen(false);
          if (!currentUser) return;
          if (confirmAction === "reject" && !payload) return setError("Rejection requires a comment");
          try {
            const res = await fetch(`/api/manager/approvals`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: confirmAction, goalIds: confirmIds, comment: payload }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Bulk action failed");
            setRows((r) => r.filter((row) => !confirmIds.includes(row.id)));
            setSelected({});
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
          }
        }}
      />

      <ConfirmationDialog
        open={inlineRejectOpen}
        title={"Reject goal"}
        description={"Provide a rejection reason for this goal."}
        confirmLabel={"Reject"}
        requireInput
        onCancel={() => { setInlineRejectOpen(false); setInlineRejectId(null); }}
        onConfirm={async (reason) => {
          setInlineRejectOpen(false);
          if (!inlineRejectId || !currentUser) return;
          if (!reason) return setError("Rejection requires a comment");
          try {
            const res = await fetch(`/api/manager/approvals`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "reject", goalIds: [inlineRejectId], comment: reason }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Inline reject failed");
            setRows((r) => r.filter((row) => row.id !== inlineRejectId));
            setSelected((s) => ({ ...s, [inlineRejectId]: false }));
            toast?.show?.("Goal rejected");
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
            toast?.show?.(String(e instanceof Error ? e.message : e));
          } finally {
            setInlineRejectId(null);
          }
        }}
      />

      <ConfirmationDialog
        open={inlineCommentOpen}
        title={"Add manager comment"}
        description={"Add a short review comment for this goal."}
        confirmLabel={"Save comment"}
        requireInput
        onCancel={() => { setInlineCommentOpen(false); setInlineCommentId(null); }}
        onConfirm={async (comment) => {
          setInlineCommentOpen(false);
          if (!inlineCommentId || !currentUser) return;
          if (!comment) return setError("Comment required");
          try {
            const res = await fetch(`/api/manager/approvals/${inlineCommentId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ updates: { review_comment: comment } }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "Save comment failed");
            setRows((r) => r.map((row) => (row.id === inlineCommentId ? { ...row, ...(json.goal || {}) } : row)));
            toast?.show?.("Comment saved");
          } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
            toast?.show?.(String(e instanceof Error ? e.message : e));
          } finally {
            setInlineCommentId(null);
          }
        }}
      />
    </div>
  );
}

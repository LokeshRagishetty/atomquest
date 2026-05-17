"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ConfirmationProps = {
  open: boolean;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: (payload?: string) => void;
  onCancel: () => void;
  requireInput?: boolean;
};

export function ConfirmationDialog({ open, title, description, confirmLabel = "Confirm", cancelLabel = "Cancel", onConfirm, onCancel, requireInput = false }: ConfirmationProps) {
  const [input, setInput] = React.useState("");

  React.useEffect(() => {
    if (!open) setInput("");
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => {
      if (!nextOpen) onCancel();
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {requireInput ? (
          <div className="grid gap-2">
            <label className="text-sm font-medium" htmlFor="confirmation-reason">
              Reason
            </label>
            <Input
              id="confirmation-reason"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter reason"
            />
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onCancel()}>{cancelLabel}</Button>
          <Button type="button" onClick={() => onConfirm(requireInput ? input : undefined)}>{confirmLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

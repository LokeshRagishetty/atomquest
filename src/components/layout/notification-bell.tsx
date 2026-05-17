"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  created_at: string;
};

export function NotificationBell() {
  const { currentUser } = useAuth();
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const fetchNotifications = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/notifications");
      const json = await response.json();

      if (!response.ok) {
        throw new Error(json?.error || "Unable to load notifications.");
      }

      setNotifications((json.notifications || []) as Notification[]);
    } catch (fetchError) {
      setNotifications([]);
      setError(fetchError instanceof Error ? fetchError.message : "Notifications are unavailable.");
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    void fetchNotifications();

    const channel = supabase
      .channel("public:notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev].slice(0, 10));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? (payload.new as Notification) : n))
          );
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser, fetchNotifications, supabase]);

  const handleMarkAsRead = async (id: string, link: string | null) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json?.error || "Unable to update notification.");
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update notification.");
      void fetchNotifications();
    }

    if (link) {
      setOpen(false);
      router.push(link);
    }
  };

  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));

    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      if (!response.ok) {
        const json = await response.json();
        throw new Error(json?.error || "Unable to update notifications.");
      }
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update notifications.");
      void fetchNotifications();
    }
  };

  if (!currentUser) return null;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative group">
          <Bell className="h-4 w-4 transition-transform group-hover:rotate-12" aria-hidden="true" />
          <span className="sr-only">Open notifications</span>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground shadow-sm"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden">
        <div className="flex items-center justify-between border-b px-4 py-3 bg-muted/30">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="text-xs text-primary hover:underline font-medium"
            >
              Mark all as read
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {error ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p>{error}</p>
            </div>
          ) : loading ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-8 w-8 mx-auto mb-3 opacity-20" />
              <p>You&apos;re all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                onClick={() => handleMarkAsRead(notification.id, notification.link)}
                className={cn(
                  "block w-full cursor-pointer border-b px-4 py-3 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring last:border-0",
                  !notification.read ? "bg-primary/5" : ""
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={cn("text-sm font-medium", !notification.read && "text-primary")}>
                    {notification.title}
                  </h4>
                  {!notification.read && (
                    <div className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                <span className="text-[10px] text-muted-foreground mt-2 block">
                  {new Date(notification.created_at).toLocaleDateString()}
                </span>
              </button>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

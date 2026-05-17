"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, Home, Target, CheckSquare, Users, FileText } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { currentUser } = useAuth();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!currentUser) return null;

  return (
    <>
      <div 
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground bg-muted/50 border rounded-md cursor-pointer hover:bg-muted transition-colors mr-2 w-64"
      >
        <Search className="h-4 w-4" />
        <span>Search...</span>
        <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-start justify-center pt-[20vh]">
          <Command
            className="w-full max-w-lg bg-popover border shadow-2xl rounded-xl overflow-hidden text-popover-foreground flex flex-col"
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
          >
            <div className="flex items-center border-b px-3">
              <Search className="w-5 h-5 text-muted-foreground mr-2 shrink-0" />
              <Command.Input 
                autoFocus 
                placeholder="Type a command or search..." 
                className="flex-1 bg-transparent py-4 outline-none placeholder:text-muted-foreground"
              />
            </div>
            
            <Command.List className="max-h-[300px] overflow-y-auto p-2">
              <Command.Empty className="py-6 text-center text-sm text-muted-foreground">No results found.</Command.Empty>

              <Command.Group heading="Navigation" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-muted-foreground">
                <Command.Item 
                  onSelect={() => runCommand(() => router.push(`/${currentUser.role}/dashboard`))}
                  className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <Home className="h-4 w-4" /> Dashboard
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push(`/${currentUser.role}/goals`))}
                  className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <Target className="h-4 w-4" /> My Goals
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push(`/${currentUser.role}/checkins`))}
                  className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <CheckSquare className="h-4 w-4" /> Check-ins
                </Command.Item>
                
                {currentUser.role === 'manager' && (
                  <Command.Item 
                    onSelect={() => runCommand(() => router.push(`/manager/approvals`))}
                    className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                  >
                    <CheckSquare className="h-4 w-4" /> Approvals
                  </Command.Item>
                )}

                {currentUser.role === 'admin' && (
                  <>
                    <Command.Item 
                      onSelect={() => runCommand(() => router.push(`/admin/users`))}
                      className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <Users className="h-4 w-4" /> User Management
                    </Command.Item>
                    <Command.Item 
                      onSelect={() => runCommand(() => router.push(`/admin/reports`))}
                      className="flex items-center gap-2 px-2 py-2 text-sm rounded-md cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <FileText className="h-4 w-4" /> Reports
                    </Command.Item>
                  </>
                )}
              </Command.Group>
            </Command.List>
          </Command>
          
          {/* Overlay click to close */}
          <div className="fixed inset-0 z-[-1]" onClick={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

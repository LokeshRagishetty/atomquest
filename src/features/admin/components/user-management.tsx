"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Edit2, MoreHorizontal, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { RequestError } from "@/components/shared/request-error";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast-provider";
import type { Database } from "@/lib/supabase/database.types";

type UserRow = Database["public"]["Tables"]["users"]["Row"];

type UserFormData = {
  name: string;
  email: string;
  role: UserRow["role"];
  department: string;
  manager_id: string;
  is_active: boolean;
};

const emptyForm: UserFormData = {
  name: "",
  email: "",
  role: "employee",
  department: "",
  manager_id: "",
  is_active: true,
};

export function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addToast } = useToast();

  const [formData, setFormData] = useState<UserFormData>(emptyForm);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);

      const res = await fetch(`/api/admin/users?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to fetch users");
      setUsers((data.users || []) as UserRow[]);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to fetch users";
      setError(message);
      addToast(message, "error");
    } finally {
      setLoading(false);
    }
  }, [addToast, search]);

  useEffect(() => {
    void fetchUsers();
  }, [fetchUsers]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
      const method = editingUser ? "PATCH" : "POST";
      const body = editingUser ? { updates: formData } : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Operation failed");

      addToast(editingUser ? "User updated successfully" : "User invited successfully", "success");
      setOpen(false);
      void fetchUsers();
    } catch (submitError) {
      addToast(submitError instanceof Error ? submitError.message : "Operation failed", "error");
    }
  };

  const handleEdit = (user: UserRow) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      manager_id: user.manager_id || "",
      is_active: user.is_active ?? true,
    });
    setOpen(true);
  };

  const toggleStatus = async (user: UserRow) => {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates: { is_active: !user.is_active } }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to update status");

      addToast(`User ${!user.is_active ? "activated" : "deactivated"}`, "success");
      void fetchUsers();
    } catch (statusError) {
      addToast(statusError instanceof Error ? statusError.message : "Failed to update status", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search users..."
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Dialog
          open={open}
          onOpenChange={(value) => {
            setOpen(value);
            if (!value) setEditingUser(null);
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setFormData(emptyForm)}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" /> Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingUser ? "Edit User" : "Invite User"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="user-name">Name</label>
                <Input id="user-name" required value={formData.name} onChange={(event) => setFormData({ ...formData, name: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="user-email">Email</label>
                <Input id="user-email" required type="email" value={formData.email} onChange={(event) => setFormData({ ...formData, email: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="user-role">Role</label>
                <select
                  id="user-role"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors"
                  value={formData.role}
                  onChange={(event) => setFormData({ ...formData, role: event.target.value as UserRow["role"] })}
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="user-department">Department</label>
                <Input id="user-department" required value={formData.department} onChange={(event) => setFormData({ ...formData, department: event.target.value })} />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium" htmlFor="user-manager">Manager ID (Optional)</label>
                <Input id="user-manager" value={formData.manager_id} onChange={(event) => setFormData({ ...formData, manager_id: event.target.value })} />
              </div>
              <Button type="submit" className="w-full">{editingUser ? "Save Changes" : "Send Invite"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {error ? <RequestError message={error} onRetry={fetchUsers} /> : null}

      <div className="overflow-x-auto rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">No users found.</TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === "admin" ? "default" : user.role === "manager" ? "secondary" : "outline"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.department}</TableCell>
                  <TableCell>
                    <Badge variant={user.is_active ? "success" : "destructive"}>
                      {user.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" aria-label={`Open actions for ${user.name}`}>
                          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Edit2 className="mr-2 h-4 w-4" aria-hidden="true" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleStatus(user)}>
                          {user.is_active ? <X className="mr-2 h-4 w-4" aria-hidden="true" /> : <Check className="mr-2 h-4 w-4" aria-hidden="true" />}
                          {user.is_active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

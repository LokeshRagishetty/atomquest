"use client";

import { create } from "zustand";
import type { AppUser } from "@/types/domain";

type AuthState = {
  currentUser: AppUser | null;
  hasHydrated: boolean;
  loading: boolean;
  setCurrentUser: (user: AppUser | null) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  currentUser: null,
  hasHydrated: false,
  loading: false,
  setCurrentUser: (currentUser) => set({ currentUser }),
  setHasHydrated: (hasHydrated) => set({ hasHydrated }),
  setLoading: (loading) => set({ loading }),
  reset: () => set({ currentUser: null, loading: false, hasHydrated: true }),
}));

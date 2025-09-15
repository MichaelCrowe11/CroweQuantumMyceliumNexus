import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  user: {
    id: string;
    name: string;
    email: string;
  } | null;
  setUser: (user: AppState['user']) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      darkMode: false,
      setDarkMode: (value) => set({ darkMode: value }),
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'app-storage',
    }
  )
);
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface FavoritesState {
  favorites: number[];
  toggleFavorite: (setId: number) => void;
  isFavorite: (setId: number) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      toggleFavorite: (setId) => {
        const cur = get().favorites;
        const next = cur.includes(setId)
          ? cur.filter((id) => id !== setId)
          : [...cur, setId];
        set({ favorites: next });
      },
      isFavorite: (setId) => get().favorites.includes(setId),
    }),
    { name: "osu-favorites" },
  ),
);

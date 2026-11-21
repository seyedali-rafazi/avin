import { create } from 'zustand';
import { settingsRepository } from '@/database/repositories';
import type { SearchTab } from '@/types/music';

interface SearchState {
  query: string;
  activeTab: SearchTab;
  history: string[];

  loadHistory: () => void;
  setQuery: (query: string) => void;
  setActiveTab: (tab: SearchTab) => void;
  saveToHistory: (query: string) => void;
  removeHistoryItem: (query: string) => void;
  clearHistory: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  activeTab: 'songs',
  history: [],

  loadHistory: () => {
    try {
      const history = settingsRepository.getSearchHistory(15);
      set({ history });
    } catch {
      set({ history: [] });
    }
  },

  setQuery: (query) => set({ query }),

  setActiveTab: (activeTab) => set({ activeTab }),

  saveToHistory: (query) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    settingsRepository.addSearchQuery(trimmed);
    set({ history: settingsRepository.getSearchHistory(15) });
  },

  removeHistoryItem: (query) => {
    settingsRepository.removeSearchQuery(query);
    set({ history: settingsRepository.getSearchHistory(15) });
  },

  clearHistory: () => {
    settingsRepository.clearSearchHistory();
    set({ history: [] });
  },
}));

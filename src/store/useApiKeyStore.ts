import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ApiKeyState {
  finnhubApiKey: string;
  openaiApiKey: string;
  isConfigured: boolean;

  // Actions
  setFinnhubApiKey: (key: string) => void;
  setOpenaiApiKey: (key: string) => void;
  checkConfiguration: () => void;
  clearApiKeys: () => void;
}

export const useApiKeyStore = create<ApiKeyState>()(
  persist(
    (set, get) => ({
      finnhubApiKey: '',
      openaiApiKey: '',
      isConfigured: false,

      setFinnhubApiKey: (key: string) => {
        set({ finnhubApiKey: key });
        get().checkConfiguration();
      },

      setOpenaiApiKey: (key: string) => {
        set({ openaiApiKey: key });
        get().checkConfiguration();
      },

      checkConfiguration: () => {
        const state = get();
        const isConfigured =
          state.finnhubApiKey.trim() !== '' &&
          state.finnhubApiKey !== 'demo';
        set({ isConfigured });
      },

      clearApiKeys: () => {
        set({
          finnhubApiKey: '',
          openaiApiKey: '',
          isConfigured: false,
        });
      },
    }),
    {
      name: 'invesage-api-keys',
      partialize: (state) => ({
        finnhubApiKey: state.finnhubApiKey,
        openaiApiKey: state.openaiApiKey,
      }),
    }
  )
);
import { create } from "zustand";
import {
  StockData,
  ScreeningResult,
  TechnicalSignal,
  CompanyProfile,
  NewsSentiment,
  CompanyIRInfo,
} from "../types";
import type { TabId } from "../components/TabNavigation";

interface MarketData {
  symbol: string;
  value: number;
  change: string;
  trend: "up" | "down";
}

interface SelectedStock {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changePercent?: number;
}

interface StockStore {
  // UI State
  activeTab: TabId;
  selectedStock: SelectedStock | null;
  isDetailPanelOpen: boolean;

  // 市場データ
  marketData: {
    nikkei: MarketData;
  };

  // 株価データ
  currentStock: {
    symbol: string;
    data: StockData[];
    signals: TechnicalSignal[];
    lastUpdate: Date | null;
  };

  // 企業情報とセンチメントデータ
  companyProfiles: Record<string, CompanyProfile>;
  newsSentiments: Record<string, NewsSentiment>;

  // IR情報
  irInfoCache: Record<string, CompanyIRInfo>;

  // スクリーニング結果
  screeningResults: ScreeningResult[];

  // ウォッチリスト
  watchlist: string[];

  // ローディング状態
  isLoading: boolean;
  error: string | null;

  // 自動更新設定
  autoUpdateEnabled: boolean;
  updateInterval: number; // ミリ秒

  // UI Actions
  setActiveTab: (tab: TabId) => void;
  setSelectedStock: (stock: SelectedStock | null) => void;
  openDetailPanel: (stock: SelectedStock) => void;
  closeDetailPanel: () => void;

  // アクション
  setMarketData: (data: Partial<StockStore["marketData"]>) => void;
  setCurrentStock: (
    symbol: string,
    data: StockData[],
    signals: TechnicalSignal[]
  ) => void;
  setCompanyProfile: (symbol: string, profile: CompanyProfile) => void;
  setNewsSentiment: (symbol: string, sentiment: NewsSentiment) => void;
  setIRInfo: (symbol: string, irInfo: CompanyIRInfo) => void;
  setScreeningResults: (results: ScreeningResult[]) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  toggleAutoUpdate: () => void;
  setUpdateInterval: (interval: number) => void;
  reset: () => void;
}

const initialMarketData = {
  nikkei: {
    symbol: "N225",
    value: 0,
    change: "--",
    trend: "up" as const,
  },
};

export const useStockStore = create<StockStore>((set) => ({
  // UI State
  activeTab: "dashboard" as TabId,
  selectedStock: null,
  isDetailPanelOpen: false,

  // 初期状態
  marketData: initialMarketData,

  currentStock: {
    symbol: "",
    data: [],
    signals: [],
    lastUpdate: null,
  },

  // 企業情報とセンチメントデータ
  companyProfiles: {},
  newsSentiments: {},

  // IR情報
  irInfoCache: {},

  screeningResults: [],
  watchlist: ["7203.T", "9984.T", "6758.T", "7974.T", "8035.T"],
  isLoading: false,
  error: null,
  autoUpdateEnabled: true,
  updateInterval: 60000, // 1分

  // UI Actions
  setActiveTab: (tab) => set({ activeTab: tab }),

  setSelectedStock: (stock) => set({ selectedStock: stock }),

  openDetailPanel: (stock) =>
    set({
      selectedStock: stock,
      isDetailPanelOpen: true,
    }),

  closeDetailPanel: () =>
    set({
      isDetailPanelOpen: false,
    }),

  // アクション実装
  setMarketData: (data) =>
    set((state) => ({
      marketData: { ...state.marketData, ...data },
    })),

  setCurrentStock: (symbol, data, signals) =>
    set({
      currentStock: {
        symbol,
        data,
        signals,
        lastUpdate: new Date(),
      },
      error: null,
    }),

  setCompanyProfile: (symbol, profile) =>
    set((state) => ({
      companyProfiles: {
        ...state.companyProfiles,
        [symbol]: profile,
      },
    })),

  setNewsSentiment: (symbol, sentiment) =>
    set((state) => ({
      newsSentiments: {
        ...state.newsSentiments,
        [symbol]: sentiment,
      },
    })),

  setIRInfo: (symbol, irInfo) =>
    set((state) => ({
      irInfoCache: {
        ...state.irInfoCache,
        [symbol]: irInfo,
      },
    })),

  setScreeningResults: (results) => set({ screeningResults: results }),

  addToWatchlist: (symbol) =>
    set((state) => {
      if (state.watchlist.includes(symbol)) {
        return state;
      }
      return { watchlist: [...state.watchlist, symbol] };
    }),

  removeFromWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.filter((s) => s !== symbol),
    })),

  setLoading: (loading) => set({ isLoading: loading }),

  setError: (error) => set({ error, isLoading: false }),

  toggleAutoUpdate: () =>
    set((state) => ({ autoUpdateEnabled: !state.autoUpdateEnabled })),

  setUpdateInterval: (interval) => set({ updateInterval: interval }),

  reset: () =>
    set({
      currentStock: {
        symbol: "",
        data: [],
        signals: [],
        lastUpdate: null,
      },
      screeningResults: [],
      isLoading: false,
      error: null,
    }),
}));

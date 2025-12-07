import { create } from "zustand";
import {
  StockData,
  ScreeningResult,
  TechnicalSignal,
  CompanyProfile,
  NewsSentiment,
} from "../types";

interface MarketData {
  symbol: string;
  value: number;
  change: string;
  trend: "up" | "down";
}

interface StockStore {
  // 市場データ
  marketData: {
    nikkei: MarketData;
    sp500: MarketData;
    nasdaq: MarketData;
  };

  // 株価データ
  currentStock: {
    symbol: string;
    data: StockData[];
    signals: TechnicalSignal[];
    lastUpdate: Date | null;
  };

  // 企業情報とセンチメントデータ（新規追加）
  companyProfiles: Record<string, CompanyProfile>;
  newsSentiments: Record<string, NewsSentiment>;

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

  // アクション
  setMarketData: (data: Partial<StockStore["marketData"]>) => void;
  setCurrentStock: (
    symbol: string,
    data: StockData[],
    signals: TechnicalSignal[]
  ) => void;
  setCompanyProfile: (symbol: string, profile: CompanyProfile) => void;
  setNewsSentiment: (symbol: string, sentiment: NewsSentiment) => void;
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
  sp500: {
    symbol: "SPX",
    value: 0,
    change: "--",
    trend: "up" as const,
  },
  nasdaq: {
    symbol: "IXIC",
    value: 0,
    change: "--",
    trend: "up" as const,
  },
};

export const useStockStore = create<StockStore>((set) => ({
  // 初期状態
  marketData: initialMarketData,

  currentStock: {
    symbol: "",
    data: [],
    signals: [],
    lastUpdate: null,
  },

  // 企業情報とセンチメントデータ（新規追加）
  companyProfiles: {},
  newsSentiments: {},

  screeningResults: [],
  watchlist: ["NVDA", "MSFT", "GOOGL", "AAPL", "TSLA"],
  isLoading: false,
  error: null,
  autoUpdateEnabled: true,
  updateInterval: 60000, // 1分

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

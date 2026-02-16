import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  Trade,
  DailySummary,
  MonthlySummary,
  TradeAnalysis,
  TradeResult,
} from "../types";

interface TradeStore {
  // 取引データ
  trades: Trade[];

  // 選択中の日付（損益カレンダー用）
  selectedDate: string; // YYYY-MM-DD

  // フォーム表示状態
  isFormOpen: boolean;
  editingTrade: Trade | null;

  // アクション
  addTrade: (trade: Omit<Trade, "id" | "profitLoss" | "profitLossPercent" | "result" | "createdAt">) => void;
  updateTrade: (id: string, updates: Partial<Omit<Trade, "id" | "createdAt">>) => void;
  deleteTrade: (id: string) => void;
  setSelectedDate: (date: string) => void;
  openForm: (trade?: Trade) => void;
  closeForm: () => void;

  // 算出値
  getDailySummary: (date: string) => DailySummary;
  getMonthlySummary: (month: string) => MonthlySummary;
  getTradeAnalysis: (fromDate?: string, toDate?: string) => TradeAnalysis;
  getRecentDates: (limit?: number) => string[];
}

function calcProfitLoss(
  direction: Trade["direction"],
  entryPrice: number,
  exitPrice: number,
  quantity: number,
  commission: number
): number {
  const raw = direction === "long"
    ? (exitPrice - entryPrice) * quantity
    : (entryPrice - exitPrice) * quantity;
  return raw - commission;
}

function calcProfitLossPercent(
  direction: Trade["direction"],
  entryPrice: number,
  exitPrice: number
): number {
  if (entryPrice === 0) return 0;
  return direction === "long"
    ? ((exitPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - exitPrice) / entryPrice) * 100;
}

function calcResult(profitLoss: number): TradeResult {
  if (profitLoss > 0) return "win";
  if (profitLoss < 0) return "loss";
  return "even";
}

function buildDailySummary(date: string, trades: Trade[]): DailySummary {
  const dayTrades = trades.filter((t) => t.date === date);
  const wins = dayTrades.filter((t) => t.result === "win");
  const losses = dayTrades.filter((t) => t.result === "loss");
  const evens = dayTrades.filter((t) => t.result === "even");
  const totalPL = dayTrades.reduce((sum, t) => sum + t.profitLoss, 0);

  return {
    date,
    trades: dayTrades,
    totalProfitLoss: totalPL,
    winCount: wins.length,
    lossCount: losses.length,
    evenCount: evens.length,
    winRate: dayTrades.length > 0 ? (wins.length / dayTrades.length) * 100 : 0,
    maxWin: wins.length > 0 ? Math.max(...wins.map((t) => t.profitLoss)) : 0,
    maxLoss: losses.length > 0 ? Math.min(...losses.map((t) => t.profitLoss)) : 0,
    averageWin: wins.length > 0 ? wins.reduce((s, t) => s + t.profitLoss, 0) / wins.length : 0,
    averageLoss: losses.length > 0 ? losses.reduce((s, t) => s + t.profitLoss, 0) / losses.length : 0,
  };
}

export const useTradeStore = create<TradeStore>()(
  persist(
    (set, get) => ({
      trades: [],
      selectedDate: new Date().toISOString().slice(0, 10),
      isFormOpen: false,
      editingTrade: null,

      addTrade: (tradeInput) => {
        const profitLoss = calcProfitLoss(
          tradeInput.direction,
          tradeInput.entryPrice,
          tradeInput.exitPrice,
          tradeInput.quantity,
          tradeInput.commission
        );
        const profitLossPercent = calcProfitLossPercent(
          tradeInput.direction,
          tradeInput.entryPrice,
          tradeInput.exitPrice
        );
        const trade: Trade = {
          ...tradeInput,
          id: crypto.randomUUID(),
          profitLoss,
          profitLossPercent,
          result: calcResult(profitLoss),
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ trades: [...state.trades, trade] }));
      },

      updateTrade: (id, updates) => {
        set((state) => ({
          trades: state.trades.map((t) => {
            if (t.id !== id) return t;
            const updated = { ...t, ...updates };
            updated.profitLoss = calcProfitLoss(
              updated.direction,
              updated.entryPrice,
              updated.exitPrice,
              updated.quantity,
              updated.commission
            );
            updated.profitLossPercent = calcProfitLossPercent(
              updated.direction,
              updated.entryPrice,
              updated.exitPrice
            );
            updated.result = calcResult(updated.profitLoss);
            return updated;
          }),
        }));
      },

      deleteTrade: (id) => {
        set((state) => ({
          trades: state.trades.filter((t) => t.id !== id),
        }));
      },

      setSelectedDate: (date) => set({ selectedDate: date }),

      openForm: (trade) => set({ isFormOpen: true, editingTrade: trade || null }),

      closeForm: () => set({ isFormOpen: false, editingTrade: null }),

      getDailySummary: (date) => buildDailySummary(date, get().trades),

      getMonthlySummary: (month) => {
        const trades = get().trades.filter((t) => t.date.startsWith(month));
        const wins = trades.filter((t) => t.result === "win");
        const uniqueDays = new Set(trades.map((t) => t.date));
        return {
          month,
          totalProfitLoss: trades.reduce((s, t) => s + t.profitLoss, 0),
          tradeCount: trades.length,
          winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
          tradingDays: uniqueDays.size,
        };
      },

      getTradeAnalysis: (fromDate, toDate) => {
        let trades = get().trades;
        if (fromDate) trades = trades.filter((t) => t.date >= fromDate);
        if (toDate) trades = trades.filter((t) => t.date <= toDate);

        const wins = trades.filter((t) => t.result === "win");
        const losses = trades.filter((t) => t.result === "loss");
        const totalWin = wins.reduce((s, t) => s + t.profitLoss, 0);
        const totalLoss = Math.abs(losses.reduce((s, t) => s + t.profitLoss, 0));

        // 連勝・連敗の計算
        let maxConsWins = 0, maxConsLosses = 0, curWins = 0, curLosses = 0;
        const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
        for (const t of sorted) {
          if (t.result === "win") {
            curWins++;
            curLosses = 0;
            maxConsWins = Math.max(maxConsWins, curWins);
          } else if (t.result === "loss") {
            curLosses++;
            curWins = 0;
            maxConsLosses = Math.max(maxConsLosses, curLosses);
          } else {
            curWins = 0;
            curLosses = 0;
          }
        }

        const bestTrade = trades.length > 0
          ? trades.reduce((best, t) => t.profitLoss > best.profitLoss ? t : best, trades[0])
          : null;
        const worstTrade = trades.length > 0
          ? trades.reduce((worst, t) => t.profitLoss < worst.profitLoss ? t : worst, trades[0])
          : null;

        // 洞察の生成
        const insights: string[] = [];
        const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
        if (winRate > 0 && winRate < 40) {
          insights.push("勝率が低い傾向があります。エントリーポイントを見直しましょう。");
        }
        if (totalLoss > 0 && totalWin / totalLoss < 1) {
          insights.push("利益が損失を下回っています。損切りラインの見直しを検討しましょう。");
        }
        if (wins.length > 0 && losses.length > 0) {
          const avgWin = totalWin / wins.length;
          const avgLoss = totalLoss / losses.length;
          if (avgWin < avgLoss) {
            insights.push("平均利益が平均損失を下回っています。利確が早すぎるかもしれません。");
          }
        }
        if (maxConsLosses >= 3) {
          insights.push(`最大${maxConsLosses}連敗があります。連敗時はポジションサイズを減らすことを検討しましょう。`);
        }
        if (trades.length === 0) {
          insights.push("取引記録がありません。取引を追加して分析を始めましょう。");
        }
        if (trades.length > 0 && insights.length === 0) {
          insights.push("トレードの成績は安定しています。この調子で続けましょう。");
        }

        return {
          totalTrades: trades.length,
          totalProfitLoss: trades.reduce((s, t) => s + t.profitLoss, 0),
          winRate,
          profitFactor: totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0,
          averageWin: wins.length > 0 ? totalWin / wins.length : 0,
          averageLoss: losses.length > 0 ? -(totalLoss / losses.length) : 0,
          maxConsecutiveWins: maxConsWins,
          maxConsecutiveLosses: maxConsLosses,
          bestTrade,
          worstTrade,
          averageHoldProfitPercent: trades.length > 0
            ? trades.reduce((s, t) => s + t.profitLossPercent, 0) / trades.length
            : 0,
          insights,
        };
      },

      getRecentDates: (limit = 30) => {
        const dates = [...new Set(get().trades.map((t) => t.date))];
        dates.sort((a, b) => b.localeCompare(a));
        return dates.slice(0, limit);
      },
    }),
    {
      name: "invesage-trades",
    }
  )
);

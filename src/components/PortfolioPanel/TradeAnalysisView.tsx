import React, { useState } from "react";
import { useTradeStore } from "../../store/useTradeStore";
import styles from "./PortfolioPanel.module.css";

export const TradeAnalysisView: React.FC = () => {
  const { getTradeAnalysis, getMonthlySummary, getRecentDates, trades } = useTradeStore();

  // 期間フィルター
  const [period, setPeriod] = useState<"all" | "month" | "week">("all");
  const now = new Date();
  const fromDate = period === "week"
    ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : period === "month"
    ? new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    : undefined;

  const analysis = getTradeAnalysis(fromDate);

  // 月別サマリー（直近6ヶ月）
  const monthlySummaries = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlySummaries.push(getMonthlySummary(month));
  }

  // 日別損益の推移（直近取引日）
  const recentDates = getRecentDates(15);
  const dailyPLs = recentDates.map((date) => {
    const dayTrades = trades.filter((t) => t.date === date);
    return {
      date,
      pl: dayTrades.reduce((s, t) => s + t.profitLoss, 0),
    };
  }).reverse();

  // 累計損益の計算
  let cumulative = 0;
  const cumulativePLs = dailyPLs.map((d) => {
    cumulative += d.pl;
    return { ...d, cumulative };
  });

  const maxAbsCum = Math.max(...cumulativePLs.map((d) => Math.abs(d.cumulative)), 1);

  return (
    <div className={styles.analysisSection}>
      {/* 期間セレクター */}
      <div className={styles.periodSelector}>
        <button
          className={`${styles.periodBtn} ${period === "all" ? styles.periodBtnActive : ""}`}
          onClick={() => setPeriod("all")}
        >
          全期間
        </button>
        <button
          className={`${styles.periodBtn} ${period === "month" ? styles.periodBtnActive : ""}`}
          onClick={() => setPeriod("month")}
        >
          今月
        </button>
        <button
          className={`${styles.periodBtn} ${period === "week" ? styles.periodBtnActive : ""}`}
          onClick={() => setPeriod("week")}
        >
          直近1週間
        </button>
      </div>

      {/* 主要指標 */}
      <div className={styles.analysisMetrics}>
        <div className={styles.analysisMetricCard}>
          <div className={styles.analysisMetricLabel}>総損益</div>
          <div className={`${styles.analysisMetricValue} ${
            analysis.totalProfitLoss > 0 ? styles.winText :
            analysis.totalProfitLoss < 0 ? styles.lossText : ""
          }`}>
            {analysis.totalProfitLoss >= 0 ? "+" : ""}
            ¥{analysis.totalProfitLoss.toLocaleString("ja-JP")}
          </div>
        </div>
        <div className={styles.analysisMetricCard}>
          <div className={styles.analysisMetricLabel}>総取引数</div>
          <div className={styles.analysisMetricValue}>{analysis.totalTrades}</div>
        </div>
        <div className={styles.analysisMetricCard}>
          <div className={styles.analysisMetricLabel}>勝率</div>
          <div className={styles.analysisMetricValue}>
            {analysis.totalTrades > 0 ? `${analysis.winRate.toFixed(1)}%` : "---"}
          </div>
        </div>
        <div className={styles.analysisMetricCard}>
          <div className={styles.analysisMetricLabel}>プロフィットファクター</div>
          <div className={`${styles.analysisMetricValue} ${
            analysis.profitFactor > 1 ? styles.winText :
            analysis.profitFactor < 1 && analysis.profitFactor > 0 ? styles.lossText : ""
          }`}>
            {analysis.totalTrades > 0
              ? analysis.profitFactor === Infinity
                ? "∞"
                : analysis.profitFactor.toFixed(2)
              : "---"
            }
          </div>
        </div>
      </div>

      {/* 詳細統計 */}
      <div className={styles.statsGrid}>
        <div className={styles.statsSection}>
          <h4 className={styles.statsSectionTitle}>トレード統計</h4>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>平均利益</span>
            <span className={`${styles.statValue} ${styles.winText}`}>
              +¥{analysis.averageWin.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>平均損失</span>
            <span className={`${styles.statValue} ${styles.lossText}`}>
              ¥{analysis.averageLoss.toLocaleString("ja-JP", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>平均損益率</span>
            <span className={styles.statValue}>
              {analysis.averageHoldProfitPercent.toFixed(2)}%
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>最大連勝</span>
            <span className={`${styles.statValue} ${styles.winText}`}>
              {analysis.maxConsecutiveWins}連勝
            </span>
          </div>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>最大連敗</span>
            <span className={`${styles.statValue} ${styles.lossText}`}>
              {analysis.maxConsecutiveLosses}連敗
            </span>
          </div>
        </div>

        {/* ベスト/ワーストトレード */}
        <div className={styles.statsSection}>
          <h4 className={styles.statsSectionTitle}>ベスト / ワースト</h4>
          {analysis.bestTrade && (
            <div className={styles.bestWorstCard}>
              <div className={styles.bestWorstLabel}>ベストトレード</div>
              <div className={styles.bestWorstSymbol}>
                {analysis.bestTrade.symbol} {analysis.bestTrade.name}
              </div>
              <div className={`${styles.bestWorstPL} ${styles.winText}`}>
                +¥{analysis.bestTrade.profitLoss.toLocaleString("ja-JP")}
                <span className={styles.bestWorstPercent}>
                  (+{analysis.bestTrade.profitLossPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
          {analysis.worstTrade && (
            <div className={styles.bestWorstCard}>
              <div className={styles.bestWorstLabel}>ワーストトレード</div>
              <div className={styles.bestWorstSymbol}>
                {analysis.worstTrade.symbol} {analysis.worstTrade.name}
              </div>
              <div className={`${styles.bestWorstPL} ${styles.lossText}`}>
                ¥{analysis.worstTrade.profitLoss.toLocaleString("ja-JP")}
                <span className={styles.bestWorstPercent}>
                  ({analysis.worstTrade.profitLossPercent.toFixed(2)}%)
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 累計損益チャート（CSSベース） */}
      {cumulativePLs.length > 0 && (
        <div className={styles.chartSection}>
          <h4 className={styles.chartTitle}>累計損益推移</h4>
          <div className={styles.barChart}>
            {cumulativePLs.map((d) => (
              <div key={d.date} className={styles.barChartCol}>
                <div className={styles.barChartBarWrap}>
                  <div
                    className={`${styles.barChartBar} ${
                      d.cumulative >= 0 ? styles.barChartBarWin : styles.barChartBarLoss
                    }`}
                    style={{
                      height: `${Math.abs(d.cumulative) / maxAbsCum * 80}px`,
                      [d.cumulative >= 0 ? "bottom" : "top"]: "50%",
                    }}
                    title={`${d.date}: ¥${d.cumulative.toLocaleString("ja-JP")}`}
                  />
                  <div className={styles.barChartZero} />
                </div>
                <div className={styles.barChartDate}>
                  {d.date.slice(5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 月別サマリー */}
      <div className={styles.monthlySection}>
        <h4 className={styles.monthlyTitle}>月別サマリー</h4>
        <div className={styles.monthlyGrid}>
          {monthlySummaries.filter((m) => m.tradeCount > 0).map((m) => (
            <div key={m.month} className={styles.monthlyCard}>
              <div className={styles.monthlyMonth}>{m.month}</div>
              <div className={`${styles.monthlyPL} ${
                m.totalProfitLoss > 0 ? styles.winText :
                m.totalProfitLoss < 0 ? styles.lossText : ""
              }`}>
                {m.totalProfitLoss >= 0 ? "+" : ""}
                ¥{m.totalProfitLoss.toLocaleString("ja-JP")}
              </div>
              <div className={styles.monthlyStats}>
                {m.tradeCount}件 / 勝率{m.winRate.toFixed(0)}% / {m.tradingDays}日
              </div>
            </div>
          ))}
          {monthlySummaries.every((m) => m.tradeCount === 0) && (
            <div className={styles.emptyTrades}>
              <p>取引記録がありません</p>
            </div>
          )}
        </div>
      </div>

      {/* AI分析・洞察 */}
      <div className={styles.insightsSection}>
        <h4 className={styles.insightsTitle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          トレード分析・洞察
        </h4>
        <div className={styles.insightsList}>
          {analysis.insights.map((insight, i) => (
            <div key={i} className={styles.insightItem}>
              {insight}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

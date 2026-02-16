import React, { useState } from "react";
import { useTradeStore } from "../../store/useTradeStore";
import { DailySummaryView } from "./DailySummaryView";
import { TradeAnalysisView } from "./TradeAnalysisView";
import { TradeForm } from "./TradeForm";
import styles from "./PortfolioPanel.module.css";

type SubTab = "daily" | "analysis";

export const PortfolioPanel: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>("daily");
  const { isFormOpen, getTradeAnalysis } = useTradeStore();
  const analysis = getTradeAnalysis();

  return (
    <div className={styles.portfolio}>
      {/* ヘッダー */}
      <div className={styles.portfolioHeader}>
        <div>
          <h2 className={styles.portfolioTitle}>Trading Journal</h2>
          <p className={styles.portfolioSubtitle}>日々の損益管理とデイトレ分析</p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.headerStat}>
            <span className={styles.headerStatLabel}>総取引</span>
            <span className={styles.headerStatValue}>{analysis.totalTrades}</span>
          </div>
          <div className={styles.headerStat}>
            <span className={styles.headerStatLabel}>総損益</span>
            <span className={`${styles.headerStatValue} ${
              analysis.totalProfitLoss > 0 ? styles.winText :
              analysis.totalProfitLoss < 0 ? styles.lossText : ""
            }`}>
              {analysis.totalProfitLoss >= 0 ? "+" : ""}
              ¥{analysis.totalProfitLoss.toLocaleString("ja-JP")}
            </span>
          </div>
        </div>
      </div>

      {/* サブタブ */}
      <div className={styles.subTabs}>
        <button
          className={`${styles.subTab} ${subTab === "daily" ? styles.subTabActive : ""}`}
          onClick={() => setSubTab("daily")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          日次損益
        </button>
        <button
          className={`${styles.subTab} ${subTab === "analysis" ? styles.subTabActive : ""}`}
          onClick={() => setSubTab("analysis")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="18" y1="20" x2="18" y2="10" />
            <line x1="12" y1="20" x2="12" y2="4" />
            <line x1="6" y1="20" x2="6" y2="14" />
          </svg>
          分析・振り返り
        </button>
      </div>

      {/* コンテンツ */}
      <div className={styles.portfolioContent}>
        {subTab === "daily" && <DailySummaryView />}
        {subTab === "analysis" && <TradeAnalysisView />}
      </div>

      {/* 取引入力フォーム（モーダル） */}
      {isFormOpen && <TradeForm />}
    </div>
  );
};

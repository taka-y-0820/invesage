import React from "react";
import { useTradeStore } from "../../store/useTradeStore";
import type { Trade } from "../../types";
import styles from "./PortfolioPanel.module.css";

const Icons = {
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  ChevronLeft: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  ),
  ChevronRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  ),
};

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const DailySummaryView: React.FC = () => {
  const { selectedDate, setSelectedDate, getDailySummary, openForm, deleteTrade } = useTradeStore();
  const summary = getDailySummary(selectedDate);

  const handleDeleteTrade = (trade: Trade) => {
    if (window.confirm(`${trade.name} の取引を削除しますか？`)) {
      deleteTrade(trade.id);
    }
  };

  return (
    <div className={styles.dailySection}>
      {/* 日付ナビゲーション */}
      <div className={styles.dateNav}>
        <button
          className={styles.dateNavBtn}
          onClick={() => setSelectedDate(shiftDate(selectedDate, -1))}
        >
          <Icons.ChevronLeft />
        </button>
        <div className={styles.dateDisplay}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={styles.dateInput}
          />
          <span className={styles.dateLabel}>{formatDate(selectedDate)}</span>
        </div>
        <button
          className={styles.dateNavBtn}
          onClick={() => setSelectedDate(shiftDate(selectedDate, 1))}
        >
          <Icons.ChevronRight />
        </button>
      </div>

      {/* 日次サマリーカード */}
      <div className={styles.summaryCards}>
        <div className={`${styles.summaryCard} ${
          summary.totalProfitLoss > 0 ? styles.summaryCardWin :
          summary.totalProfitLoss < 0 ? styles.summaryCardLoss :
          ""
        }`}>
          <div className={styles.summaryCardLabel}>日次損益</div>
          <div className={styles.summaryCardValue}>
            {summary.totalProfitLoss >= 0 ? "+" : ""}
            ¥{summary.totalProfitLoss.toLocaleString("ja-JP")}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardLabel}>取引数</div>
          <div className={styles.summaryCardValue}>{summary.trades.length}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardLabel}>勝率</div>
          <div className={styles.summaryCardValue}>
            {summary.trades.length > 0 ? `${summary.winRate.toFixed(0)}%` : "---"}
          </div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardLabel}>勝ち / 負け</div>
          <div className={styles.summaryCardValue}>
            <span className={styles.winText}>{summary.winCount}W</span>
            {" / "}
            <span className={styles.lossText}>{summary.lossCount}L</span>
          </div>
        </div>
      </div>

      {/* 取引一覧 */}
      <div className={styles.tradeList}>
        <div className={styles.tradeListHeader}>
          <h4 className={styles.tradeListTitle}>取引一覧</h4>
          <button className={styles.addTradeBtn} onClick={() => openForm()}>
            + 取引を追加
          </button>
        </div>

        {summary.trades.length === 0 ? (
          <div className={styles.emptyTrades}>
            <p>この日の取引はありません</p>
            <button className={styles.addTradeEmptyBtn} onClick={() => openForm()}>
              取引を記録する
            </button>
          </div>
        ) : (
          <div className={styles.tradeTable}>
            {summary.trades.map((trade) => (
              <div key={trade.id} className={styles.tradeRow}>
                <div className={styles.tradeRowMain}>
                  <div className={styles.tradeInfo}>
                    <div className={styles.tradeSymbolRow}>
                      <span className={styles.tradeSymbol}>{trade.symbol}</span>
                      <span className={`${styles.tradeBadge} ${
                        trade.direction === "long" ? styles.tradeBadgeLong : styles.tradeBadgeShort
                      }`}>
                        {trade.direction === "long" ? "買" : "売"}
                      </span>
                    </div>
                    <span className={styles.tradeName}>{trade.name}</span>
                  </div>

                  <div className={styles.tradePrices}>
                    <div className={styles.tradePriceEntry}>
                      <span className={styles.tradePriceLabel}>IN</span>
                      <span>¥{trade.entryPrice.toLocaleString("ja-JP")}</span>
                    </div>
                    <span className={styles.tradePriceArrow}>→</span>
                    <div className={styles.tradePriceExit}>
                      <span className={styles.tradePriceLabel}>OUT</span>
                      <span>¥{trade.exitPrice.toLocaleString("ja-JP")}</span>
                    </div>
                  </div>

                  <div className={styles.tradeQty}>
                    {trade.quantity}株
                  </div>

                  <div className={`${styles.tradePL} ${
                    trade.profitLoss > 0 ? styles.tradePLWin :
                    trade.profitLoss < 0 ? styles.tradePLLoss :
                    ""
                  }`}>
                    <div className={styles.tradePLAmount}>
                      {trade.profitLoss >= 0 ? "+" : ""}
                      ¥{trade.profitLoss.toLocaleString("ja-JP")}
                    </div>
                    <div className={styles.tradePLPercent}>
                      {trade.profitLossPercent >= 0 ? "+" : ""}
                      {trade.profitLossPercent.toFixed(2)}%
                    </div>
                  </div>

                  <div className={styles.tradeActions}>
                    <button
                      className={styles.tradeActionBtn}
                      onClick={() => openForm(trade)}
                      title="編集"
                    >
                      <Icons.Edit />
                    </button>
                    <button
                      className={`${styles.tradeActionBtn} ${styles.tradeActionBtnDanger}`}
                      onClick={() => handleDeleteTrade(trade)}
                      title="削除"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                </div>

                {/* メモ・理由の表示 */}
                {(trade.entryReason || trade.exitReason || trade.memo) && (
                  <div className={styles.tradeNotes}>
                    {trade.entryReason && (
                      <div className={styles.tradeNote}>
                        <span className={styles.tradeNoteLabel}>IN理由:</span> {trade.entryReason}
                      </div>
                    )}
                    {trade.exitReason && (
                      <div className={styles.tradeNote}>
                        <span className={styles.tradeNoteLabel}>OUT理由:</span> {trade.exitReason}
                      </div>
                    )}
                    {trade.memo && (
                      <div className={styles.tradeNote}>
                        <span className={styles.tradeNoteLabel}>メモ:</span> {trade.memo}
                      </div>
                    )}
                  </div>
                )}

                {/* タグ */}
                {trade.tags && trade.tags.length > 0 && (
                  <div className={styles.tradeTags}>
                    {trade.tags.map((tag) => (
                      <span key={tag} className={styles.tradeTag}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

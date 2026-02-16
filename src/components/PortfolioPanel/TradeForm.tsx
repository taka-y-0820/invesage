import React, { useState, useEffect } from "react";
import { useTradeStore } from "../../store/useTradeStore";
import type { TradeDirection } from "../../types";
import styles from "./PortfolioPanel.module.css";

export const TradeForm: React.FC = () => {
  const { editingTrade, closeForm, addTrade, updateTrade } = useTradeStore();

  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [direction, setDirection] = useState<TradeDirection>("long");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [commission, setCommission] = useState("0");
  const [entryReason, setEntryReason] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [memo, setMemo] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (editingTrade) {
      setDate(editingTrade.date);
      setSymbol(editingTrade.symbol);
      setName(editingTrade.name);
      setDirection(editingTrade.direction);
      setEntryPrice(String(editingTrade.entryPrice));
      setExitPrice(String(editingTrade.exitPrice));
      setQuantity(String(editingTrade.quantity));
      setCommission(String(editingTrade.commission));
      setEntryReason(editingTrade.entryReason || "");
      setExitReason(editingTrade.exitReason || "");
      setMemo(editingTrade.memo || "");
      setTags(editingTrade.tags?.join(", ") || "");
    }
  }, [editingTrade]);

  const previewPL = (() => {
    const ep = parseFloat(entryPrice);
    const xp = parseFloat(exitPrice);
    const qty = parseInt(quantity);
    const com = parseFloat(commission) || 0;
    if (isNaN(ep) || isNaN(xp) || isNaN(qty)) return null;
    const raw = direction === "long" ? (xp - ep) * qty : (ep - xp) * qty;
    return raw - com;
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ep = parseFloat(entryPrice);
    const xp = parseFloat(exitPrice);
    const qty = parseInt(quantity);
    const com = parseFloat(commission) || 0;
    if (isNaN(ep) || isNaN(xp) || isNaN(qty)) return;

    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const tradeData = {
      date,
      symbol: symbol.toUpperCase(),
      name,
      direction,
      entryPrice: ep,
      exitPrice: xp,
      quantity: qty,
      commission: com,
      entryReason: entryReason || undefined,
      exitReason: exitReason || undefined,
      memo: memo || undefined,
      tags: tagList.length > 0 ? tagList : undefined,
    };

    if (editingTrade) {
      updateTrade(editingTrade.id, tradeData);
    } else {
      addTrade(tradeData);
    }
    closeForm();
  };

  return (
    <div className={styles.formOverlay} onClick={(e) => {
      if (e.target === e.currentTarget) closeForm();
    }}>
      <div className={styles.formPanel}>
        <div className={styles.formHeader}>
          <h3 className={styles.formTitle}>
            {editingTrade ? "取引を編集" : "取引を記録"}
          </h3>
          <button className={styles.formCloseBtn} onClick={closeForm}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* 基本情報 */}
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>取引日</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>売買</label>
              <div className={styles.directionToggle}>
                <button
                  type="button"
                  className={`${styles.directionBtn} ${direction === "long" ? styles.directionBtnLong : ""}`}
                  onClick={() => setDirection("long")}
                >
                  買い (Long)
                </button>
                <button
                  type="button"
                  className={`${styles.directionBtn} ${direction === "short" ? styles.directionBtnShort : ""}`}
                  onClick={() => setDirection("short")}
                >
                  売り (Short)
                </button>
              </div>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>銘柄コード</label>
              <input
                type="text"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                placeholder="7203.T"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>銘柄名</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="トヨタ自動車"
                className={styles.formInput}
                required
              />
            </div>
          </div>

          {/* 価格情報 */}
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>エントリー価格</label>
              <input
                type="number"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="2500"
                step="any"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>エグジット価格</label>
              <input
                type="number"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="2550"
                step="any"
                className={styles.formInput}
                required
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>数量（株数）</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="100"
                min="1"
                className={styles.formInput}
                required
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.formLabel}>手数料</label>
              <input
                type="number"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                placeholder="0"
                step="any"
                min="0"
                className={styles.formInput}
              />
            </div>
          </div>

          {/* 損益プレビュー */}
          {previewPL !== null && (
            <div className={`${styles.plPreview} ${previewPL >= 0 ? styles.plPreviewWin : styles.plPreviewLoss}`}>
              <span className={styles.plPreviewLabel}>損益見込み</span>
              <span className={styles.plPreviewValue}>
                {previewPL >= 0 ? "+" : ""}¥{previewPL.toLocaleString("ja-JP")}
              </span>
            </div>
          )}

          {/* エントリー・エグジット理由 */}
          <div className={styles.formField}>
            <label className={styles.formLabel}>エントリー理由</label>
            <textarea
              value={entryReason}
              onChange={(e) => setEntryReason(e.target.value)}
              placeholder="出来高急増、5日線ブレイク..."
              className={styles.formTextarea}
              rows={2}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>エグジット理由</label>
            <textarea
              value={exitReason}
              onChange={(e) => setExitReason(e.target.value)}
              placeholder="目標価格到達、反転シグナル..."
              className={styles.formTextarea}
              rows={2}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>メモ・反省点</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="今日の振り返り、改善点..."
              className={styles.formTextarea}
              rows={3}
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>タグ（カンマ区切り）</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="デイトレ, ブレイクアウト, 半導体"
              className={styles.formInput}
            />
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.formCancelBtn} onClick={closeForm}>
              キャンセル
            </button>
            <button type="submit" className={styles.formSubmitBtn}>
              {editingTrade ? "更新する" : "記録する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React from "react";
import { SurgeStock } from "../services/scanner/surgeScannerService";
import "./SurgeStockList.css";

interface SurgeStockListProps {
  stocks: SurgeStock[];
  market: "JP" | "US";
  onSelectStock?: (stock: SurgeStock) => void;
}

export const SurgeStockList: React.FC<SurgeStockListProps> = ({
  stocks,
  market,
  onSelectStock,
}) => {
  const formatPrice = (price: number, market: "JP" | "US") => {
    if (market === "JP") {
      return `¥${price.toLocaleString("ja-JP")}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (changePercent: number) => {
    const sign = changePercent >= 0 ? "+" : "";
    return `${sign}${changePercent.toFixed(2)}%`;
  };

  const getChangeClass = (changePercent: number) => {
    if (changePercent >= 0) return "surge-positive";
    return "surge-negative";
  };

  if (stocks.length === 0) {
    return (
      <div className="surge-stock-list-empty">
        <p>
          {market === "JP"
            ? "現在、急騰・急落している銘柄はありません"
            : "No surge stocks detected"}
        </p>
      </div>
    );
  }

  return (
    <div className="surge-stock-list">
      <h2>
        {market === "JP"
          ? "🇯🇵 急騰・急落銘柄 (日本市場)"
          : "🇺🇸 Surge Stocks (US Market)"}
      </h2>
      <div className="surge-stock-grid">
        {stocks.map((stock) => (
          <div
            key={stock.symbol}
            className="surge-stock-card"
            onClick={() => onSelectStock?.(stock)}
          >
            <div className="surge-stock-header">
              <div className="surge-stock-symbol">{stock.symbol}</div>
              <div
                className={`surge-stock-change ${getChangeClass(
                  stock.changePercent
                )}`}
              >
                {formatChange(stock.changePercent)}
              </div>
            </div>
            <div className="surge-stock-name">{stock.name}</div>
            <div className="surge-stock-prices">
              <div className="surge-stock-price">
                <span className="label">現在価格</span>
                <span className="value">
                  {formatPrice(stock.currentPrice, market)}
                </span>
              </div>
              <div className="surge-stock-price">
                <span className="label">前日終値</span>
                <span className="value">
                  {formatPrice(stock.previousClose, market)}
                </span>
              </div>
            </div>
            {stock.volume && (
              <div className="surge-stock-volume">
                出来高: {stock.volume.toLocaleString()}
              </div>
            )}
            <div className="surge-stock-timestamp">
              {new Date(stock.timestamp).toLocaleTimeString("ja-JP")}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

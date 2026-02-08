/**
 * AI Stock Analysis Service
 * リアルタイム株式データを分析し、投資判断を提供
 */

export type Recommendation = "BUY" | "SELL" | "HOLD";

export interface StockAnalysis {
  recommendation: Recommendation;
  confidence: number; // 0-100
  reasoning: string;
  timestamp: string;
}

export interface StockInput {
  symbol: string;
  price: number;
  change: number;
  change_percent: number;
  volume: number;
}

/**
 * 株式データを分析して投資推奨を生成
 * @param stockData リアルタイム株式データ
 * @returns AI分析結果
 */
export async function analyzeStock(
  stockData: StockInput
): Promise<StockAnalysis> {
  // バリデーション
  if (!stockData.symbol || stockData.price <= 0) {
    throw new Error("Invalid stock data: symbol and price are required");
  }

  // シンプルなルールベース分析（後でAI APIに置き換え可能）
  const analysis = performBasicAnalysis(stockData);

  return {
    ...analysis,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 基本的なテクニカル分析ロジック
 * TODO: 実際のAI API（OpenAI/Claude等）に置き換え
 */
function performBasicAnalysis(
  data: StockInput
): Omit<StockAnalysis, "timestamp"> {
  let score = 0;
  const reasons: string[] = [];

  // 価格変動率による判断
  if (data.change_percent > 3) {
    score += 30;
    reasons.push(
      `Strong upward momentum (+${data.change_percent.toFixed(2)}%)`
    );
  } else if (data.change_percent > 1) {
    score += 15;
    reasons.push(
      `Positive price movement (+${data.change_percent.toFixed(2)}%)`
    );
  } else if (data.change_percent < -3) {
    score -= 30;
    reasons.push(`Sharp decline (${data.change_percent.toFixed(2)}%)`);
  } else if (data.change_percent < -1) {
    score -= 15;
    reasons.push(`Negative trend (${data.change_percent.toFixed(2)}%)`);
  }

  // 出来高による判断
  if (data.volume > 50000000) {
    score += 20;
    reasons.push(
      `High trading volume (${(data.volume / 1000000).toFixed(1)}M)`
    );
  } else if (data.volume < 10000000) {
    score -= 10;
    reasons.push(`Low liquidity (${(data.volume / 1000000).toFixed(1)}M)`);
  }

  // 推奨判定
  let recommendation: Recommendation;
  let confidence: number;

  if (score >= 30) {
    recommendation = "BUY";
    confidence = Math.min(70 + score / 2, 95);
  } else if (score <= -30) {
    recommendation = "SELL";
    confidence = Math.min(70 + Math.abs(score) / 2, 95);
  } else {
    recommendation = "HOLD";
    confidence = 50 + Math.abs(score);
  }

  return {
    recommendation,
    confidence: Math.round(confidence),
    reasoning: reasons.join(". ") || "Neutral market conditions",
  };
}

/**
 * 複数銘柄を一括分析（将来の拡張用）
 */
export async function analyzeBatch(
  stockDataList: StockInput[]
): Promise<StockAnalysis[]> {
  return Promise.all(stockDataList.map(analyzeStock));
}

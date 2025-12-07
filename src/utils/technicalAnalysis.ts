import { StockData, TechnicalSignal } from '../types';

export class TechnicalAnalyzer {
  // 上昇トレンドスクリーニング用の閾値
  static readonly UPTREND_THRESHOLDS = {
    VOLUME_SPIKE_MODERATE: 2.0,
    VOLUME_SPIKE_STRONG: 3.5,
    PRICE_INCREASE_MIN: 0.02, // 2%以上の上昇
    CONSECUTIVE_DAYS: 3, // 連続上昇日数
    RSI_MOMENTUM_MIN: 50, // RSI50以上で上昇トレンド
    RSI_MOMENTUM_STRONG: 65
  };
  static calculateSMA(data: number[], period: number): number[] {
    const smaValues: number[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      smaValues.push(sum / period);
    }
    return smaValues;
  }

  static calculateRSI(prices: number[], period: number = 14): number[] {
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? -change : 0);
    }

    const avgGain = this.calculateSMA(gains, period);
    const avgLoss = this.calculateSMA(losses, period);
    
    return avgGain.map((gain, i) => {
      const rs = gain / avgLoss[i];
      return 100 - (100 / (1 + rs));
    });
  }

  static detectVolumeSpike(data: StockData[]): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    const volumes = data.map(d => d.volume);
    const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

    // 最近5日間の出来高をチェック
    const recentData = data.slice(-5);
    
    recentData.forEach((item, index) => {
      const volumeRatio = item.volume / avgVolume;
      const priceChange = index > 0 ? (item.close - recentData[index - 1].close) / recentData[index - 1].close : 0;
      
      // 出来高急増 + 価格上昇の組み合わせを重視
      if (volumeRatio > this.UPTREND_THRESHOLDS.VOLUME_SPIKE_MODERATE && priceChange > 0) {
        const strength = volumeRatio > this.UPTREND_THRESHOLDS.VOLUME_SPIKE_STRONG ? 'strong' : 'moderate';
        signals.push({
          type: 'volume_spike',
          strength,
          description: `出来高急増(${volumeRatio.toFixed(1)}倍) + 価格上昇(${(priceChange * 100).toFixed(1)}%)`,
          timestamp: item.time
        });
      }
    });

    return signals;
  }

  static detectBreakout(data: StockData[]): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    const closePrices = data.map(d => d.close);
    const sma20 = this.calculateSMA(closePrices, 20);
    
    if (sma20.length < 2) return signals;

    const currentPrice = closePrices[closePrices.length - 1];
    const currentSMA = sma20[sma20.length - 1];
    const prevSMA = sma20[sma20.length - 2];

    if (currentPrice > currentSMA && currentSMA > prevSMA) {
      const breakoutStrength = ((currentPrice - currentSMA) / currentSMA) * 100;
      
      signals.push({
        type: 'breakout',
        strength: breakoutStrength > 5 ? 'strong' : 'moderate',
        description: `20日移動平均線を${breakoutStrength.toFixed(1)}%上抜け`,
        timestamp: data[data.length - 1].time
      });
    }

    return signals;
  }

  static detectMomentum(data: StockData[]): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    const closePrices = data.map(d => d.close);
    
    if (closePrices.length < 14) return signals;

    const rsi = this.calculateRSI(closePrices);
    const currentRSI = rsi[rsi.length - 1];

    if (currentRSI > 70) {
      signals.push({
        type: 'momentum',
        strength: currentRSI > 80 ? 'strong' : 'moderate',
        description: `RSI ${currentRSI.toFixed(1)} - 買われ過ぎ`,
        timestamp: data[data.length - 1].time
      });
    } else if (currentRSI < 30) {
      signals.push({
        type: 'momentum',
        strength: currentRSI < 20 ? 'strong' : 'moderate',
        description: `RSI ${currentRSI.toFixed(1)} - 売られ過ぎ`,
        timestamp: data[data.length - 1].time
      });
    }

    return signals;
  }

  static detectConsecutiveUpDays(data: StockData[]): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    let consecutiveCount = 0;
    let totalGain = 0;

    for (let i = 1; i < data.length; i++) {
      const priceChange = (data[i].close - data[i - 1].close) / data[i - 1].close;
      
      if (priceChange > 0) {
        consecutiveCount++;
        totalGain += priceChange;
      } else {
        if (consecutiveCount >= this.UPTREND_THRESHOLDS.CONSECUTIVE_DAYS) {
          signals.push({
            type: 'pattern',
            strength: consecutiveCount >= 5 ? 'strong' : 'moderate',
            description: `${consecutiveCount}日連続上昇 (総上昇率: ${(totalGain * 100).toFixed(1)}%)`,
            timestamp: data[i - 1].time
          });
        }
        consecutiveCount = 0;
        totalGain = 0;
      }
    }

    // 最後まで上昇が続いている場合
    if (consecutiveCount >= this.UPTREND_THRESHOLDS.CONSECUTIVE_DAYS) {
      signals.push({
        type: 'pattern',
        strength: consecutiveCount >= 5 ? 'strong' : 'moderate',
        description: `${consecutiveCount}日連続上昇 (総上昇率: ${(totalGain * 100).toFixed(1)}%)`,
        timestamp: data[data.length - 1].time
      });
    }

    return signals;
  }

  static calculateTechnicalScore(data: StockData[]): number {
    let score = 0;
    const signals = this.analyzeStock(data);
    
    // シグナルの数と強度に基づいてスコア算出
    signals.forEach(signal => {
      if (signal.strength === 'strong') {
        score += 25;
      } else if (signal.strength === 'moderate') {
        score += 15;
      } else {
        score += 5;
      }
    });

    // 最近の価格トレンド評価
    if (data.length >= 5) {
      const recentData = data.slice(-5);
      const firstPrice = recentData[0].close;
      const lastPrice = recentData[recentData.length - 1].close;
      const priceGain = (lastPrice - firstPrice) / firstPrice;
      
      if (priceGain > 0.1) { // 10%以上の上昇
        score += 20;
      } else if (priceGain > 0.05) { // 5%以上の上昇
        score += 10;
      }
    }

    return Math.min(score, 100);
  }

  static screenForUptrend(stocks: { symbol: string; data: StockData[] }[]): { symbol: string; score: number; signals: TechnicalSignal[] }[] {
    return stocks
      .map(stock => ({
        symbol: stock.symbol,
        score: this.calculateTechnicalScore(stock.data),
        signals: this.analyzeStock(stock.data)
      }))
      .filter(result => result.score >= 40) // 40点以上のみ
      .sort((a, b) => b.score - a.score); // スコア降順
  }

  static analyzeStock(data: StockData[]): TechnicalSignal[] {
    const allSignals: TechnicalSignal[] = [];
    
    allSignals.push(...this.detectVolumeSpike(data));
    allSignals.push(...this.detectBreakout(data));
    allSignals.push(...this.detectMomentum(data));
    allSignals.push(...this.detectConsecutiveUpDays(data));

    return allSignals;
  }
}
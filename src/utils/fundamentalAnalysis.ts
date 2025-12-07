import { FundamentalData, AnalysisResult } from '../types';

export class FundamentalAnalyzer {
  // 成長性スクリーニング用の闾値
  static readonly GROWTH_THRESHOLDS = {
    REVENUE_GROWTH_MIN: 0.15, // 15%以上の売上成長
    REVENUE_GROWTH_STRONG: 0.25, // 25%以上で強い成長
    PE_RATIO_REASONABLE: 30, // PER30以下で割安
    PE_RATIO_CHEAP: 20, // PER20以下でかなり割安
    MARKET_CAP_MIN: 1_000_000_000, // 10億以上の時価総額
    PROFIT_MARGIN_MIN: 0.05 // 5%以上の利益率
  };

  // 成長セクターの定義
  private static growthSectors = [
    'Technology', 'Healthcare', 'Consumer Discretionary', 'Communication Services',
    'Biotechnology', 'Software', 'Semiconductor', 'E-commerce', 'Fintech',
    'Clean Energy', 'Electric Vehicles', 'Cloud Computing', 'Cybersecurity'
  ];

  static evaluateGrowthPotential(companyName: string, sector: string, recentNews: string[]): number {
    let score = 0;

    // 成長セクター評価
    const sectorMatch = this.growthSectors.find(growthSector => 
      sector.toLowerCase().includes(growthSector.toLowerCase())
    );
    
    if (sectorMatch) {
      if (['Technology', 'Software', 'Biotechnology'].includes(sectorMatch)) {
        score += 25;
      } else if (['Healthcare', 'Clean Energy', 'Fintech'].includes(sectorMatch)) {
        score += 20;
      } else {
        score += 15;
      }
    }

    // 成長キーワード分析
    const growthKeywords = [
      'growth', 'expansion', 'innovation', 'digital transformation', 'market share',
      'revenue increase', 'new product', 'partnership', 'acquisition', 'IPO',
      'AI', 'cloud', 'subscription', 'platform', 'ecosystem'
    ];
    
    recentNews.forEach(news => {
      const newsLower = news.toLowerCase();
      growthKeywords.forEach(keyword => {
        if (newsLower.includes(keyword.toLowerCase())) {
          score += 3;
        }
      });
    });

    // 企業サイズと知名度評価
    const companyLower = companyName.toLowerCase();
    if (companyLower.includes('inc') || companyLower.includes('corp') || companyLower.includes('ltd')) {
      score += 5; // 正式な企業形態
    }

    return Math.min(score, 100);
  }

  static calculateFundamentalScore(data: FundamentalData): number {
    let score = 0;

    // 成長ポテンシャル（重要度30%）
    score += (data.aiExposure / 100) * 30; // aiExposureをgrowthPotentialとして再利用

    // PEレシオ評価（重要度25%） - 成長企業は高PERでもOK
    if (data.peRatio > 0) {
      if (data.peRatio < this.GROWTH_THRESHOLDS.PE_RATIO_CHEAP) {
        score += 25; // かなり割安
      } else if (data.peRatio < this.GROWTH_THRESHOLDS.PE_RATIO_REASONABLE) {
        score += 20; // 適正水準
      } else if (data.peRatio < 50) {
        score += 15; // 成長企業なら許容範囲
      } else if (data.peRatio < 80) {
        score += 8; // 高いが成長が期待される
      }
    }

    // 売上規模評価（重要度20%）
    if (data.revenue > 50_000_000_000) { // 500億以上
      score += 20;
    } else if (data.revenue > 10_000_000_000) { // 100億以上
      score += 18;
    } else if (data.revenue > 1_000_000_000) { // 10億以上
      score += 15;
    } else if (data.revenue > 100_000_000) { // 1億以上
      score += 10;
    }

    // 時価総額評価（重要度25%）
    if (data.marketCap > 100_000_000_000) { // 1000億以上の大型株
      score += 25;
    } else if (data.marketCap > 10_000_000_000) { // 100億以上の中型株
      score += 22;
    } else if (data.marketCap > this.GROWTH_THRESHOLDS.MARKET_CAP_MIN) { // 10億以上の小型成長株
      score += 20;
    } else if (data.marketCap > 500_000_000) { // 5億以上
      score += 15;
    }

    return Math.min(score, 100);
  }

  static analyzeCompany(_stockData: any[], fundamentalData: FundamentalData): AnalysisResult {
    const fundamentalScore = this.calculateFundamentalScore(fundamentalData);
    
    // テクニカルスコアは別途計算（簡略化）
    const technicalScore = Math.random() * 100; // 実際はTechnicalAnalyzerから取得
    
    const overallScore = (technicalScore * 0.6 + fundamentalScore * 0.4);
    
    let recommendation: 'buy' | 'hold' | 'sell';
    if (overallScore >= 75) {
      recommendation = 'buy';
    } else if (overallScore >= 50) {
      recommendation = 'hold';
    } else {
      recommendation = 'sell';
    }

    return {
      symbol: fundamentalData.symbol,
      technicalScore,
      fundamentalScore,
      overallScore,
      signals: [], // TechnicalAnalyzerから取得
      recommendation
    };
  }

  static screenForGrowthStocks(stocks: { symbol: string; fundamentalData: FundamentalData }[]): { symbol: string; score: number; category: string }[] {
    return stocks
      .map(stock => {
        const score = this.calculateFundamentalScore(stock.fundamentalData);
        let category = '一般';
        
        if (score >= 80) {
          category = '高成長期待';
        } else if (score >= 65) {
          category = '成長有望';
        } else if (score >= 50) {
          category = '安定成長';
        }
        
        return {
          symbol: stock.symbol,
          score,
          category
        };
      })
      .filter(result => result.score >= 40) // 40点以上のみ
      .sort((a, b) => b.score - a.score);
  }

  static isGrowthSector(sector: string): boolean {
    return this.growthSectors.some(growthSector => 
      sector.toLowerCase().includes(growthSector.toLowerCase())
    );
  }

  static generateInsights(analysisResult: AnalysisResult, fundamentalData: FundamentalData): string[] {
    const insights: string[] = [];

    if (fundamentalData.aiExposure > 70) {
      insights.push(`${fundamentalData.companyName}は高い成長ポテンシャル(${fundamentalData.aiExposure}%)を持つ`);
    }

    if (analysisResult.technicalScore > 75) {
      insights.push('テクニカル指標は強い上昇トレンドを示している');
    }

    if (fundamentalData.peRatio < 25 && fundamentalData.peRatio > 0) {
      insights.push(`PER ${fundamentalData.peRatio}は適正水準で成長性とのバランスが良い`);
    } else if (fundamentalData.peRatio > 50) {
      insights.push(`PER ${fundamentalData.peRatio}は高いが、将来の成長が期待されている`);
    }

    if (fundamentalData.marketCap > 100_000_000_000) {
      insights.push('大型株で安定性が高い');
    } else if (fundamentalData.marketCap < 10_000_000_000) {
      insights.push('中小型株で成長の伸びしろが大きい');
    }

    if (analysisResult.overallScore > 80) {
      insights.push('総合スコアが高く、今後の上昇が大いに期待できる');
    }

    return insights;
  }
}
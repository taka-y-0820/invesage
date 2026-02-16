/**
 * 市場インテリジェンス表示コンポーネント
 * RAG、X、ニュース、AIエージェントからの情報を統合して表示
 */

import React, { useState, useEffect } from 'react';
import styles from './MarketIntelligence.module.css';
import { marketIntelligenceService } from '../../services/rag/marketIntelligenceService';
import type {
  AIMarketReport,
  RealTimeMarketData,
  RAGSearchResult,
  AnalyzedInformation,
  RAGQuery
} from '../../types';

interface MarketIntelligenceProps {
  onSelectStock?: (stock: { symbol: string; name: string; }) => void;
}

interface TabData {
  id: 'overview' | 'news' | 'social' | 'search';
  label: string;
  icon: React.ReactNode;
}

const tabs: TabData[] = [
  {
    id: 'overview',
    label: '概況',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 12a9 9 0 1 0 9-9" />
        <path d="M14 12c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2z" />
      </svg>
    )
  },
  {
    id: 'news',
    label: 'ニュース',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v16a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <line x1="9" y1="9" x2="15" y2="9" />
        <line x1="9" y1="13" x2="15" y2="13" />
      </svg>
    )
  },
  {
    id: 'social',
    label: 'ソーシャル',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z" />
      </svg>
    )
  },
  {
    id: 'search',
    label: '検索',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
    )
  }
];

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({
  onSelectStock
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'news' | 'social' | 'search'>('overview');
  const [marketReport, setMarketReport] = useState<AIMarketReport | null>(null);
  const [realTimeData, setRealTimeData] = useState<RealTimeMarketData | null>(null);
  const [searchResults, setSearchResults] = useState<RAGSearchResult | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初期データ読み込み
  useEffect(() => {
    loadMarketIntelligence();

    // リアルタイム監視開始
    marketIntelligenceService.startRealTimeMonitoring();

    return () => {
      // クリーンアップ
      marketIntelligenceService.stopRealTimeMonitoring();
    };
  }, []);

  const loadMarketIntelligence = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const data = await marketIntelligenceService.getComprehensiveMarketIntelligence();
      setMarketReport(data.marketReport);
      setRealTimeData(data.realTimeData);
      setSearchResults(data.searchResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データの読み込みに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
      setIsLoading(true);
      const query: RAGQuery = {
        text: searchQuery,
        limit: 20
      };

      const results = await marketIntelligenceService.searchMarketInformation();
      setSearchResults(results);
      setActiveTab('search');
    } catch (err) {
      setError('検索に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const renderOverview = () => (
    <div className={styles.overview}>
      {/* 市場概況 */}
      <div className={styles.marketOverview}>
        <h3>市場概況</h3>
        {realTimeData && (
          <>
            <div className={styles.sentimentIndicator}>
              <div className={styles.sentimentScore}>
                <span className={styles.label}>総合センチメント</span>
                <span
                  className={`${styles.value} ${
                    realTimeData.overallSentiment > 0.2 ? styles.positive :
                    realTimeData.overallSentiment < -0.2 ? styles.negative :
                    styles.neutral
                  }`}
                >
                  {(realTimeData.overallSentiment * 100).toFixed(1)}%
                </span>
                <span className={`${styles.trend} ${styles[realTimeData.sentimentTrend]}`}>
                  {realTimeData.sentimentTrend === 'rising' ? '↗' :
                   realTimeData.sentimentTrend === 'falling' ? '↘' : '→'}
                </span>
              </div>
            </div>

            <div className={styles.insights}>
              <h4>市場インサイト</h4>
              <ul>
                {realTimeData.marketInsights.slice(0, 5).map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      {/* トレンド銘柄 */}
      <div className={styles.trendingStocks}>
        <h3>注目銘柄</h3>
        {realTimeData?.trendingSymbols.length ? (
          <div className={styles.stockGrid}>
            {realTimeData.trendingSymbols.slice(0, 6).map((stock) => (
              <div
                key={stock.symbol}
                className={styles.stockCard}
                onClick={() => onSelectStock?.(stock)}
              >
                <div className={styles.stockSymbol}>{stock.symbol}</div>
                <div className={styles.stockName}>{stock.name}</div>
                <div className={styles.stockMetrics}>
                  <span className={styles.mentions}>
                    {stock.mentionCount} 件
                  </span>
                  <span
                    className={`${styles.sentiment} ${
                      stock.sentiment > 0.2 ? styles.positive :
                      stock.sentiment < -0.2 ? styles.negative :
                      styles.neutral
                    }`}
                  >
                    {(stock.sentiment * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noData}>注目銘柄のデータがありません</p>
        )}
      </div>

      {/* AIレポートサマリー */}
      {marketReport && (
        <div className={styles.aiReportSummary}>
          <h3>AI分析レポート</h3>
          <div className={styles.reportMeta}>
            <span className={styles.title}>{marketReport.title}</span>
            <span className={styles.confidence}>
              信頼度: {(marketReport.confidence * 100).toFixed(0)}%
            </span>
          </div>
          <p className={styles.summary}>
            {marketReport.marketOverview.summary}
          </p>
        </div>
      )}
    </div>
  );

  const renderNews = () => (
    <div className={styles.newsTab}>
      <h3>最新ニュース分析</h3>
      {realTimeData?.topNews.length ? (
        <div className={styles.newsList}>
          {realTimeData.topNews.map((news) => (
            <div key={news.id} className={styles.newsItem}>
              <div className={styles.newsHeader}>
                <h4 className={styles.newsTitle}>{news.title}</h4>
                <div className={styles.newsMeta}>
                  <span className={styles.source}>{news.source}</span>
                  <span className={styles.time}>
                    {new Date(news.publishedAt).toLocaleString()}
                  </span>
                  <span
                    className={`${styles.sentiment} ${
                      news.sentiment > 0.2 ? styles.positive :
                      news.sentiment < -0.2 ? styles.negative :
                      styles.neutral
                    }`}
                  >
                    {(news.sentiment * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <p className={styles.newsContent}>
                {news.content.slice(0, 200)}...
              </p>
              {news.relatedSymbols.length > 0 && (
                <div className={styles.relatedSymbols}>
                  関連銘柄: {news.relatedSymbols.join(', ')}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.noData}>ニュースデータがありません</p>
      )}
    </div>
  );

  const renderSocial = () => (
    <div className={styles.socialTab}>
      <h3>ソーシャルメディア分析</h3>
      <div className={styles.socialMetrics}>
        <div className={styles.metric}>
          <span className={styles.label}>アクティブアラート</span>
          <span className={styles.value}>
            {realTimeData?.activeAlerts.length || 0}
          </span>
        </div>
      </div>

      {realTimeData?.activeAlerts.length ? (
        <div className={styles.alertsList}>
          {realTimeData.activeAlerts.slice(0, 10).map((alert) => (
            <div key={alert.id} className={`${styles.alertItem} ${styles[alert.severity]}`}>
              <div className={styles.alertHeader}>
                <span className={styles.alertType}>{alert.type}</span>
                <span className={styles.alertTime}>
                  {new Date(alert.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <h4 className={styles.alertTitle}>{alert.title}</h4>
              <p className={styles.alertDescription}>{alert.description}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.noData}>アラートはありません</p>
      )}
    </div>
  );

  const renderSearch = () => (
    <div className={styles.searchTab}>
      <div className={styles.searchBox}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="銘柄名、キーワードで検索..."
          className={styles.searchInput}
        />
        <button
          onClick={handleSearch}
          className={styles.searchButton}
          disabled={!searchQuery.trim() || isLoading}
        >
          検索
        </button>
      </div>

      {searchResults && (
        <div className={styles.searchResults}>
          <div className={styles.searchMeta}>
            <span>「{searchResults.query}」の検索結果</span>
            <span>{searchResults.totalCount} 件</span>
          </div>

          <div className={styles.resultsList}>
            {searchResults.results.map((result) => (
              <div key={result.id} className={styles.resultItem}>
                <div className={styles.resultHeader}>
                  <h4 className={styles.resultTitle}>{result.title}</h4>
                  <div className={styles.resultMeta}>
                    <span className={styles.source}>{result.source}</span>
                    <span className={styles.impact}>{result.impact}</span>
                  </div>
                </div>
                <p className={styles.resultContent}>
                  {result.content.slice(0, 150)}...
                </p>
                {result.url && (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.resultLink}
                  >
                    詳細を見る →
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'news': return renderNews();
      case 'social': return renderSocial();
      case 'search': return renderSearch();
      default: return null;
    }
  };

  if (isLoading && !realTimeData) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>市場情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h2>市場インテリジェンス</h2>
        <div className={styles.updateInfo}>
          最終更新: {realTimeData ? new Date(realTimeData.lastUpdated).toLocaleTimeString() : '--:--'}
        </div>
        <button
          onClick={loadMarketIntelligence}
          className={styles.refreshButton}
          disabled={isLoading}
        >
          更新
        </button>
      </header>

      {error && (
        <div className={styles.error}>
          <p>{error}</p>
        </div>
      )}

      <nav className={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>

      <main className={styles.content}>
        {renderTabContent()}
      </main>
    </div>
  );
};
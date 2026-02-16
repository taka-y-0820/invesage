import "./App.css";
import { useEffect, useState } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { Layout } from "./components/Layout";
import { TabNavigation, TabId } from "./components/TabNavigation";
import { CompanyInfo } from "./components/CompanyInfo";
import { StockDetailPanel } from "./components/StockDetailPanel";
import { Dashboard } from "./components/Dashboard";
import { Watchlist } from "./components/Watchlist";
import { IRPanel } from "./components/IRPanel";
import { SectorHeatmap } from "./components/SectorHeatmap";
import { PortfolioPanel } from "./components/PortfolioPanel";
import { EarningsCalendar } from "./components/EarningsCalendar";
import { MarketIntelligence } from "./components/MarketIntelligence";
import { ApiKeySetup } from "./components/ApiKeySetup";
import { useJapanSurgeMonitor } from "./hooks/useJapanSurgeMonitor";
import { useStockStore } from "./store/useStockStore";
import { useApiKeyStore } from "./store/useApiKeyStore";

function App() {
  const activeTab = useStockStore((state) => state.activeTab);
  const setActiveTab = useStockStore((state) => state.setActiveTab);
  const openDetailPanel = useStockStore((state) => state.openDetailPanel);
  const { finnhubApiKey, isConfigured, checkConfiguration } = useApiKeyStore();
  const [showApiKeySetup, setShowApiKeySetup] = useState(!isConfigured);

  useEffect(() => {
    checkConfiguration();
  }, [checkConfiguration]);

  const { surgeStocks, isMonitoring, error } = useJapanSurgeMonitor(finnhubApiKey, {
    enabled: isConfigured,
    interval: 60000,
    threshold: 3,
  });

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
  };

  const handleStockSelect = (stock: { symbol: string; name: string; currentPrice?: number; changePercent?: number }) => {
    openDetailPanel({
      symbol: stock.symbol,
      name: stock.name,
      price: stock.currentPrice,
      changePercent: stock.changePercent,
    });
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <Dashboard
            surgeStocks={surgeStocks}
            isMonitoring={isMonitoring}
            onSelectStock={handleStockSelect}
          />
        );

      case "sector":
        return <SectorHeatmap onSelectStock={handleStockSelect} />;

      case "analysis":
        return (
          <section className="card">
            <CompanyInfo />
          </section>
        );

      case "intelligence":
        return <MarketIntelligence onSelectStock={handleStockSelect} />;

      case "ir":
        return (
          <section className="card">
            <IRPanel />
          </section>
        );

      case "earnings":
        return (
          <section className="card">
            <EarningsCalendar />
          </section>
        );

      case "portfolio":
        return <PortfolioPanel />;

      case "watchlist":
        return <Watchlist onSelectStock={handleStockSelect} />;

      default:
        return null;
    }
  };

  // Full-bleed tabs render without Layout wrapper (no sidebar needed)
  const isFullBleed = activeTab === "dashboard" || activeTab === "sector" || activeTab === "watchlist" || activeTab === "portfolio" || activeTab === "intelligence";

  // APIキー設定画面を表示
  if (showApiKeySetup) {
    return (
      <ApiKeySetup
        onComplete={() => {
          checkConfiguration();
          setShowApiKeySetup(false);
        }}
        isModal={false}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--color-cream)",
      }}
    >
      <Header
        alertCount={surgeStocks.length}
        onApiKeyClick={() => setShowApiKeySetup(true)}
      />

      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      {isFullBleed ? (
        <div className="tab-content-enter" key={activeTab} style={{ flex: 1, padding: "var(--space-6)" }}>
          {renderTabContent()}
        </div>
      ) : (
        <Layout
          isMonitoring={isMonitoring}
          error={error}
          apiKey={apiKey}
        >
          <div className="tab-content-enter" key={activeTab}>
            {renderTabContent()}
          </div>
        </Layout>
      )}

      {!isFullBleed && <Footer />}

      {/* Stock Detail Slide-over Panel */}
      <StockDetailPanel />
    </div>
  );
}

export default App;

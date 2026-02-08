import "./App.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { Layout } from "./components/Layout";
import { TabNavigation, TabId } from "./components/TabNavigation";
import ChartView from "./components/ChartView";
import { CompanyInfo } from "./components/CompanyInfo";
import { StockAnalysis } from "./components/StockAnalysis/StockAnalysis";
import { SurgeStockList } from "./components/SurgeStockList";
import { SurgeAlertPanel } from "./components/SurgeAlertPanel";
import { StockDetailPanel } from "./components/StockDetailPanel";
import { Dashboard } from "./components/Dashboard";
import { Watchlist } from "./components/Watchlist";
import { IRPanel } from "./components/IRPanel";
import { useJapanSurgeMonitor } from "./hooks/useJapanSurgeMonitor";
import { useStockStore } from "./store/useStockStore";

function App() {
  const apiKey = import.meta.env.VITE_FINNHUB_API_KEY || "";
  const activeTab = useStockStore((state) => state.activeTab);
  const setActiveTab = useStockStore((state) => state.setActiveTab);
  const watchlist = useStockStore((state) => state.watchlist);
  const openDetailPanel = useStockStore((state) => state.openDetailPanel);

  const { surgeStocks, isMonitoring, error } = useJapanSurgeMonitor(apiKey, {
    enabled: !!apiKey,
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

      case "screener":
        return (
          <section className="card">
            <ChartView symbol="NVDA" />
          </section>
        );

      case "analysis":
        return (
          <>
            <section
              className="card"
              style={{ marginBottom: "var(--space-6)" }}
            >
              <StockAnalysis />
            </section>
            <section className="card">
              <CompanyInfo />
            </section>
          </>
        );

      case "ir":
        return (
          <section className="card">
            <IRPanel />
          </section>
        );

      case "alerts":
        return (
          <section>
            <SurgeAlertPanel
              watchlistSymbols={watchlist}
              enableAI={true}
            />
          </section>
        );

      case "watchlist":
        return <Watchlist onSelectStock={handleStockSelect} />;

      default:
        return null;
    }
  };

  // Full-bleed tabs render without Layout wrapper
  const isFullBleed = activeTab === "dashboard" || activeTab === "watchlist";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: isFullBleed ? "#0a0f14" : "var(--color-cream)",
      }}
    >
      <Header alertCount={surgeStocks.length} />

      <TabNavigation
        activeTab={activeTab}
        onTabChange={handleTabChange}
        alertCount={surgeStocks.length}
      />

      {isFullBleed ? (
        <div className="tab-content-enter" key={activeTab} style={{ flex: 1 }}>
          {renderTabContent()}
        </div>
      ) : (
        <Layout
          showSidebar={activeTab !== "alerts"}
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

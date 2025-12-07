import ChartView from "./components/ChartView";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { CompanyInfo } from "./components/CompanyInfo";

function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "Arial, sans-serif",
        backgroundColor: "#f8f9fa",
      }}
    >
      <Header />

      <main
        style={{
          flex: 1,
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "32px 24px",
          width: "100%",
        }}
      >
        {/* 企業情報・セクター・注目度テストコンポーネント */}
        <CompanyInfo />

        <div
          style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            marginTop: "24px",
          }}
        >
          <ChartView symbol="NVDA" />
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default App;

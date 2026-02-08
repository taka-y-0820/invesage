import React, { useState, useEffect } from "react";
import icon from "../assets/invesage-icon.png";
import { useStockStore } from "../store/useStockStore";
import { useMarketDataUpdater } from "../hooks/useStockData";

const Header: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const marketData = useStockStore((state) => state.marketData);

  // 市場データの自動更新を無効化（レート制限対策）
  // 必要に応じて手動更新
  const { refetch: refetchMarketData } = useMarketDataUpdater(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // アニメーション用のキーフレーム
  const pulseAnimation = `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes slideIn {
      from { transform: translateY(-10px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-5px); }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(52, 152, 219, 0.3); }
      50% { box-shadow: 0 0 30px rgba(52, 152, 219, 0.6); }
    }
  `;

  return (
    <>
      <style>{pulseAnimation}</style>
      <header
        style={{
          background: scrolled
            ? "rgba(15, 23, 42, 0.95)"
            : "linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.95) 50%, rgba(51, 65, 85, 0.92) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(148, 163, 184, 0.1)",
          color: "white",
          padding: "12px 0",
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: scrolled
            ? "0 8px 32px rgba(0, 0, 0, 0.3)"
            : "0 4px 24px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            padding: "0 24px",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: "32px",
          }}
        >
          {/* ロゴセクション */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              animation: "slideIn 0.6s ease-out",
            }}
          >
            {/* ここにアイコンを表示 */}
            <img
              src={icon}
              width={48}
              height={48}
              style={{ borderRadius: "8px" }}
            />
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: "28px",
                  fontWeight: "700",
                  background:
                    "linear-gradient(135deg, #ffffff 0%, #e2e8f0 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Invesage
              </h1>
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  opacity: 0.7,
                  color: "#94a3b8",
                  fontWeight: "400",
                }}
              >
                Next-Gen AI Investment Platform
              </p>
            </div>
          </div>

          {/* 市場データ - レート制限により初期値のみ表示 */}
          <div
            style={{
              display: "flex",
              gap: "16px",
              alignItems: "center",
              justifyContent: "center",
              animation: "slideIn 0.8s ease-out 0.2s both",
            }}
          >
            <button
              onClick={() => refetchMarketData()}
              style={{
                padding: "6px 12px",
                background: "rgba(59, 130, 246, 0.2)",
                border: "1px solid rgba(59, 130, 246, 0.3)",
                borderRadius: "6px",
                color: "white",
                fontSize: "12px",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.2)";
              }}
            >
              🔄 市場更新
            </button>
            {Object.entries(marketData).map(([key, data], index) => (
              <div
                key={key}
                style={{
                  padding: "8px 16px",
                  background: "rgba(255, 255, 255, 0.05)",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backdropFilter: "blur(10px)",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  animation: `slideIn 0.6s ease-out ${0.1 * index}s both`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    fontSize: "12px",
                    opacity: 0.7,
                    textTransform: "uppercase",
                  }}
                >
                  {key === "nikkei" ? "日経225" : key.toUpperCase()}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  <span>
                    {data.value > 0 ? data.value.toLocaleString() : "--"}
                  </span>
                  <span
                    style={{
                      color: data.trend === "up" ? "#10b981" : "#ef4444",
                      fontSize: "12px",
                    }}
                  >
                    {data.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 下部のグラデーションライン */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "2px",
            background:
              "linear-gradient(90deg, transparent 0%, #3b82f6 20%, #8b5cf6 50%, #3b82f6 80%, transparent 100%)",
            animation: "pulse 3s ease-in-out infinite",
          }}
        />
      </header>

      {/* スクロール用の余白 */}
      <div style={{ height: "80px" }} />
    </>
  );
};

export default Header;

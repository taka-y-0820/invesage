import { useSurgeDetector } from "../hooks/useSurgeDetector";

interface SurgeAlertPanelProps {
  watchlistSymbols: string[];
  enableAI?: boolean;
}

export function SurgeAlertPanel({
  watchlistSymbols,
  enableAI = true,
}: SurgeAlertPanelProps) {
  const { alerts, isConnected, error, dismissAlert } = useSurgeDetector({
    symbols: watchlistSymbols,
    surgeThreshold: 3,
    enableAIAnalysis: enableAI,
  });

  return (
    <div
      className="card"
      style={{
        padding: "var(--space-5)",
        marginBottom: "var(--space-6)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--space-5)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <div
            style={{
              width: "36px",
              height: "36px",
              background: "linear-gradient(135deg, var(--color-teal-600), var(--color-teal-700))",
              borderRadius: "var(--radius-md)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-white)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h2
            style={{
              margin: 0,
              fontFamily: "var(--font-display)",
              fontSize: "var(--text-xl)",
              fontWeight: "var(--font-semibold)",
              color: "var(--color-gray-900)",
            }}
          >
            Real-time Alerts
          </h2>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            padding: "var(--space-2) var(--space-3)",
            borderRadius: "var(--radius-md)",
            background: isConnected ? "var(--color-bullish-light)" : "var(--color-bearish-light)",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "var(--radius-full)",
              backgroundColor: isConnected ? "var(--color-bullish)" : "var(--color-bearish)",
              animation: isConnected ? "pulseDot 1.5s var(--ease-in-out) infinite" : "none",
            }}
          />
          <span
            style={{
              fontSize: "var(--text-xs)",
              fontWeight: "var(--font-medium)",
              color: isConnected ? "var(--color-bullish-dark)" : "var(--color-bearish-dark)",
            }}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: "var(--space-4)",
            marginBottom: "var(--space-4)",
            background: "var(--color-bearish-light)",
            border: "1px solid var(--color-bearish)",
            borderRadius: "var(--radius-md)",
            color: "var(--color-bearish-dark)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {alerts.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "var(--space-12) var(--space-6)",
            color: "var(--color-gray-400)",
          }}
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ marginBottom: "var(--space-3)" }}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <p style={{ fontSize: "var(--text-lg)", margin: "0 0 var(--space-2) 0" }}>
            Monitoring for price surges...
          </p>
          <p style={{ fontSize: "var(--text-sm)", margin: 0, color: "var(--color-gray-400)" }}>
            Watching: {watchlistSymbols.join(", ")}
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {alerts.map((alert) => (
            <SurgeAlertCard
              key={alert.id}
              alert={alert}
              onDismiss={() => dismissAlert(alert.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface SurgeAlertCardProps {
  alert: {
    symbol: string;
    changePercent: number;
    direction: "up" | "down";
    timestamp: Date;
    reason?: string;
    sentiment?: "positive" | "negative" | "neutral";
    confidence?: number;
    keyFactors?: string[];
    newsArticles?: Array<{ headline: string; source: string; url: string }>;
    isAnalyzing?: boolean;
  };
  onDismiss: () => void;
}

function SurgeAlertCard({ alert, onDismiss }: SurgeAlertCardProps) {
  const isPositive = alert.changePercent > 0;

  return (
    <div
      style={{
        backgroundColor: isPositive ? "var(--color-bullish-light)" : "var(--color-bearish-light)",
        border: `2px solid ${isPositive ? "var(--color-bullish)" : "var(--color-bearish)"}`,
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-5)",
        position: "relative",
        animation: "fadeInUp 0.3s var(--ease-out)",
      }}
    >
      {/* Close Button */}
      <button
        onClick={onDismiss}
        style={{
          position: "absolute",
          top: "var(--space-3)",
          right: "var(--space-3)",
          background: "transparent",
          border: "none",
          fontSize: "var(--text-lg)",
          cursor: "pointer",
          opacity: 0.6,
          transition: "opacity var(--transition-fast)",
          color: isPositive ? "var(--color-bullish-dark)" : "var(--color-bearish-dark)",
          padding: "var(--space-1)",
          borderRadius: "var(--radius-sm)",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.6")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Header */}
      <div style={{ marginBottom: "var(--space-4)" }}>
        <h3
          style={{
            margin: 0,
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-2xl)",
            fontWeight: "var(--font-bold)",
            color: isPositive ? "var(--color-bullish-dark)" : "var(--color-bearish-dark)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          {isPositive ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 4l-8 8h6v8h4v-8h6z" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 20l8-8h-6V4h-4v8H4z" />
            </svg>
          )}
          {alert.symbol} {isPositive ? "+" : ""}
          {alert.changePercent.toFixed(2)}%
        </h3>
        <p
          style={{
            margin: "var(--space-1) 0 0 0",
            fontSize: "var(--text-xs)",
            fontFamily: "var(--font-mono)",
            color: "var(--color-gray-600)",
          }}
        >
          {alert.timestamp.toLocaleTimeString("ja-JP")}
        </p>
      </div>

      {/* AI Analysis */}
      {alert.isAnalyzing ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-4)",
            backgroundColor: "rgba(255,255,255,0.6)",
            borderRadius: "var(--radius-md)",
          }}
        >
          <div className="spinner spinner-sm" />
          <span style={{ color: "var(--color-gray-600)", fontSize: "var(--text-sm)" }}>
            AI analyzing...
          </span>
        </div>
      ) : alert.reason ? (
        <div>
          <div
            style={{
              padding: "var(--space-4)",
              backgroundColor: "rgba(255,255,255,0.7)",
              borderRadius: "var(--radius-md)",
              marginBottom: "var(--space-3)",
            }}
          >
            <p
              style={{
                margin: "0 0 var(--space-2) 0",
                fontWeight: "var(--font-semibold)",
                fontSize: "var(--text-sm)",
                color: isPositive ? "var(--color-bullish-dark)" : "var(--color-bearish-dark)",
              }}
            >
              Reason:
            </p>
            <p style={{ margin: 0, lineHeight: "var(--leading-relaxed)", fontSize: "var(--text-sm)" }}>
              {alert.reason}
            </p>
            {alert.confidence !== undefined && (
              <p
                style={{
                  margin: "var(--space-2) 0 0 0",
                  fontSize: "var(--text-xs)",
                  color: "var(--color-gray-600)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Confidence: {alert.confidence}%
              </p>
            )}
          </div>

          {/* Key Factors */}
          {alert.keyFactors && alert.keyFactors.length > 0 && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <p
                style={{
                  margin: "0 0 var(--space-2) 0",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-semibold)",
                }}
              >
                Key Factors:
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: "var(--space-5)",
                  fontSize: "var(--text-sm)",
                }}
              >
                {alert.keyFactors.map((factor, i) => (
                  <li key={i} style={{ marginBottom: "var(--space-1)" }}>{factor}</li>
                ))}
              </ul>
            </div>
          )}

          {/* News */}
          {alert.newsArticles && alert.newsArticles.length > 0 && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <p
                style={{
                  margin: "0 0 var(--space-2) 0",
                  fontSize: "var(--text-sm)",
                  fontWeight: "var(--font-semibold)",
                }}
              >
                Related News:
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {alert.newsArticles.map((article, i) => (
                  <a
                    key={i}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "block",
                      padding: "var(--space-3)",
                      backgroundColor: "rgba(255,255,255,0.8)",
                      borderRadius: "var(--radius-md)",
                      textDecoration: "none",
                      color: "var(--color-gray-900)",
                      fontSize: "var(--text-sm)",
                      transition: "background-color var(--transition-fast)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "rgba(255,255,255,1)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.8)")
                    }
                  >
                    <strong style={{ color: "var(--color-gray-500)", fontSize: "var(--text-xs)" }}>
                      {article.source}:
                    </strong>{" "}
                    {article.headline}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

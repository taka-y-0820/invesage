import React from "react";

const Footer: React.FC = () => {
  return (
    <footer
      style={{
        backgroundColor: "var(--color-teal-900)",
        color: "var(--color-white)",
        padding: "var(--space-8) var(--space-6)",
        marginTop: "auto",
      }}
    >
      <div
        style={{
          maxWidth: "var(--max-width-2xl)",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--space-8)",
            marginBottom: "var(--space-6)",
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                marginBottom: "var(--space-4)",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
                  borderRadius: "var(--radius-md)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M3 3v18h18" />
                  <path d="M18 17V9M13 17V5M8 17v-3" />
                </svg>
              </div>
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-xl)",
                  fontWeight: "var(--font-semibold)",
                }}
              >
                Invesage
              </span>
            </div>
            <p
              style={{
                fontSize: "var(--text-sm)",
                opacity: 0.8,
                lineHeight: "var(--leading-relaxed)",
                margin: 0,
              }}
            >
              AI-powered investment platform combining technical and fundamental
              analysis for smarter decisions.
            </p>
          </div>

          {/* Features */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-primary)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-semibold)",
                color: "var(--color-gold)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wider)",
                marginBottom: "var(--space-4)",
              }}
            >
              Features
            </h4>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              {["Technical Screening", "Volume Detection", "AI Analysis", "Real-time Alerts"].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      style={{
                        color: "var(--color-white)",
                        opacity: 0.8,
                        textDecoration: "none",
                        fontSize: "var(--text-sm)",
                        transition: "opacity var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-primary)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-semibold)",
                color: "var(--color-gold)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wider)",
                marginBottom: "var(--space-4)",
              }}
            >
              Support
            </h4>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              {["Help Center", "API Docs", "Terms of Service", "Privacy Policy"].map(
                (item) => (
                  <li key={item}>
                    <a
                      href="#"
                      style={{
                        color: "var(--color-white)",
                        opacity: 0.8,
                        textDecoration: "none",
                        fontSize: "var(--text-sm)",
                        transition: "opacity var(--transition-fast)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.8")}
                    >
                      {item}
                    </a>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4
              style={{
                fontFamily: "var(--font-primary)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--font-semibold)",
                color: "var(--color-gold)",
                textTransform: "uppercase",
                letterSpacing: "var(--tracking-wider)",
                marginBottom: "var(--space-4)",
              }}
            >
              Contact
            </h4>
            <div
              style={{
                fontSize: "var(--text-sm)",
                opacity: 0.8,
                display: "flex",
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <p style={{ margin: 0 }}>support@invesage.com</p>
              <div
                style={{
                  display: "flex",
                  gap: "var(--space-4)",
                  marginTop: "var(--space-3)",
                }}
              >
                {["Twitter", "LinkedIn", "GitHub"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    style={{
                      color: "var(--color-gold)",
                      textDecoration: "none",
                      fontSize: "var(--text-sm)",
                      transition: "color var(--transition-fast)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = "var(--color-gold-light)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--color-gold)")
                    }
                  >
                    {social}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
            paddingTop: "var(--space-4)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-4)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-xs)",
              opacity: 0.6,
            }}
          >
            &copy; 2025 Invesage. All rights reserved.
          </p>
          <div
            style={{
              display: "flex",
              gap: "var(--space-6)",
              fontSize: "var(--text-xs)",
              opacity: 0.6,
            }}
          >
            <span>Smart Screening</span>
            <span>Predictive Analytics</span>
            <span>AI Engine</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

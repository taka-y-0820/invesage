import React from "react";
import styles from "./TabNavigation.module.css";

export type TabId = "dashboard" | "sector" | "analysis" | "intelligence" | "ir" | "earnings" | "portfolio" | "watchlist";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

interface TabNavigationProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: Tab[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    id: "sector",
    label: "セクター",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "analysis",
    label: "Analysis",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
        <path d="M20 12a8 8 0 0 0-8-8v8h8z" />
      </svg>
    ),
  },
  {
    id: "intelligence",
    label: "市場情報",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 12l2 2 4-4" />
        <circle cx="12" cy="12" r="9" />
        <path d="M21 12c0-1.39-.35-2.69-.99-3.83l-3.83 3.83a3 3 0 0 1-4.24 0L8.81 8.17A9 9 0 0 0 12 21c1.39 0 2.69-.35 3.83-.99" />
      </svg>
    ),
  },
  {
    id: "ir",
    label: "IR情報",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: "earnings",
    label: "決算カレンダー",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: "portfolio",
    label: "損益管理",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    id: "watchlist",
    label: "Watchlist",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className={styles.tabNavigation}>
      <div className={styles.tabContainer}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ""}`}
            onClick={() => onTabChange(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            <span className={styles.tabIcon}>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default TabNavigation;

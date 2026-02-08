import React, { ReactNode } from "react";
import styles from "./MetricCard.module.css";

type MetricColor = "default" | "teal" | "gold" | "bullish" | "bearish" | "blue";
type MetricSize = "default" | "small" | "large";

interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  badge?: string;
  subtext?: string;
  change?: number;
  showChangeIcon?: boolean;
  color?: MetricColor;
  valueColor?: MetricColor | "bullish" | "bearish";
  size?: MetricSize;
  compact?: boolean;
  dark?: boolean;
  loading?: boolean;
  sparkline?: ReactNode;
  className?: string;
  onClick?: () => void;
}

// Inline SVG icons
const ChangeIcons = {
  up: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18,15 12,9 6,15" />
    </svg>
  ),
  down: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  ),
};

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  icon,
  badge,
  subtext,
  change,
  showChangeIcon = true,
  color = "default",
  valueColor,
  size = "default",
  compact = false,
  dark = false,
  loading = false,
  sparkline,
  className = "",
  onClick,
}) => {
  const colorClass = {
    default: "",
    teal: styles.metricCardTeal,
    gold: styles.metricCardGold,
    bullish: styles.metricCardBullish,
    bearish: styles.metricCardBearish,
    blue: styles.metricCardBlue,
  }[color];

  const valueColorClass = valueColor
    ? {
        default: "",
        teal: styles.metricValueTeal,
        gold: styles.metricValueGold,
        bullish: styles.metricValueBullish,
        bearish: styles.metricValueBearish,
        blue: styles.metricValueTeal,
      }[valueColor]
    : "";

  const sizeClass = {
    default: "",
    small: styles.metricValueSmall,
    large: styles.metricValueLarge,
  }[size];

  const classes = [
    styles.metricCard,
    colorClass,
    dark && styles.metricCardDark,
    compact && styles.metricCardCompact,
    loading && styles.metricLoading,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (loading) {
    return (
      <div className={classes}>
        <div className={styles.metricHeader}>
          <div className={`${styles.metricSkeleton} ${styles.skeletonLabel}`} style={{ width: 32, height: 32, borderRadius: 8 }} />
        </div>
        <div className={`${styles.metricSkeleton} ${styles.skeletonLabel}`} style={{ marginBottom: 8 }} />
        <div className={`${styles.metricSkeleton} ${styles.skeletonValue}`} />
      </div>
    );
  }

  const formatChange = (val: number) => {
    const sign = val >= 0 ? "+" : "";
    return `${sign}${val.toFixed(2)}%`;
  };

  return (
    <div className={classes} onClick={onClick} style={onClick ? { cursor: "pointer" } : undefined}>
      <div className={styles.metricHeader}>
        {icon && <div className={styles.metricIcon}>{icon}</div>}
        {badge && <span className={styles.metricBadge}>{badge}</span>}
      </div>

      <div className={styles.metricLabel}>{label}</div>

      <div className={`${styles.metricValue} ${sizeClass} ${valueColorClass}`}>
        {value}
      </div>

      {change !== undefined && (
        <div
          className={`${styles.metricChange} ${
            change >= 0 ? styles.metricChangePositive : styles.metricChangeNegative
          }`}
        >
          {showChangeIcon && (
            <span className={styles.metricChangeIcon}>
              {change >= 0 ? ChangeIcons.up : ChangeIcons.down}
            </span>
          )}
          {formatChange(change)}
        </div>
      )}

      {subtext && <div className={styles.metricSubtext}>{subtext}</div>}

      {sparkline && <div className={styles.metricSparkline}>{sparkline}</div>}
    </div>
  );
};

export default MetricCard;

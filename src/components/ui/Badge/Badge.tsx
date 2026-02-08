import React, { ReactNode } from "react";
import styles from "./Badge.module.css";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "danger"
  | "warning"
  | "info"
  | "bullish"
  | "bearish";

type BadgeSize = "small" | "default" | "large";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  solid?: boolean;
  outlined?: boolean;
  pill?: boolean;
  dot?: boolean;
  pulse?: boolean;
  dark?: boolean;
  icon?: ReactNode;
  className?: string;
}

interface CountBadgeProps {
  count: number;
  variant?: BadgeVariant;
  size?: "default" | "large";
  solid?: boolean;
  dark?: boolean;
  max?: number;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "default",
  solid = false,
  outlined = false,
  pill = false,
  dot = false,
  pulse = false,
  dark = false,
  icon,
  className = "",
}) => {
  const variantClass = {
    default: "",
    primary: styles.badgePrimary,
    success: styles.badgeSuccess,
    danger: styles.badgeDanger,
    warning: styles.badgeWarning,
    info: styles.badgeInfo,
    bullish: styles.badgeBullish,
    bearish: styles.badgeBearish,
  }[variant];

  const sizeClass = {
    small: styles.badgeSmall,
    default: "",
    large: styles.badgeLarge,
  }[size];

  const classes = [
    styles.badge,
    variantClass,
    sizeClass,
    solid && styles.badgeSolid,
    outlined && styles.badgeOutlined,
    pill && styles.badgePill,
    dot && styles.badgeDot,
    pulse && styles.badgePulse,
    dark && styles.badgeDark,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes}>
      {icon && <span className={styles.badgeIcon}>{icon}</span>}
      {children}
    </span>
  );
};

export const CountBadge: React.FC<CountBadgeProps> = ({
  count,
  variant = "danger",
  size = "default",
  solid = true,
  dark = false,
  max = 99,
  className = "",
}) => {
  const variantClass = {
    default: "",
    primary: styles.badgePrimary,
    success: styles.badgeSuccess,
    danger: styles.badgeDanger,
    warning: styles.badgeWarning,
    info: styles.badgeInfo,
    bullish: styles.badgeBullish,
    bearish: styles.badgeBearish,
  }[variant];

  const sizeClass = size === "large" ? styles.badgeLarge : "";

  const classes = [
    styles.badge,
    styles.badgeCount,
    variantClass,
    sizeClass,
    solid && styles.badgeSolid,
    dark && styles.badgeDark,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const displayCount = count > max ? `${max}+` : count.toString();

  return <span className={classes}>{displayCount}</span>;
};

export default Badge;

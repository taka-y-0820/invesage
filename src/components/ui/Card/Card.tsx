import React, { ReactNode } from "react";
import styles from "./Card.module.css";

type CardVariant = "default" | "elevated" | "flat" | "outlined" | "dark";
type CardSize = "default" | "compact" | "spacious";
type CardAccent = "none" | "left" | "top";
type AccentColor = "default" | "bullish" | "bearish" | "warning";

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  size?: CardSize;
  accent?: CardAccent;
  accentColor?: AccentColor;
  clickable?: boolean;
  className?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

interface CardFooterProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  size = "default",
  accent = "none",
  accentColor = "default",
  clickable = false,
  className = "",
  onClick,
  style,
}) => {
  const variantClass = {
    default: "",
    elevated: styles.cardElevated,
    flat: styles.cardFlat,
    outlined: styles.cardOutlined,
    dark: styles.cardDark,
  }[variant];

  const sizeClass = {
    default: "",
    compact: styles.cardCompact,
    spacious: styles.cardSpacious,
  }[size];

  const accentClass = {
    none: "",
    left: styles.cardAccentLeft,
    top: styles.cardAccentTop,
  }[accent];

  const accentColorClass = {
    default: "",
    bullish: styles.cardAccentBullish,
    bearish: styles.cardAccentBearish,
    warning: styles.cardAccentWarning,
  }[accentColor];

  const classes = [
    styles.card,
    variantClass,
    sizeClass,
    accentClass,
    accentColorClass,
    clickable && styles.cardClickable,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} onClick={onClick} style={style}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  subtitle,
  actions,
  className = "",
}) => {
  return (
    <div className={`${styles.cardHeader} ${className}`}>
      <div>
        <h3 className={styles.cardTitle}>{title}</h3>
        {subtitle && <p className={styles.cardSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.cardActions}>{actions}</div>}
    </div>
  );
};

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = "",
}) => {
  return <div className={`${styles.cardFooter} ${className}`}>{children}</div>;
};

export default Card;

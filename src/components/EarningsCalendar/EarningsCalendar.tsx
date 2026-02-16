import React, { useState, useCallback, useEffect, useMemo } from "react";
import { EarningsCalendarEvent } from "../../types";
import {
  fetchEarningsCalendar,
  getMonthRange,
  getEarningsHourLabel,
} from "../../services/earnings/earningsCalendarService";
import { useStockStore } from "../../store/useStockStore";
import styles from "./EarningsCalendar.module.css";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: EarningsCalendarEvent[];
}

export const EarningsCalendar: React.FC = () => {
  const watchlist = useStockStore((state) => state.watchlist);

  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [events, setEvents] = useState<EarningsCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [watchlistOnly, setWatchlistOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getMonthRange(currentYear, currentMonth);
      const data = await fetchEarningsCalendar(from, to);
      setEvents(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "決算カレンダーの取得に失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }, [currentYear, currentMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEvents = useMemo(() => {
    if (!watchlistOnly) return events;
    const watchlistSet = new Set(
      watchlist.map((s) => s.replace(".T", "").toUpperCase())
    );
    return events.filter((e) =>
      watchlistSet.has(e.symbol.replace(".T", "").toUpperCase())
    );
  }, [events, watchlist, watchlistOnly]);

  // Build calendar grid
  const calendarDays = useMemo((): CalendarDay[] => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const startDay = firstDayOfMonth.getDay(); // 0=Sun
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const today = new Date();

    // Events grouped by date
    const eventsByDate = new Map<string, EarningsCalendarEvent[]>();
    for (const event of filteredEvents) {
      const existing = eventsByDate.get(event.date) || [];
      existing.push(event);
      eventsByDate.set(event.date, existing);
    }

    const days: CalendarDay[] = [];

    // Previous month padding
    const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const date = new Date(currentYear, currentMonth - 1, d);
      const dateStr = formatDateKey(date);
      days.push({
        date,
        day: d,
        isCurrentMonth: false,
        isToday: false,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(currentYear, currentMonth, d);
      const dateStr = formatDateKey(date);
      const isToday =
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear();
      days.push({
        date,
        day: d,
        isCurrentMonth: true,
        isToday,
        events: eventsByDate.get(dateStr) || [],
      });
    }

    // Next month padding (fill to complete the grid)
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let d = 1; d <= remaining; d++) {
        const date = new Date(currentYear, currentMonth + 1, d);
        const dateStr = formatDateKey(date);
        days.push({
          date,
          day: d,
          isCurrentMonth: false,
          isToday: false,
          events: eventsByDate.get(dateStr) || [],
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, filteredEvents]);

  // Events for selected date or upcoming events
  const selectedEvents = useMemo(() => {
    if (selectedDate) {
      return filteredEvents
        .filter((e) => e.date === selectedDate)
        .sort((a, b) => a.symbol.localeCompare(b.symbol));
    }
    // Default: show upcoming events (today + future)
    const todayStr = formatDateKey(new Date());
    return filteredEvents
      .filter((e) => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.symbol.localeCompare(b.symbol))
      .slice(0, 20);
  }, [filteredEvents, selectedDate]);

  // Summary stats
  const summary = useMemo(() => {
    const todayStr = formatDateKey(new Date());
    const upcoming = filteredEvents.filter((e) => e.date >= todayStr).length;
    const reported = filteredEvents.filter(
      (e) => e.actual !== undefined
    ).length;
    return { total: filteredEvents.length, upcoming, reported };
  }, [filteredEvents]);

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(11);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(0);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
    setSelectedDate(null);
  };

  const handleDayClick = (day: CalendarDay) => {
    if (!day.isCurrentMonth || day.events.length === 0) return;
    const dateStr = formatDateKey(day.date);
    setSelectedDate((prev) => (prev === dateStr ? null : dateStr));
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <h2 className={styles.headerTitle}>決算カレンダー</h2>
            <p className={styles.headerSubtitle}>
              企業の決算発表日を一覧表示
            </p>
          </div>
        </div>

        <div className={styles.filterSection}>
          <span className={styles.filterLabel}>表示:</span>
          <button
            className={`${styles.filterToggle} ${!watchlistOnly ? styles.filterToggleActive : ""}`}
            onClick={() => setWatchlistOnly(false)}
          >
            全銘柄
          </button>
          <button
            className={`${styles.filterToggle} ${watchlistOnly ? styles.filterToggleActive : ""}`}
            onClick={() => setWatchlistOnly(true)}
          >
            ウォッチリスト
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryDot} ${styles.summaryDotTotal}`} />
          <span className={styles.summaryLabel}>今月の決算</span>
          <span className={styles.summaryValue}>{summary.total}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryDot} ${styles.summaryDotUpcoming}`} />
          <span className={styles.summaryLabel}>今後の予定</span>
          <span className={styles.summaryValue}>{summary.upcoming}</span>
        </div>
        <div className={styles.summaryItem}>
          <span className={`${styles.summaryDot} ${styles.summaryDotReported}`} />
          <span className={styles.summaryLabel}>発表済み</span>
          <span className={styles.summaryValue}>{summary.reported}</span>
        </div>
      </div>

      {/* Month Navigation */}
      <div className={styles.monthNav}>
        <button
          className={styles.monthNavButton}
          onClick={goToPrevMonth}
          aria-label="前月"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className={styles.monthLabel}>
          {currentYear}年 {currentMonth + 1}月
        </span>
        <button
          className={styles.monthNavButton}
          onClick={goToNextMonth}
          aria-label="次月"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        <button className={styles.todayButton} onClick={goToToday}>
          今日
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className={styles.loading}>
          <div className={styles.loadingSpinner} />
          <span className={styles.loadingText}>決算カレンダーを取得中...</span>
        </div>
      )}

      {/* Error */}
      {error && <div className={styles.error}>{error}</div>}

      {/* Calendar Grid */}
      {!loading && (
        <div className={styles.calendarGrid}>
          <div className={styles.weekdayHeader}>
            {WEEKDAYS.map((day) => (
              <div key={day} className={styles.weekdayCell}>
                {day}
              </div>
            ))}
          </div>
          <div className={styles.daysGrid}>
            {calendarDays.map((day, idx) => {
              const dayOfWeek = day.date.getDay();
              const dateStr = formatDateKey(day.date);
              const isSelected = selectedDate === dateStr;
              return (
                <div
                  key={idx}
                  className={[
                    styles.dayCell,
                    !day.isCurrentMonth ? styles.dayCellOutside : "",
                    day.isToday ? styles.dayCellToday : "",
                    day.events.length > 0 ? styles.dayCellHasEvents : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() => handleDayClick(day)}
                  style={
                    isSelected
                      ? { outline: "2px solid var(--color-teal-500)", outlineOffset: "-2px" }
                      : undefined
                  }
                >
                  <div className={styles.dayNumber}>
                    {day.isToday ? (
                      <span className={styles.dayNumberToday}>{day.day}</span>
                    ) : (
                      <span
                        className={
                          dayOfWeek === 0
                            ? styles.dayNumberSunday
                            : dayOfWeek === 6
                            ? styles.dayNumberSaturday
                            : undefined
                        }
                      >
                        {day.day}
                      </span>
                    )}
                  </div>
                  {day.isCurrentMonth && day.events.length > 0 && (
                    <div className={styles.eventChips}>
                      {day.events.slice(0, 3).map((event, i) => (
                        <div
                          key={i}
                          className={`${styles.eventChip} ${getEventChipStyle(event)}`}
                          title={`${event.symbol} ${event.fiscalPeriod}`}
                        >
                          {event.symbol}
                        </div>
                      ))}
                      {day.events.length > 3 && (
                        <div className={`${styles.eventChip} ${styles.eventChipMore}`}>
                          +{day.events.length - 3}件
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Events List */}
      {!loading && selectedEvents.length > 0 && (
        <div className={styles.eventsSection}>
          <div className={styles.eventsSectionHeader}>
            <svg
              className={styles.eventsSectionIcon}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <h3 className={styles.eventsSectionTitle}>
              {selectedDate
                ? `${formatDisplayDate(selectedDate)} の決算発表`
                : "今後の決算発表予定"}
              ({selectedEvents.length})
            </h3>
          </div>
          <div className={styles.eventsList}>
            {selectedEvents.map((event, idx) => (
              <EarningsEventItem key={`${event.symbol}-${event.date}-${idx}`} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state when no events */}
      {!loading && !error && filteredEvents.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <p className={styles.emptyText}>
            {watchlistOnly
              ? "ウォッチリスト銘柄の決算予定はありません"
              : "この月の決算予定は見つかりませんでした"}
          </p>
        </div>
      )}
    </div>
  );
};

/** 個別決算イベント表示 */
const EarningsEventItem: React.FC<{ event: EarningsCalendarEvent }> = ({
  event,
}) => {
  const dateObj = new Date(event.date + "T00:00:00");
  const dayOfMonth = dateObj.getDate();
  const weekday = WEEKDAYS[dateObj.getDay()];
  const isReported = event.actual !== undefined;
  const hourLabel = event.hour ? getEarningsHourLabel(event.hour) : "";

  const epsResult = isReported && event.estimate !== undefined
    ? event.actual! >= event.estimate
      ? "beat"
      : "miss"
    : null;

  return (
    <div className={styles.eventItem}>
      <div className={styles.eventDate}>
        <span className={styles.eventDateDay}>{dayOfMonth}</span>
        <span className={styles.eventDateWeekday}>{weekday}</span>
      </div>
      <div className={styles.eventInfo}>
        <div>
          <span className={styles.eventSymbol}>{event.symbol}</span>
          {event.companyName !== event.symbol && (
            <span className={styles.eventCompanyName}>{event.companyName}</span>
          )}
        </div>
        <div className={styles.eventPeriod}>
          {event.fiscalPeriod}
          {hourLabel && (
            <span className={styles.eventHourBadge}>{hourLabel}</span>
          )}
        </div>
      </div>
      <div className={styles.eventMetrics}>
        {event.estimate !== undefined && (
          <div className={styles.eventMetric}>
            <div className={styles.eventMetricLabel}>EPS予想</div>
            <div className={`${styles.eventMetricValue} ${styles.eventMetricEstimate}`}>
              {event.estimate.toFixed(2)}
            </div>
          </div>
        )}
        {isReported && (
          <div className={styles.eventMetric}>
            <div className={styles.eventMetricLabel}>EPS実績</div>
            <div
              className={`${styles.eventMetricValue} ${
                epsResult === "beat"
                  ? styles.eventMetricBeat
                  : epsResult === "miss"
                  ? styles.eventMetricMiss
                  : ""
              }`}
            >
              {event.actual!.toFixed(2)}
            </div>
          </div>
        )}
      </div>
      <span
        className={`${styles.statusBadge} ${
          isReported ? styles.statusReported : styles.statusUpcoming
        }`}
      >
        {isReported ? "発表済" : "予定"}
      </span>
    </div>
  );
};

/** ヘルパー: Date → "YYYY-MM-DD" */
function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** ヘルパー: "YYYY-MM-DD" → 表示用日本語日付 */
function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
}

/** イベントチップのスタイルクラスを決定 */
function getEventChipStyle(event: EarningsCalendarEvent): string {
  if (event.actual === undefined) {
    return styles.eventChipUpcoming;
  }
  if (event.estimate !== undefined) {
    return event.actual >= event.estimate
      ? styles.eventChipBeat
      : styles.eventChipMiss;
  }
  return styles.eventChipReported;
}

export default EarningsCalendar;

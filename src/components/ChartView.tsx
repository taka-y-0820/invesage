import React, { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";
import type {
  IChartApi,
  ISeriesApi,
  Time,
  CandlestickData,
  HistogramData,
} from "lightweight-charts";

const ChartView: React.FC = () => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    interface FixedChartApi extends IChartApi {
      addCandlestickSeries(): ISeriesApi<"Candlestick">;
      addHistogramSeries(options: any): ISeriesApi<"Histogram">;
    }

    const chart = createChart(chartContainerRef.current!) as FixedChartApi;

    const candlestickSeries = chart.addCandlestickSeries();
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "",
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    const candles: CandlestickData[] = [
      {
        time: "2025-08-01" as Time,
        open: 120,
        high: 130,
        low: 115,
        close: 125,
      },
      {
        time: "2025-08-02" as Time,
        open: 125,
        high: 140,
        low: 122,
        close: 135,
      },
    ];

    const volumes: HistogramData[] = [
      {
        time: "2025-08-01" as Time,
        value: 3500,
        color: "#26a69a",
      },
      {
        time: "2025-08-02" as Time,
        value: 5000,
        color: "#ef5350",
      },
    ];

    candlestickSeries.setData(candles);
    volumeSeries.setData(volumes);

    return () => chart.remove();
  }, []);

  return (
    <div ref={chartContainerRef} style={{ width: "100%", height: "500px" }} />
  );
};

export default ChartView;

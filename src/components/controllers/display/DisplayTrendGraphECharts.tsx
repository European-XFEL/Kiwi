import React, { useMemo, useState } from "react";
import ReactECharts from "echarts-for-react";
import type { DisplayTrendGraphProps } from "@/scene/scene_types/controllers";
import { useDisplayTrendGraph } from "@/components/shared/hooks/useDisplayTrendGraph";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { buildEChartsOptions, EChartType } from "@/karabo_plots/echartsOptions";

/**
 * DisplayTrendGraphECharts - Displays time-series plots using ECharts
 * instead of Plotly. Uses the same useDisplayTrendGraph hook for data.
 */
const DisplayTrendGraphECharts: React.FC<DisplayTrendGraphProps> = React.memo(
  (props) => {
    const {
      keys,
      x,
      y,
      width,
      height,
      background,
      x_label,
      y_label,
      x_grid,
      y_grid,
    } = props;

    const [chartType, setChartType] = useState<EChartType>("line");

    // Join keys for hook compatibility
    const keysStr = useKaraboKeysString(keys);

    // Fetch property values from backend (reactive updates)
    const { timestamps, values, isOffline } = useDisplayTrendGraph(keysStr, {
      maxDataPoints: 1000,
      timeWindowMs: Infinity,
      throttleDelayMs: 500,
    });

    // Build ECharts options
    const option = useMemo(
      () =>
        buildEChartsOptions({
          timestamps,
          values,
          chartType,
          xLabel: x_label,
          yLabel: y_label,
          xGrid: x_grid ?? true,
          yGrid: y_grid ?? true,
          background: background || "transparent",
        }),
      [timestamps, values, chartType, x_label, y_label, x_grid, y_grid, background]
    );

    return (
      <div
        className="absolute"
        style={{
          left: x,
          top: y,
          width,
          height,
          backgroundColor: background || "transparent",
        }}
        aria-busy={isOffline ? true : undefined}
        aria-live="polite"
      >
        {/* Offline badge */}
        {isOffline && (
          <div
            className="absolute top-2 left-2 z-10 text-xs px-2 py-1 rounded bg-red-100 text-red-700 shadow-sm select-none"
            style={{ pointerEvents: "none" }}
          >
            Device offline
          </div>
        )}

        {/* Chart type selector */}
        <div
          className="absolute top-2 right-2 z-10"
          style={{ pointerEvents: "auto" }}
        >
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as EChartType)}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-60"
            disabled={isOffline}
            aria-disabled={isOffline}
            title={isOffline ? "Device offline" : "Select chart type"}
          >
            <option value="line">Line</option>
            <option value="scatter">Scatter</option>
            <option value="area">Area</option>
            <option value="bar">Bar</option>
            <option value="heatmap">Heatmap</option>
          </select>
        </div>

        {/* Main chart */}
        <ReactECharts
          option={option}
          style={{
            width: "100%",
            height: "100%",
            opacity: isOffline ? 0.45 : 1,
            transition: "opacity 150ms ease",
          }}
          notMerge={true}
          lazyUpdate={true}
        />
      </div>
    );
  }
);

export default DisplayTrendGraphECharts;

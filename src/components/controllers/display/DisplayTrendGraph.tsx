import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import type { Layout, Data } from "plotly.js";
import type { DisplayTrendGraphProps } from "@/scene/scene_types/controllers";
import { useDisplayTrendGraph } from "@/components/shared/hooks/useDisplayTrendGraph";
import { useKaraboKeysString } from "@/components/shared/hooks/useKaraboKeysString";
import { TraceFactory, ChartType } from "@/karabo_plots/traceFactory";
import { buildTimeValueHeatmap } from "@/karabo_plots/heatmapBining";

/**
 * DisplayTrendGraph - Displays time-series or heatmap plots based on
 * device property values over time. Uses the new DisplayTrendGraphModel.
 */
const DisplayTrendGraph: React.FC<DisplayTrendGraphProps> = React.memo(
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

    const [chartType, setChartType] = useState<ChartType>("line");

    // Join keys for hook compatibility
    const keysStr = useKaraboKeysString(keys);

    // Fetch property values from backend (reactive updates)
    const { timestamps, values, isOffline } = useDisplayTrendGraph(keysStr, {
      maxDataPoints: 1000,
      timeWindowMs: Infinity,
      throttleDelayMs: 500,
    });

    const formattedTimestamps = useMemo(() => timestamps, [timestamps]);

    const traceInput =
      chartType === "heatmap"
        ? ({
            kind: "heatmap",
            series: buildTimeValueHeatmap(timestamps, values, {
              timeBins: 24,
              valueBins: 10,
            }),
            name: "Density",
          } as const)
        : ({
            kind: "xy",
            series: { x: formattedTimestamps, y: values },
            name: "Series",
          } as const);

    const data: Data[] = [TraceFactory[chartType](traceInput)];

    const layout: Partial<Layout> = {
      autosize: true,
      margin: { t: 36, r: 12, b: 36, l: 44 },
      paper_bgcolor: background || "transparent",
      plot_bgcolor: background || "rgba(0,0,0,0)",
      xaxis: {
        title: {
          text: chartType === "heatmap" ? "Time bins" : x_label || "Time",
          standoff: 8,
        },
        automargin: true,
        showgrid: chartType !== "heatmap" && (x_grid ?? true),
        gridcolor: "#e5e7eb",
        showspikes: chartType !== "heatmap",
        spikemode: "across",
        spikesnap: "cursor",
        spikecolor: "#6b7280",
        type: chartType === "heatmap" ? undefined : "date",
        tickformat: "%H:%M",
      },
      yaxis: {
        title: {
          text: chartType === "heatmap" ? "Value bins" : y_label || "Value",
          standoff: 8,
        },
        automargin: true,
        showgrid: chartType !== "heatmap" && (y_grid ?? true),
        gridcolor: "#e5e7eb",
        showspikes: chartType !== "heatmap",
        spikemode: "across",
        spikesnap: "cursor",
        spikecolor: "#6b7280",
      },
      hovermode: chartType === "heatmap" ? "closest" : "x unified",
      showlegend: false,
    };

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
            onChange={(e) => setChartType(e.target.value as ChartType)}
            className="text-xs border border-gray-300 rounded px-2 py-1 bg-white shadow-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:opacity-60"
            disabled={isOffline}
            aria-disabled={isOffline}
            title={isOffline ? "Device offline" : "Select chart type"}
          >
            <option value="line">Line</option>
            <option value="points">Scatter</option>
            <option value="area">Area</option>
            <option value="heatmap">Heatmap</option>
          </select>
        </div>

        {/* Main chart */}
        <Plot
          data={data}
          layout={layout}
          config={{
            displayModeBar: false,
            responsive: true,
            scrollZoom: !isOffline,
          }}
          useResizeHandler
          style={{
            width: "100%",
            height: "100%",
            opacity: isOffline ? 0.45 : 1,
            transition: "opacity 150ms ease",
          }}
        />
      </div>
    );
  }
);

export default DisplayTrendGraph;

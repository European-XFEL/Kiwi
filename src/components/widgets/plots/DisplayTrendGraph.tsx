import React, { useMemo, useState } from "react";
import Plot from "react-plotly.js";
import type { Layout, Data } from "plotly.js";
import { DisplayTrendGraphElementProps } from "@/karabo_data/SceneElements";
import { useDisplayTrendGraph } from "../shared/hooks/useDisplayTrendGraph";
import { TraceFactory, ChartType } from "@/karabo_plots/traceFactory";
import { buildTimeValueHeatmap } from "@/karabo_plots/heatmapBining";

type Props = DisplayTrendGraphElementProps & {
  defaultChartType?: ChartType;
};

const DisplayTrendGraph: React.FC<Props> = React.memo((props) => {
  const [chartType, setChartType] = useState<ChartType>(
    props.defaultChartType ?? "line"
  );

  const { timestamps, values, isOffline } = useDisplayTrendGraph(
    props.karaboKeys,
    {
      maxDataPoints: 1000,
      timeWindowMs: Infinity,
      throttleDelayMs: 500,
    }
  );

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
    paper_bgcolor: props.background || "transparent",
    plot_bgcolor: props.background || "rgba(0,0,0,0)",
    xaxis: {
      title: {
        text: chartType === "heatmap" ? "Time bins" : props.xLabel || "Time",
        standoff: 8,
      },
      automargin: true,
      showgrid: chartType !== "heatmap" && (props.xGrid ?? true),
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
        text: chartType === "heatmap" ? "Value bins" : props.yLabel || "Value",
        standoff: 8,
      },
      automargin: true,
      showgrid: chartType !== "heatmap" && (props.yGrid ?? true),
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
        left: props.x,
        top: props.y,
        width: props.width,
        height: props.height,
        backgroundColor: props.background || "transparent",
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
          scrollZoom: !isOffline, // disable zoom while offline
        }}
        useResizeHandler
        style={{
          width: "100%",
          height: "100%",
          opacity: isOffline ? 0.45 : 1, // dim while offline
          transition: "opacity 150ms ease",
        }}
      />
    </div>
  );
});

export default DisplayTrendGraph;

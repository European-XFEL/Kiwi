import { Attributes } from "karabo-ts";
import { Timestamp } from "../helpers/timestamps";

type PlotEngine = "PLOTLY" | "ECHART";

interface PlotDataPoint {
  timestamp: number | bigint | Attributes | Date | Timestamp;
  value: any;
}

interface PlotConfig {
  maxDataPoints?: number;
  timeWindowMs?: number;
  throttleDelayMs?: number;
}

export class PlotData {
  private dataPoints: PlotDataPoint[];
  private plot_config: PlotConfig;
  plot_engine: PlotEngine = "ECHART";

  constructor(
    dataPoints: PlotDataPoint[],
    config: PlotConfig,
    engine_type: PlotEngine
  ) {
    this.dataPoints = dataPoints;
    this.plot_config = config;
    this.plot_engine = engine_type;
  }

  getDataPoints(): PlotDataPoint[] {
    return this.dataPoints;
  }

  getConfig(): PlotConfig {
    return this.plot_config;
  }

  normalizeTimestamps() {
    this.dataPoints = this.dataPoints.map((points) => {
      const timestamp =
        points.timestamp instanceof Timestamp
          ? points.timestamp
          : new Timestamp(points.timestamp);
      return {
        timestamp: timestamp,
        value: points.value,
      };
    });
  }

  addDataPoint(point: PlotDataPoint): void {
    this.dataPoints.push(point);
    if (
      this.plot_config.maxDataPoints &&
      this.dataPoints.length > this.plot_config.maxDataPoints
    ) {
      this.dataPoints.shift();
    }
  }
}

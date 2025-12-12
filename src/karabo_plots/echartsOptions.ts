import type { EChartsOption } from 'echarts';
import { buildTimeValueHeatmap } from './heatmapBining';

export type EChartType = 'line' | 'scatter' | 'bar' | 'area' | 'heatmap';

interface BuildEChartsOptionsParams {
  timestamps: number[];
  values: number[];
  chartType: EChartType;
  xLabel?: string;
  yLabel?: string;
  xGrid?: boolean;
  yGrid?: boolean;
  background?: string;
}

/**
 * Builds ECharts options for time-series visualization
 * Converts epoch milliseconds timestamps to formatted date strings
 */
export function buildEChartsOptions({
  timestamps,
  values,
  chartType,
  xLabel = 'Time',
  yLabel = 'Value',
  xGrid = true,
  yGrid = true,
  background = 'transparent',
}: BuildEChartsOptionsParams): EChartsOption {
  // Format timestamps as readable dates (HH:MM format)
  const formattedTimes = timestamps.map((ts) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  });

  // Base configuration
  const baseOption: EChartsOption = {
    backgroundColor: background,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#6a7985',
        },
      },
    },
    grid: {
      left: 56,
      right: 16,
      bottom: 52,
      top: 40,
      containLabel: true,
    },
    toolbox: {
      feature: {
        saveAsImage: {
          title: 'Save as Image',
        },
        dataZoom: {
          yAxisIndex: 'none',
          title: {
            zoom: 'Zoom',
            back: 'Reset Zoom',
          },
        },
        restore: {
          title: 'Restore',
        },
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: chartType === 'bar',
      data: formattedTimes,
      name: xLabel,
      nameLocation: 'middle',
      nameGap: 30,
      splitLine: {
        show: xGrid,
      },
      axisLabel: {
        rotate: 0,
        formatter: (value: string) => value,
        hideOverlap: true,
        interval: 'auto',
      },
    },
    yAxis: {
      type: 'value',
      name: yLabel,
      nameLocation: 'middle',
      nameGap: 50,
      splitLine: {
        show: yGrid,
      },
    },
  };

  // Configure series based on chart type
  let series: EChartsOption['series'];

  switch (chartType) {
    case 'line':
      series = [
        {
          name: 'Value',
          type: 'line',
          smooth: true,
          data: values,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: {
            width: 2,
          },
        },
      ];
      break;

    case 'scatter':
      series = [
        {
          name: 'Value',
          type: 'scatter',
          data: values,
          symbolSize: 6,
        },
      ];
      break;

    case 'bar':
      series = [
        {
          name: 'Value',
          type: 'bar',
          data: values,
        },
      ];
      break;

    case 'area':
      series = [
        {
          name: 'Value',
          type: 'line',
          smooth: true,
          data: values,
          areaStyle: {
            opacity: 0.5,
          },
          lineStyle: {
            width: 2,
          },
        },
      ];
      break;

    case 'heatmap':
      // For heatmap, ECharts requires visualMap component and 2D binned data
      const heatmapData = buildTimeValueHeatmap(timestamps, values, {
        timeBins: 24,
        valueBins: 10,
      });

      // Convert z-matrix to ECharts format: [x, y, value]
      const heatmapPoints: [number, number, number][] = [];
      for (let y = 0; y < heatmapData.z.length; y++) {
        for (let x = 0; x < heatmapData.z[y].length; x++) {
          heatmapPoints.push([x, y, heatmapData.z[y][x]]);
        }
      }

      // Find min/max for visualMap
      const allValues = heatmapPoints.map((p) => p[2]);
      const minVal = Math.min(...allValues);
      const maxVal = Math.max(...allValues);

      series = [
        {
          name: 'Density',
          type: 'heatmap',
          data: heatmapPoints,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
        },
      ];

      // Add visualMap to base options
      baseOption.visualMap = {
        min: minVal,
        max: maxVal,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: [
            '#313695',
            '#4575b4',
            '#74add1',
            '#abd9e9',
            '#e0f3f8',
            '#ffffbf',
            '#fee090',
            '#fdae61',
            '#f46d43',
            '#d73027',
            '#a50026',
          ],
        },
      };

      // Override axis for heatmap
      baseOption.xAxis = {
        type: 'category',
        data: heatmapData.xLabels,
        name: 'Time bins',
        nameLocation: 'middle',
        nameGap: 30,
        splitArea: {
          show: true,
        },
      };

      baseOption.yAxis = {
        type: 'category',
        data: heatmapData.yLabels,
        name: 'Value bins',
        nameLocation: 'middle',
        nameGap: 50,
        splitArea: {
          show: true,
        },
      };

      // Adjust grid for heatmap to make room for visualMap
      baseOption.grid = {
        left: 56,
        right: 16,
        bottom: 80,
        top: 40,
        containLabel: true,
      };

      break;

    default:
      series = [];
  }

  return {
    ...baseOption,
    series,
  };
}

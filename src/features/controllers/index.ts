/**
 * Controllers Feature - Public API
 *
 * This is the ONLY file other features should import from.
 * All internal implementation is private.
 *
 * Note: Controller prop types are defined in @/scene/scene_types/controllers
 * and should be imported from there when needed.
 */

export { default as DisplayCheckbox } from './display/DisplayCheckbox';
export { default as DisplayCommand } from './display/DisplayCommand';
export { default as DisplayEvaluator } from './display/DisplayEvaluator';
export { default as DisplayLabel } from './display/DisplayLabel';
export { default as DisplayLineEdit } from './display/DisplayLineEdit';
export { default as DisplayList } from './display/DisplayList';
export { default as DisplayStateColor } from './display/DisplayStateColor';
export { StatefulIcon as DisplayStatefulWidgetIcon } from '@/features/icons';
export { default as DisplayTableElement } from './display/DisplayTableElement';

export { useDeviceTableProperty } from './display/hooks/useDeviceTableProperty';

// Plot Controllers (Graphs & Visualizations)
export { default as DisplayTrendGraph } from './plots/DisplayTrendGraph';
export { default as DisplayVectorGraph } from './plots/DisplayVectorGraph';

// Plot Hooks
export { useDisplayTrendGraph, useDisplayVectorGraph } from './plots/hooks';
export type {
  UseDisplayVectorGraphConfig,
  UseDisplayVectorGraphResult,
  VectorPrimary,
} from './plots/hooks';

// Plot Utilities
export {
  // LTTB downsampling
  lttb,
  lttbWithPositions,
  downsampleArray,
  // Trace factory for Plotly
  TraceFactory,
  // Heatmap binning
  buildTimeValueHeatmap,
} from './plots/utils';

export type { XYPoint, ChartType } from './plots/utils';

// Editable Controllers (Editable)
export { default as DoubleLineEdit } from './editable/DoubleLineEdit';
export { default as EditableComboBox } from './editable/EditableComboBox';
export { default as EditableLineEdit } from './editable/EditableLineEdit';
export { default as EditableList } from './editable/EditableList';
export { default as IntLineEdit } from './editable/IntLineEdit';

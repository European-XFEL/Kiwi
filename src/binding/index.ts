/**
 * Binding Feature - Public API
 *
 * This is the ONLY file other features should import from.
 * All internal implementation is private.
 *
 * The binding layer provides:
 * - Data models (PropertyBinding) with reactive state
 * - Proxies (DeviceProxy, PropertyProxy) for network abstraction
 * - Builders for creating bindings from schema
 * - Status tracking and indicators
 */

// ──────────────────────────────────────────────────────────────────────
// MODELS
// ──────────────────────────────────────────────────────────────────────

export { PropertyBinding } from './model/PropertyBinding';
export { createPropertyBinding } from './model/PropertyBinding';

// ──────────────────────────────────────────────────────────────────────
// PROXIES
// ──────────────────────────────────────────────────────────────────────

export { DeviceProxy } from './proxies/DeviceProxy';
export { PropertyProxy } from './proxies/PropertyProxy';

// PropertyDescriptor type and builder functions
export type { PropertyDescriptor } from './proxies/PropertyDescriptor';
export {
  buildPropertyDescriptor,
  buildDescriptorWithGlobalContext,
} from './proxies/PropertyDescriptor';

// ──────────────────────────────────────────────────────────────────────
// DEVICE MANAGER (Singleton)
// ──────────────────────────────────────────────────────────────────────

export { deviceManager } from './DeviceManager';

// ──────────────────────────────────────────────────────────────────────
// BUILDERS
// ──────────────────────────────────────────────────────────────────────

export { buildPropertyModel } from './model/builders/PropertyModelBuilder';
export { buildPropertyMap } from './model/builders/PropertyMapBuilder';
export { buildDeviceModel } from './model/builders/DeviceModelBuilder';

// ──────────────────────────────────────────────────────────────────────
// HOOKS (React Interface)
// ──────────────────────────────────────────────────────────────────────

export { useDeviceProperty } from './hooks';
export type { UseDevicePropertyResult } from './hooks';

// ──────────────────────────────────────────────────────────────────────
// UTILITIES
// ──────────────────────────────────────────────────────────────────────

export {
  getDeviceIndicator,
  getPropertyIndicator,
  getUnitLabel,
  isLeafProperty,
} from './utils';

// ──────────────────────────────────────────────────────────────────────
// STATUS & INDICATORS
// ──────────────────────────────────────────────────────────────────────

export { ProxyStatus, PropertyStatus } from './ProxyStatus';

export {
  DEVICE_INDICATORS,
  PROPERTY_INDICATORS,
} from './overlay_indicator_constants';

// ──────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────

// Model types
export type {
  PropertyBinding as IPropertyBinding,
  PropertyModel,
  PropertyValue,
  HistoricSample,
  PropertyChangeHandler,
  HistoricDataHandler,
} from './model/types/PropertyType';

export type {
  DeviceModel,
  DeviceRuntimeState,
  DeviceIdentity,
} from './model/types/DeviceType';

export type { PropertySchema, DeviceSchema } from './model/types/SchemaType';

// Proxy types
export type {
  DeviceState,
  DeviceTopologyStatus,
  DeviceSchemaStatus,
  DeviceConfigStatus,
  PropertyState,
  DeviceIndicatorDescriptor,
  PropertyIndicatorDescriptor,
} from './proxies/types';

// Editability
export { isPropertyEditable } from './model/editability';

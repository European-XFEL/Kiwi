export { PropertyBinding } from './model/PropertyBinding';
export { DeviceProxy } from './proxies/DeviceProxy';
export { PropertyProxy } from './proxies/PropertyProxy';

export type { PropertyDescriptor } from './proxies/PropertyDescriptor';
export { buildPropertyDescriptor } from './proxies/PropertyDescriptor';

export { useDeviceProperty } from './hooks';
export type { UseDevicePropertyResult } from './hooks';

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
  BindingInterface as IPropertyBinding,
  PropertyModel,
  PropertyValue,
  PropertyChangeHandler,
} from './model/types/PropertyType';

export type { DeviceModel, DeviceRuntimeState } from './model/types/DeviceType';

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

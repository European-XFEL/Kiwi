export const KARABO_SCHEMA_DISPLAYED_NAME = 'displayedName';
export const KARABO_SCHEMA_DISPLAY_TYPE = 'displayType';
export const KARABO_SCHEMA_ACCESS_MODE = 'accessMode';
export const KARABO_SCHEMA_ASSIGNMENT = 'assignment';
export const KARABO_SCHEMA_REQUIRED_ACCESS_LEVEL = 'requiredAccessLevel';
export const KARABO_SCHEMA_OPTIONS = 'options';
export const KARABO_SCHEMA_UNIT_SYMBOL = 'unitSymbol';
export const KARABO_SCHEMA_METRIC_PREFIX_SYMBOL = 'metricPrefixSymbol';
export const KARABO_SCHEMA_ROW_SCHEMA = 'rowSchema';
export const KARABO_SCHEMA_ALLOWED_STATES = 'allowedStates';
export const KARABO_SCHEMA_VALUE_TYPE = 'valueType';
export const KARABO_SCHEMA_NODE_TYPE = 'nodeType';
export const KARABO_SCHEMA_MIN_INC = 'minInc';
export const KARABO_SCHEMA_MIN_EXC = 'minExc';
export const KARABO_SCHEMA_MAX_INC = 'maxInc';
export const KARABO_SCHEMA_MAX_EXC = 'maxExc';
export const KARABO_SCHEMA_MIN_SIZE = 'minSize';
export const KARABO_SCHEMA_MAX_SIZE = 'maxSize';

export const VALUE_LIMITS = {
  int8: { min: -128, max: 127 },
  int16: { min: -32768, max: 32767 },
  int32: { min: -2147483648, max: 2147483647 },
  int64: { min: Number.MIN_SAFE_INTEGER, max: Number.MAX_SAFE_INTEGER }, // JS safe integer limits
  uint8: { min: 0, max: 255 },
  uint16: { min: 0, max: 65535 },
  uint32: { min: 0, max: 4294967295 },
  uint64: { min: 0, max: Number.MAX_SAFE_INTEGER }, // JS safe integer limits
  float32: { min: -3.4e38, max: 3.4e38, tiny: 1.175e-38, eps: 1.192e-7 },
  float64: {
    min: Number.MIN_VALUE,
    max: Number.MAX_VALUE,
    tiny: Number.MIN_VALUE,
    eps: Number.EPSILON,
  },
};

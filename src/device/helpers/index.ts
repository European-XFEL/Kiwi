import {
  DEVICE_INDICATORS,
  PROPERTY_INDICATORS,
} from '../constants/overlay_indicator_constants';
import {
  DeviceIndicatorDescriptor,
  PropertyIndicatorDescriptor,
} from '../device-proxy/types';
import { PropertyStatus, ProxyStatus } from '../enums';

import { PropertySchemaAttributes } from '@/karabo_data/DeviceSchemaInfo';

import { NodeType } from '@/karabo_data/SchemaEnums';

export function getDeviceIndicator(
  status: ProxyStatus
): DeviceIndicatorDescriptor | null {
  return DEVICE_INDICATORS.find((d) => d.status === status) ?? null;
}

export function getPropertyIndicator(
  status: PropertyStatus
): PropertyIndicatorDescriptor | null {
  return PROPERTY_INDICATORS.find((d) => d.status === status) ?? null;
}

export function getUnitLabel(attrs: PropertySchemaAttributes): string {
  const prefix = attrs.metricPrefixSymbol ?? '';
  const unit = attrs.unitSymbol ?? '';
  return `${prefix}${unit}`;
}

export function isLeafProperty(attrs: PropertySchemaAttributes): boolean {
  return attrs.nodeType === undefined || attrs.nodeType === NodeType.LEAF;
}

import { XCircle } from 'lucide-react';
import {
  DeviceIndicatorDescriptor,
  PropertyIndicatorDescriptor,
} from './proxies/types';
import { ProxyStatus, PropertyStatus } from './ProxyStatus';

// ──────────────────────────────────────────────────────────────────────
// DEVICE INDICATORS
// ──────────────────────────────────────────────────────────────────────

export const DEVICE_INDICATORS: DeviceIndicatorDescriptor[] = [
  {
    status: ProxyStatus.OFFLINE,
    icon: XCircle,
    label: 'Device offline',
    tooltip: 'Device is not in topology',
  },
  {
    status: ProxyStatus.ONLINE,
    color: 'bg-gray-400',
    label: 'Device online (not monitored)',
    tooltip: 'Device is online but no widgets are watching',
  },
  {
    status: ProxyStatus.SCHEMA_REQUESTED,
    color: 'bg-yellow-300',
    label: 'Schema requested',
    tooltip: 'Waiting for device schema from server',
  },
  {
    status: ProxyStatus.SCHEMA_RECEIVED,
    color: 'bg-blue-500',
    label: 'Schema received',
    tooltip: 'Schema received, waiting for initial configuration',
  },
  {
    status: ProxyStatus.ALIVE,
    color: 'bg-blue-400',
    label: 'Ready',
    tooltip: 'Device has schema and config (not actively monitored)',
  },
  {
    status: ProxyStatus.MONITORING,
    color: 'bg-green-500',
    label: 'Monitoring',
    tooltip: 'Device is actively monitored – data is flowing',
  },
];

// ──────────────────────────────────────────────────────────────────────
// PROPERTY INDICATORS
// ──────────────────────────────────────────────────────────────────────

export const PROPERTY_INDICATORS: PropertyIndicatorDescriptor[] = [
  {
    status: PropertyStatus.NONE,
    indicator: '',
    label: 'Property available',
  },
  {
    status: PropertyStatus.MISSING,
    indicator: '??',
    label: 'Property not found on device',
    color: '#F44336',
  },
];

export const PROPERTY_MISSING_INDICATOR = PROPERTY_INDICATORS[1];

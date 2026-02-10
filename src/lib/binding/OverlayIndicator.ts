import { XCircle } from 'lucide-react';
import { ProxyStatusIcon as ProxyStatusIcon, ProxyBindingIcon } from './types';
import { ProxyStatus, PropertyStatus } from './ProxyStatus';

export const DEVICE_INDICATORS: ProxyStatusIcon[] = [
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
    status: ProxyStatus.ONLINEREQUESTED,
    color: 'bg-yellow-300',
    label: 'Schema requested',
    tooltip: 'Waiting for device schema from server',
  },
  {
    status: ProxyStatus.SCHEMA,
    color: 'bg-blue-500',
    label: 'Schema received',
    tooltip: 'Schema received, waiting for initial configuration',
  },
  {
    status: ProxyStatus.ALIVE,
    color: 'bg-green-400',
    label: 'Ready',
    tooltip: 'Device has schema and config (not actively monitored)',
  },
];

export const PROPERTY_INDICATORS: ProxyBindingIcon[] = [
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

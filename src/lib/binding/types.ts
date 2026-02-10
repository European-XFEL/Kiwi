import type React from 'react';
import { PropertyStatus, ProxyStatus } from './ProxyStatus';

/**
 * Device overlay indicator descriptor
 */
export interface ProxyStatusIcon {
  status: ProxyStatus;
  label: string;
  icon?: React.ComponentType<{ className?: string; size?: number }>;

  color?: string;
  tooltip?: string;
}

/**
 * Property overlay indicator descriptor
 * Maps PropertyStatus → UI representation
 */
export interface ProxyBindingIcon {
  status: PropertyStatus;

  /** Display string/element (e.g., "??" for MISSING, "" for NONE) */
  indicator: string | React.ReactNode;

  /** Human-readable label for accessibility/tooltips */
  label: string;

  /** Optional: Color for the indicator */
  color?: string;
}

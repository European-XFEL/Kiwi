import type React from 'react';
import { PropertyStatus, ProxyStatus } from '../ProxyStatus';

// ──────────────────────────────────────────────────────────────────────
// STATUS SLICES
// ──────────────────────────────────────────────────────────────────────

/**
 * Device topology status
 */
export interface DeviceTopologyStatus {
  /** Is the device present in the system topology? */
  is_device_online: boolean;

  /** Optional: Server hosting the device */
  serverId?: string;

  /** Optional: Device class ID */
  classId?: string;
}

/**
 * Device schema status
 */
export interface DeviceSchemaStatus {
  /** Has schema been requested from GUI server? */
  requested_device_schema: boolean;

  /** Has schema been received and parsed? */
  received_device_schema: boolean;

  /** Optional: When schema status last changed */
  last_changed_at?: number;

  /** Optional: Schema timestamp from server */
  schema_timestamp?: number;
}

/**
 * Device configuration status
 */
export interface DeviceConfigStatus {
  /** Has at least one configuration update been received? */
  has_config: boolean;

  /** Optional: Last config update timestamp */
  last_config_timestamp?: number;

  /** Optional: Number of properties in config */
  property_count?: number;
}

// ──────────────────────────────────────────────────────────────────────
// DEVICE & PROPERTY STATE
// ──────────────────────────────────────────────────────────────────────

/**
 * Complete device state
 * This represents the internal state tracking of a DeviceProxy
 */
export interface DeviceState {
  deviceId: string;
  topology: DeviceTopologyStatus;
  schema: DeviceSchemaStatus;
  config: DeviceConfigStatus;
  status: ProxyStatus; // Computed from above
}

/**
 * Property-level state
 * This represents the internal state of a PropertyProxy
 */
export interface PropertyState {
  /** Property path (e.g., "voltage") */
  path: string;

  /** Full key (e.g., "PowerSupply.voltage") */
  key: string;

  /** Does this property exist in the device schema? */
  exists: boolean;

  /** Is a widget currently displaying this property? */
  visible: boolean;

  /** Property status for overlay indicator */
  status: PropertyStatus;

  /** Optional: User's pending edit value */
  editValue?: any;
}

// ──────────────────────────────────────────────────────────────────────
// UI DESCRIPTORS
// ──────────────────────────────────────────────────────────────────────

/**
 * Device overlay indicator descriptor
 * Maps ProxyStatus → UI representation
 */
export interface DeviceIndicatorDescriptor {
  status: ProxyStatus;
  label: string; // Human-readable: "Offline", "Monitoring", etc.

  /** Optional: Icon component (e.g., XCircle from lucide-react) */
  icon?: React.ComponentType<{ className?: string; size?: number }>;

  /** Optional: Tailwind class or CSS color (e.g., "bg-green-500", "#4CAF50") */
  color?: string;

  /** Optional: Tooltip text */
  tooltip?: string;
}

/**
 * Property overlay indicator descriptor
 * Maps PropertyStatus → UI representation
 */
export interface PropertyIndicatorDescriptor {
  status: PropertyStatus;

  /** Display string/element (e.g., "??" for MISSING, "" for NONE) */
  indicator: string | React.ReactNode;

  /** Human-readable label for accessibility/tooltips */
  label: string;

  /** Optional: Color for the indicator */
  color?: string;
}

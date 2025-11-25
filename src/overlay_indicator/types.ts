import type React from "react";
import { TopologyEventType } from "@/karabo_data/TopologyInfo";

// ──────────────────────────
// Status enums
// ──────────────────────────

export enum DeviceProxy {
  OFFLINE = "OFFLINE",
  SCHEMA_REQUESTED = "SCHEMA_REQUESTED",
  SCHEMA_RECEIVED = "SCHEMA_RECEIVED",
  MONITORING = "MONITORING",
}

export enum ProxyStatus {
  NONE = "NONE",
  MISSING = "MISSING",
}

// ──────────────────────────
// Core status slices
// ──────────────────────────

export interface DeviceSchemaStatus {
  requested_device_schema: boolean;
  received_device_schema: boolean;
  last_changed_at?: number;
}

export interface DeviceTopologyStatus {
  is_device_online: boolean;
  last_event_type?: TopologyEventType;
  last_change_at?: number;
}

export interface DevicePropertyConfigStatus {
  has_config: boolean;
  last_change_at?: number;
}

// ──────────────────────────
// Device + property objects
// ──────────────────────────

export interface DeviceLevelIndicator {
  device_id: string;
  topology_status: DeviceTopologyStatus;
  schema_status: DeviceSchemaStatus;
  config_status: DevicePropertyConfigStatus;
  overlay_status: DeviceProxy;
}

export type DeviceStatus = DeviceLevelIndicator;

export interface PropertyLevelIndicator {
  device_id: string;
  property_id: string;
  overlay_status: ProxyStatus;
}

// ──────────────────────────
// UI descriptors
// ──────────────────────────

/** UI descriptor for *device-level* status */
export interface DeviceIndicatorDescriptor {
  status: DeviceProxy;
  /** Tailwind class for dot (yellow/blue/green), or undefined when using icon */
  color?: string;
  /** For OFFLINE or future icon-based statuses */
  icon?: React.ComponentType<{ className?: string; size?: number }>;
  label: string;
}

/** UI descriptor for *property-level* status */
export interface PropertyIndicatorDescriptor {
  status: ProxyStatus;
  indicator: string | React.ReactNode;
  label: string;
}

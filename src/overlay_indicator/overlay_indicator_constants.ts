import { XCircle } from "lucide-react";
import {
  DeviceProxy,
  ProxyStatus,
  DeviceIndicatorDescriptor,
  PropertyIndicatorDescriptor,
} from "./types";

export const DEVICE_INDICATORS: DeviceIndicatorDescriptor[] = [
  {
    status: DeviceProxy.OFFLINE,
    icon: XCircle,
    label: "Device offline",
  },
  {
    status: DeviceProxy.SCHEMA_REQUESTED,
    color: "bg-yellow-300",
    label: "Schema requested – waiting for schema",
  },
  {
    status: DeviceProxy.SCHEMA_RECEIVED,
    color: "bg-blue-500",
    label: "Schema received – waiting for configuration",
  },
  {
    status: DeviceProxy.MONITORING,
    color: "bg-green-500",
    label: "Monitoring – device data is flowing",
  },
];

export const PROPERTY_MISSING_INDICATOR: PropertyIndicatorDescriptor = {
  status: ProxyStatus.MISSING,
  indicator: "??",
  label: "Property not found on device",
};

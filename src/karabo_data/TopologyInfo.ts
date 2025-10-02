import { AccessLevel } from "@/karabo_data/SchemaEnums";

export interface DeviceInfo {
  deviceId: string;
  heartbeatInterval: number;
  karaboVersion: string;
  classId: string;
  serverId: string;
  visibility: AccessLevel;
  host: string;
  status: string; // "ok" || "error"
  capabilities: number;
  frac?: number;
  sec?: number;
  tid?: number;
}

export interface DeviceServerInfo {
  serverId: string;
  heartbeatInterval: number;
  karaboVersion: string;
  version: string;
  host: string;
  visibility: AccessLevel;
  lang: string; // "cpp" || "python"
  log: string; // "fatal" || "error" || "warning" || "info" || "debug"
  serverFlags?: number;
  capabilities?: number;
  frac?: number;
  sec?: number;
  tid?: number;
}

export interface SystemTopologyInfo {
  devices: DeviceInfo[];
  servers: DeviceServerInfo[];
}

export interface SystemTopologyUpdateInfo {
  new: SystemTopologyInfo;
  update: SystemTopologyInfo;
  gone: SystemTopologyInfo;
}

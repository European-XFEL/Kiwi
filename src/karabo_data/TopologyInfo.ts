export enum TopologyEventType {
  NEW,
  UPDATE,
  GONE,
}

export interface DeviceInfo {
  deviceId: string;
  heartbeatInterval?: number;
  karaboVersion?: string;
  classId?: string;
  serverId?: string;
  host?: string;
  status?: string; // "ok" || "error"
  capabilities?: number;
}

export interface DeviceServerInfo {
  serverId: string;
  heartbeatInterval: number;
  karaboVersion: string;
  version: string;
  host: string;
  lang: string; // "cpp" || "python"
  log: string; // "fatal" || "error" || "warning" || "info" || "debug"
  serverFlags?: number;
  capabilities?: number;
  frac?: number;
  sec?: number;
  tid?: number;
}

/** Macros are a "special" kind of devices from the Topology point-of-view */
export interface MacroInfo extends DeviceInfo {
  module: string;
  project: string;
}

export interface SystemTopologyInfo {
  devices: DeviceInfo[];
  servers: DeviceServerInfo[];
  macros: MacroInfo[];
}

export interface SystemTopologyUpdateInfo {
  new: SystemTopologyInfo;
  update: SystemTopologyInfo;
  gone: SystemTopologyInfo;
}

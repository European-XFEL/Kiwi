import { AccessLevel } from "../karabo_data/AccessLevel";
import { SystemTopologyInfo } from "../karabo_data/TopologyInfo";

class TopologyTreeModel {
  private _hosts: HostModel[];

  constructor(sysTopology: SystemTopologyInfo) {
    this._hosts = [];
    sysTopology.servers.forEach((server) => {
      let host = this._hosts.find(
        (hostMdl) => hostMdl.hostName === server.host
      );
      if (!host) {
        this._hosts.push({ hostName: server.host, hostedServers: [] });
        host = this._hosts[this._hosts.length - 1];
      }
      host.hostedServers.push({
        serverId: server.serverId,
        visibility: server.visibility,
        lang: server.lang,
        version: server.version,
        karaboVersion: server.karaboVersion,
        status: "ok",
        hostedDevices: [],
      });
    });
    sysTopology.devices.forEach((device) => {
      const deviceHost = device.host;
      const deviceServer = device.serverId;
      const deviceClass = device.classId;
      const mdlHost = this._hosts.find(
        (hostMdl) => hostMdl.hostName === deviceHost
      );
      if (mdlHost) {
        // The device's host has been found; find its server
        const mdlServer = mdlHost.hostedServers.find(
          (server) => server.serverId === deviceServer
        );
        if (mdlServer) {
          if (device.status !== "ok") {
            mdlServer.status = device.status;
          }
          let mdlClass = mdlServer.hostedDevices.find(
            (devClass) => devClass.classId === deviceClass
          );
          if (!mdlClass) {
            // It's the first occurrence of a device of this class in the server; adds it.
            mdlServer.hostedDevices.push({
              classId: deviceClass,
              deviceInstances: [],
            });
            mdlClass =
              mdlServer.hostedDevices[mdlServer.hostedDevices.length - 1];
          }
          mdlClass.deviceInstances.push({
            deviceId: device.deviceId,
            status: device.status,
            visibility: device.visibility,
            karaboVersion: device.karaboVersion,
          });
        }
      }
    });
  }

  get hosts(): HostModel[] {
    return this._hosts;
  }
}

export interface HostedDeviceInfoModel {
  deviceId: string;
  karaboVersion: string;
  visibility: AccessLevel;
  status: string;
}

export interface HostedDeviceClassModel {
  classId: string;
  deviceInstances: HostedDeviceInfoModel[];
}

export interface HostedServerModel {
  serverId: string;
  visibility: AccessLevel;
  lang: string;
  version: string;
  karaboVersion: string;
  status: string; // error if at least one of its devices is in error.
  hostedDevices: HostedDeviceClassModel[];
}

export interface HostModel {
  hostName: string;
  hostedServers: HostedServerModel[];
}

export default TopologyTreeModel;

import {
  TopologyConnector,
  type DeviceInfoUpdateHandler,
} from "@/karabo_connectors/TopologyConnector";
import { DeviceInfo, TopologyEventType } from "@/karabo_data/TopologyInfo";

import { DeviceSchemaConnector } from "@/karabo_connectors/DeviceSchemaConnector";
import type { DeviceSchemaInfo } from "@/karabo_data/DeviceSchemaInfo";

import { DevicePropertyConnector } from "@/karabo_connectors/DevicePropertyConnector";

import { useDeviceStatusStore } from "@/store/useDeviceStatusStore";

/**
 *
 * Bridge between Karabo connectors (Topology / Schema / Property)
 * and the useDeviceStatus store.
 */
export class DeviceOverlayIndicatorConnector {
  private constructor() {}
  private static _inst?: DeviceOverlayIndicatorConnector;

  static get inst(): DeviceOverlayIndicatorConnector {
    if (!this._inst) this._inst = new DeviceOverlayIndicatorConnector();
    return this._inst;
  }

  /**
   * Attach TOPOLOGY + SCHEMA + CONFIG hooks for a given device.
   * Returns a cleanup function to detach / unsubscribe.
   */
  attachDevice(deviceId: string): () => void {
    const cleanupTopology = this.#attachTopology(deviceId);
    const cleanupSchema = this.#attachSchema(deviceId);
    const cleanupConfig = this.#attachConfig(deviceId); // currently a no-op

    return () => {
      cleanupTopology();
      cleanupSchema();
      cleanupConfig();
    };
  }

  // ─────────────────────────────────────
  //TOPOLOGY → applyTopologyEvent
  // ─────────────────────────────────────
  #attachTopology(deviceId: string): () => void {
    const handler: DeviceInfoUpdateHandler = (
      eventType: TopologyEventType,
      info: DeviceInfo
    ) => {
      const id = info.deviceId ?? deviceId;
      useDeviceStatusStore.getState().applyTopologyEvent(id, eventType);
    };

    TopologyConnector.inst.registerDeviceInfoMonitor(deviceId, handler);

    // Seed initial state
    const isOnline = TopologyConnector.inst.isDeviceOnline(deviceId);
    useDeviceStatusStore
      .getState()
      .applyTopologyEvent(
        deviceId,
        isOnline ? TopologyEventType.NEW : TopologyEventType.GONE
      );

    return () => {
      TopologyConnector.inst.unregisterDeviceInfoMonitor(deviceId, handler);
    };
  }

  // ─────────────────────────────────────
  // SCHEMA → markSchemaReceived
  // ─────────────────────────────────────
  #attachSchema(deviceId: string): () => void {
    const schemaHandler = (schema: DeviceSchemaInfo) => {
      // schema arrived → mark as received
      useDeviceStatusStore.getState().markSchemaReceived(schema.deviceId);
    };

    // Listen for schema updates
    // Note: DevicePropertyConnector is responsible for requesting the schema
    DeviceSchemaConnector.inst.registerSchemaMonitor(deviceId, schemaHandler);

    return () => {
      DeviceSchemaConnector.inst.unregisterSchemaMonitor(
        deviceId,
        schemaHandler
      );
    };
  }

  // ─────────────────────────────────────
  //CONFIG → MONITORING (via first property update)
  // ─────────────────────────────────────
  #attachConfig(_deviceId: string): () => void {
    // Device-level config is detected via attachConfigForProperty().
    return () => {};
  }

  /**
   * Attach monitoring to ANY property of this device.
   * First property update → markConfigReceived(deviceId).
   */
  attachConfigForProperty(deviceId: string, propertyId: string): () => void {
    let seenFirstUpdate = false;

    const handler = () => {
      if (seenFirstUpdate) return;
      seenFirstUpdate = true;
      useDeviceStatusStore.getState().markConfigReceived(deviceId);
    };

    DevicePropertyConnector.inst.registerPropertyMonitor(
      deviceId,
      propertyId,
      handler
    );

    return () => {
      DevicePropertyConnector.inst.unregisterPropertyMonitor(
        deviceId,
        propertyId,
        handler
      );
    };
  }
}

export const deviceStatusPipeline = DeviceOverlayIndicatorConnector.inst;

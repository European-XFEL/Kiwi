import { EventEmitter } from "events";
import {
  DeviceState,
  DeviceTopologyStatus,
  DeviceSchemaStatus,
  DeviceConfigStatus,
  DeviceIndicatorDescriptor,
} from "./types";

import { ProxyStatus } from "./enum";
import { DEVICE_INDICATORS } from "./overlay_indicator_constants";

/**
 * DeviceProxy - Local representation of a remote device
 *
 * This class:
 * - Holds device state (topology, schema, config)
 * - Manages monitoring lifecycle (reference counting)
 * - Emits events when state changes
 * - Computes ProxyStatus from component statuses
 */
export class DeviceProxy extends EventEmitter {
  // ────────────────────────────────────────────────────────────────────
  // STATE (private - accessed via getters)
  // ────────────────────────────────────────────────────────────────────

  private _state: DeviceState;

  // ────────────────────────────────────────────────────────────────────
  // LIFECYCLE TRACKING
  // ────────────────────────────────────────────────────────────────────

  /**
   * Number of PropertyProxy instances actively subscribed to this device
   * When this goes 0 → 1: transition to MONITORING state
   * When this goes N → 0: transition to ALIVE state
   */
  private _propertySubscriptionCount: number = 0;

  /**
   * Pipeline subscriptions (path → ref count)
   */
  private _pipelineSubscriptions: Map<string, number> = new Map();

  /**
   * Has topology data been received at least once?
   * Used to distinguish "fresh proxy" from "actually offline"
   */
  private _hasReceivedTopology: boolean = false;

  // ────────────────────────────────────────────────────────────────────
  // EVENTS
  // ────────────────────────────────────────────────────────────────────
  // emit('topology_changed', topology: DeviceTopologyStatus)
  // emit('schema_changed', schema: DeviceSchemaStatus)
  // emit('config_changed', config: DeviceConfigStatus)
  // emit('status_changed', oldStatus: ProxyStatus, newStatus: ProxyStatus)

  // ────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ────────────────────────────────────────────────────────────────────

  constructor(deviceId: string) {
    super();
    this._state = this._createInitialState(deviceId);
  }

  private _createInitialState(deviceId: string): DeviceState {
    return {
      deviceId,
      topology: {
        is_device_online: false,
      },
      schema: {
        requested_device_schema: false,
        received_device_schema: false,
      },
      config: {
        has_config: false,
      },
      // IMPORTANT: we start in UNKNOWN, not OFFLINE
      status: ProxyStatus.UNKNOWN,
    };
  }

  // ────────────────────────────────────────────────────────────────────
  // PUBLIC GETTERS (read-only access to state)
  // ────────────────────────────────────────────────────────────────────

  get deviceId(): string {
    return this._state.deviceId;
  }

  get status(): ProxyStatus {
    return this._state.status;
  }

  get topology(): DeviceTopologyStatus {
    return this._state.topology;
  }

  get schema(): DeviceSchemaStatus {
    return this._state.schema;
  }

  get config(): DeviceConfigStatus {
    return this._state.config;
  }

  /**
   * Get full state (for debugging or serialization)
   */
  get state(): Readonly<DeviceState> {
    return { ...this._state };
  }

  /**
   * Convenience: Is device online?
   */
  get isOnline(): boolean {
    return this._state.topology.is_device_online;
  }

  /**
   * Convenience: Has schema?
   */
  get hasSchema(): boolean {
    return this._state.schema.received_device_schema;
  }

  /**
   * Convenience: Has config?
   */
  get hasConfig(): boolean {
    return this._state.config.has_config;
  }

  /**
   * Current number of PropertyProxy subscriptions (for debugging)
   */
  get propertySubscriptionCount(): number {
    return this._propertySubscriptionCount;
  }

  // ────────────────────────────────────────────────────────────────────
  // LIFECYCLE MANAGEMENT (Reference Counting)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Register a PropertyProxy subscription to this device
   * Called by PropertyProxy when it starts monitoring a property
   */
  registerProperty(): void {
    this._propertySubscriptionCount++;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[DeviceProxy ${this.deviceId}] registerProperty: count = ${this._propertySubscriptionCount}`
      );
    }

    if (this._propertySubscriptionCount === 1) {
      // First PropertyProxy subscription! Start monitoring
      this._onFirstPropertySubscribed();
    }

    // Update status if needed (ALIVE → MONITORING)
    this._updateStatus();
  }

  /**
   * Unregister a PropertyProxy subscription from this device
   * Called by PropertyProxy when it stops monitoring a property
   */
  unregisterProperty(): void {
    if (this._propertySubscriptionCount === 0) {
      console.warn(
        `[DeviceProxy ${this.deviceId}] unregisterProperty called but count is 0!`
      );
      return;
    }

    this._propertySubscriptionCount--;

    if (process.env.NODE_ENV === "development") {
      console.log(
        `[DeviceProxy ${this.deviceId}] unregisterProperty: count = ${this._propertySubscriptionCount}`
      );
    }

    if (this._propertySubscriptionCount === 0) {
      // Last PropertyProxy unsubscribed! Stop monitoring
      this._onLastPropertyUnsubscribed();
    }

    // Update status if needed (MONITORING → ALIVE)
    this._updateStatus();
  }

  /**
   * Called when first PropertyProxy subscribes
   * Emits event for connectors to start monitoring
   */
  private _onFirstPropertySubscribed(): void {
    this.emit("start_monitoring", this.deviceId);
  }

  /**
   * Called when last PropertyProxy unsubscribes
   * Emits event for connectors to stop monitoring
   */
  private _onLastPropertyUnsubscribed(): void {
    this.emit("stop_monitoring", this.deviceId);
  }

  // ────────────────────────────────────────────────────────────────────
  // STATE UPDATE METHODS (called by connectors/store)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Update topology status (device online/offline)
   * Called by TopologyConnector
   */
  updateTopology(update: Partial<DeviceTopologyStatus>): void {
    // Mark that we've received at least one topology update
    this._hasReceivedTopology = true;

    this._state.topology = {
      ...this._state.topology,
      ...update,
    };

    this.emit("topology_changed", this._state.topology);
    this._updateStatus();
  }

  /**
   * Mark schema as requested
   * Called by DevicePropertyConnector
   */
  markSchemaRequested(): void {
    const now = Date.now();
    this._state.schema = {
      ...this._state.schema,
      requested_device_schema: true,
      last_changed_at: now,
    };

    this.emit("schema_changed", this._state.schema);
    this._updateStatus();
  }

  /**
   * Mark schema as received
   * Called by DeviceSchemaConnector
   */
  markSchemaReceived(): void {
    const now = Date.now();
    this._state.schema = {
      ...this._state.schema,
      requested_device_schema: true,
      received_device_schema: true,
      last_changed_at: now,
      schema_timestamp: now,
    };

    this.emit("schema_changed", this._state.schema);
    this._updateStatus();
  }

  /**
   * Mark config as received
   * Called by DevicePropertyConnector
   */
  markConfigReceived(): void {
    const now = Date.now();
    this._state.config = {
      ...this._state.config,
      has_config: true,
      last_config_timestamp: now,
    };

    this.emit("config_changed", this._state.config);
    this._updateStatus();
  }

  // ────────────────────────────────────────────────────────────────────
  // STATUS COMPUTATION (Core Logic!)
  // ────────────────────────────────────────────────────────────────────

  /**
   * Recompute status and emit event if changed
   */
  private _updateStatus(): void {
    const oldStatus = this._state.status;
    const newStatus = this._computeStatus();

    if (oldStatus !== newStatus) {
      this._state.status = newStatus;
      this.emit("status_changed", oldStatus, newStatus);

      if (process.env.NODE_ENV === "development") {
        console.log(
          `[DeviceProxy ${this.deviceId}] Status: ${oldStatus} → ${newStatus}`
        );
      }
    }
  }

  /**
   * PURE POLICY: Compute ProxyStatus from component statuses
   */
  private _computeStatus(): ProxyStatus {
    const { topology, schema, config } = this._state;

    // If we never got topology and nothing was requested yet,
    // we're in the "fresh page" state → UNKNOWN.
    if (
      !this._hasReceivedTopology &&
      !schema.requested_device_schema &&
      !schema.received_device_schema &&
      !config.has_config
    ) {
      return ProxyStatus.UNKNOWN;
    }

    // Rule 1: Offline if not in topology
    if (!topology.is_device_online) {
      return ProxyStatus.OFFLINE;
    }

    // Rule 2: Schema requested but not received
    if (schema.requested_device_schema && !schema.received_device_schema) {
      return ProxyStatus.SCHEMA_REQUESTED;
    }

    // Rule 3: Schema received but no config yet
    if (schema.received_device_schema && !config.has_config) {
      return ProxyStatus.SCHEMA_RECEIVED;
    }

    // Rule 4: Has schema + config, check PropertyProxy subscriptions
    if (schema.received_device_schema && config.has_config) {
      // If any PropertyProxy is subscribed, MONITORING; otherwise ALIVE
      return this._propertySubscriptionCount > 0
        ? ProxyStatus.MONITORING
        : ProxyStatus.ALIVE;
    }

    // Default: Device is online but nothing else
    return ProxyStatus.ONLINE;
  }

  // ────────────────────────────────────────────────────────────────────
  // UI HELPERS
  // ────────────────────────────────────────────────────────────────────

  /**
   * Get UI indicator descriptor for current status.
   * If status is UNKNOWN and you have no descriptor for it,
   * this returns null and nothing is shown.
   */
  getIndicatorDescriptor(): DeviceIndicatorDescriptor | null {
    return (
      DEVICE_INDICATORS.find((d) => d.status === this._state.status) ?? null
    );
  }

  // ────────────────────────────────────────────────────────────────────
  // PIPELINE MANAGEMENT
  // ────────────────────────────────────────────────────────────────────

  /**
   * Subscribe to a pipeline output
   */
  connectPipeline(path: string): void {
    const count = this._pipelineSubscriptions.get(path) || 0;
    if (count === 0) {
      this.emit("pipeline_connect", this.deviceId, path);
    }
    this._pipelineSubscriptions.set(path, count + 1);
  }

  /**
   * Unsubscribe from a pipeline output
   */
  disconnectPipeline(path: string): void {
    const count = this._pipelineSubscriptions.get(path) || 0;
    if (count === 1) {
      this.emit("pipeline_disconnect", this.deviceId, path);
      this._pipelineSubscriptions.delete(path);
    } else if (count > 1) {
      this._pipelineSubscriptions.set(path, count - 1);
    }
  }

  // ────────────────────────────────────────────────────────────────────
  // DEBUG
  // ────────────────────────────────────────────────────────────────────

  toString(): string {
    return `DeviceProxy(${this.deviceId}, status=${this.status}, properties=${this._propertySubscriptionCount})`;
  }
}

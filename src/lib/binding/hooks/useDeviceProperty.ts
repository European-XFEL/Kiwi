import * as React from 'react';
import { deviceManager } from '@/lib/binding/DeviceManager';
import { DevicePropertyConnector } from '@/singletons/DevicePropertyConnector';
import type { PropertyModel } from '@/lib/binding/model/types/PropertyType';
import type { HashValues } from '@/karabo-hash/hash';
import type { HashTypes } from '@/karabo-hash/typenums';
import { PropertyProxy } from '@/lib/binding/proxies/PropertyProxy';
import {
  buildPropertyDescriptor,
  type PropertyDescriptor,
} from '@/lib/binding/proxies/PropertyDescriptor';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { AccessLevel } from '@/karabo_data/SchemaEnums';
import type { EditContext } from '@/lib/binding/model/editability';
import { splitKaraboKeys } from '../utils/splitKaraboKeys';
import { ProxyStatus, PropertyStatus } from '@/lib/binding/ProxyStatus';
import {
  DEVICE_INDICATORS,
  PROPERTY_INDICATORS,
} from '@/lib/binding/overlay_indicator_constants';
import type {
  DeviceIndicatorDescriptor,
  PropertyIndicatorDescriptor,
} from '@/lib/binding/proxies/types';
import type { GuiStateColorKey } from '@/karabo_data/Indicators';
import { mapGuiStateColor } from '../utils/mapStateColor';
import { Timestamp } from '@/lib/binding/utils/timestamps';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

export interface UseDevicePropertyResult {
  value: HashValues | undefined;
  propertyModel: PropertyModel | undefined;
  timestamp: Timestamp | undefined;

  /** Runtime value type of the property */
  type: HashTypes | undefined;
  /** Declared schema type of the property */
  valueType: HashTypes | undefined;
  /** Declared schema default value */
  defaultValue: HashValues | undefined;

  // Device state
  deviceState: string | undefined;
  stateColor: GuiStateColorKey | undefined;

  // Identity
  deviceId: string | undefined;
  propertyPath: string | undefined;

  // Schema / editability
  descriptor: PropertyDescriptor | undefined;
  isEditable: boolean;
  schemaAttrs: PropertyDescriptor['schemaAttrs'] | undefined;

  // Device lifecycle
  proxyStatus: ProxyStatus;
  proxyIndicator: DeviceIndicatorDescriptor | undefined;

  // Derived flags
  isOffline: boolean;
  isAlive: boolean;
  isMonitoring: boolean;
  isOnlineLike: boolean;
  isReady: boolean;

  // Property-level status
  propertyStatus: PropertyStatus;
  propertyIndicator: PropertyIndicatorDescriptor | undefined;
}

interface PropertyData {
  propertyModel: PropertyModel | undefined;
  value: HashValues | undefined;
  timestamp: Timestamp | undefined;
}

interface DeviceRuntimeState {
  deviceState: string | undefined;
  proxyStatus: ProxyStatus;
}

// ─────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────

export function useDeviceProperty(
  karaboKeys: string | undefined
): UseDevicePropertyResult {
  // Parse "DEVICE.prop" → deviceId + propertyPath
  const { deviceId, propertyPath } = React.useMemo(() => {
    if (!karaboKeys?.includes('.')) {
      return { deviceId: '', propertyPath: '' };
    }
    return splitKaraboKeys(karaboKeys);
  }, [karaboKeys]);

  // Get user access level once
  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.Observer
  );

  //set property data state
  const [propertyData, setPropertyData] = React.useState<PropertyData>(() =>
    getInitialPropertyData(deviceId, propertyPath)
  );

  const [deviceRuntime, setDeviceRuntime] = React.useState<DeviceRuntimeState>(
    () => getInitialDeviceRuntime(deviceId)
  );

  const [isInitialized, setIsInitialized] = React.useState(false);

  // ─────────────────────────────────────────────────────────────────
  // Effects: Wire up subscriptions
  // ─────────────────────────────────────────────────────────────────

  React.useEffect(() => {
    if (!deviceId || !propertyPath) {
      setIsInitialized(false);
      return;
    }

    const deviceProxy = deviceManager.getDevice(deviceId);
    const propertyProxy = new PropertyProxy(deviceProxy, propertyPath);

    // Initialize with current values
    const currentPropertyModel = propertyProxy.model;
    if (currentPropertyModel) {
      setPropertyData({
        propertyModel: currentPropertyModel,
        value: currentPropertyModel.binding.value ?? undefined,
        timestamp: currentPropertyModel.binding.timestamp,
      });
    }

    // Initialize device runtime state
    setDeviceRuntime({
      deviceState: deviceProxy.state,
      proxyStatus: deviceProxy.proxyStatus,
    });

    // Start monitoring this property
    const stopMonitoring = DevicePropertyConnector.inst.ensurePropertyMonitored(
      deviceId,
      propertyPath
    );

    // Subscribe to property value changes
    const unsubscribeProperty = propertyProxy.subscribe(
      (newValue, newTimeAttrs) => {
        // Convert timeAttrs to Timestamp (validate structure first)
        let timestamp: Timestamp | undefined;
        if (
          newTimeAttrs &&
          // Note: basic JS Object has to be used because occasionally this
          // method is called with an empty object, '{}', as the newTimeAttrs
          // argument. Cannot assume newTimeAttrs is a HashAttributes instance.
          Object.hasOwn(newTimeAttrs, 'sec') &&
          Object.hasOwn(newTimeAttrs, 'frac')
        ) {
          try {
            timestamp = Timestamp.fromTimeAttrs(newTimeAttrs);
          } catch (err) {
            console.warn(
              `Failed to parse timestamp for ${deviceId}.${propertyPath}:`,
              err
            );
            timestamp = undefined;
          }
        }
        setPropertyData({
          propertyModel: propertyProxy.model,
          value: newValue,
          timestamp,
        });
      }
    );

    // Subscribe to schema changes
    const unsubscribeSchema = deviceProxy.subscribeToSchema((payload) => {
      if (payload.allChanged.includes(propertyPath)) {
        setPropertyData((prev) => ({
          ...prev,
          propertyModel: propertyProxy.model,
        }));
      }
    });

    // Subscribe to device state/status changes (OPTIMIZED: direct state instead of version counter)
    const updateDeviceRuntime = () => {
      setDeviceRuntime({
        deviceState: deviceProxy.state,
        proxyStatus: deviceProxy.proxyStatus,
      });
    };

    deviceProxy.subscribe('state_changed', updateDeviceRuntime);
    deviceProxy.subscribe('status_changed', updateDeviceRuntime);

    setIsInitialized(true);

    return () => {
      unsubscribeProperty();
      unsubscribeSchema();
      deviceProxy.unsubscribe('state_changed', updateDeviceRuntime);
      deviceProxy.unsubscribe('status_changed', updateDeviceRuntime);
      stopMonitoring();
    };
  }, [deviceId, propertyPath]);

  // ─────────────────────────────────────────────────────────────────
  // Derived-values: Compute descriptor, flags, and indicators
  // ─────────────────────────────────────────────────────────────────

  const derivedValues = React.useMemo(() => {
    if (!deviceId || !propertyPath) {
      return buildEmptyDerivedValues();
    }

    const proxy = deviceManager.getDevice(deviceId);
    const { propertyModel } = propertyData;
    const { deviceState: runtimeDeviceState, proxyStatus } = deviceRuntime;

    // Device state: prefer live propertyModel value if this IS the state property
    const deviceState =
      propertyPath === 'state' && propertyModel?.binding.value != null
        ? String(propertyModel.binding.value)
        : runtimeDeviceState;

    const stateColor = deviceState ? mapGuiStateColor(deviceState) : undefined;

    // Proxy status flags
    const proxyIndicator =
      DEVICE_INDICATORS.find((d) => d.status === proxyStatus) ?? undefined;

    const isOffline = proxyStatus === ProxyStatus.OFFLINE;
    const isAlive = proxyStatus === ProxyStatus.ALIVE;
    const isMonitoring = proxyStatus === ProxyStatus.MONITORING;
    const isOnlineLike =
      proxyStatus !== ProxyStatus.OFFLINE &&
      proxyStatus !== ProxyStatus.UNKNOWN;
    const isReady = proxy.hasSchema && proxy.hasConfig;

    // Build descriptor and editability
    let descriptor: PropertyDescriptor | undefined;
    let isEditable = false;
    let schemaAttrs: PropertyDescriptor['schemaAttrs'] | undefined;

    if (propertyModel) {
      const ctx: EditContext = { userAccessLevel, deviceState };
      descriptor = buildPropertyDescriptor(propertyModel, ctx);
      isEditable = descriptor.isEditable;
      schemaAttrs = descriptor.schemaAttrs;
    }

    // Property status: only MISSING if stable & initialized but no model
    const isStableAndReady =
      (isMonitoring || isAlive) && proxy.hasSchema && proxy.hasConfig;

    const propertyStatus =
      propertyPath !== 'state' &&
      isStableAndReady &&
      isInitialized &&
      !propertyModel
        ? PropertyStatus.MISSING
        : PropertyStatus.NONE;

    const propertyIndicator =
      PROPERTY_INDICATORS.find((p) => p.status === propertyStatus) ?? undefined;

    return {
      descriptor,
      isEditable,
      schemaAttrs,
      deviceState,
      stateColor,
      proxyStatus,
      proxyIndicator,
      propertyStatus,
      propertyIndicator,
      isOffline,
      isAlive,
      isMonitoring,
      isOnlineLike,
      isReady,
    };
  }, [
    deviceId,
    propertyPath,
    propertyData,
    deviceRuntime,
    userAccessLevel,
    isInitialized,
  ]);

  //memoize final result
  const result = React.useMemo((): UseDevicePropertyResult => {
    const { propertyModel, value, timestamp } = propertyData;
    const { schemaAttrs } = derivedValues;

    const valueType =
      (propertyModel?.schema.schemaAttrs.valueType as HashTypes | undefined) ??
      (schemaAttrs?.valueType as HashTypes | undefined);

    const type =
      (propertyModel?.binding.type as HashTypes | undefined) ?? valueType;

    const defaultValue =
      (propertyModel?.schema.schemaAttrs.defaultValue as
        | HashValues
        | undefined) ?? (schemaAttrs?.defaultValue as HashValues | undefined);

    return {
      // Property data
      propertyModel,
      value,
      timestamp,

      // Types
      type,
      valueType,
      defaultValue,

      // Identity
      deviceId: deviceId || undefined,
      propertyPath: propertyPath || undefined,

      // Derived values (spread once inside useMemo)
      ...derivedValues,
    };
  }, [propertyData, derivedValues, deviceId, propertyPath]);

  return result;
}

// ─────────────────────────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────────────────────────

function getInitialPropertyData(
  deviceId: string,
  propertyPath: string
): PropertyData {
  if (!deviceId || !propertyPath) {
    return {
      propertyModel: undefined,
      value: undefined,
      timestamp: undefined,
    };
  }

  const deviceProxy = deviceManager.getDevice(deviceId);
  const propertyProxy = new PropertyProxy(deviceProxy, propertyPath);
  const propertyModel = propertyProxy.model;

  return {
    propertyModel,
    value: propertyModel?.binding.value ?? undefined,
    timestamp: propertyModel?.binding.timestamp,
  };
}

function getInitialDeviceRuntime(deviceId: string): DeviceRuntimeState {
  if (!deviceId) {
    return {
      deviceState: undefined,
      proxyStatus: ProxyStatus.UNKNOWN,
    };
  }

  const deviceProxy = deviceManager.getDevice(deviceId);
  return {
    deviceState: deviceProxy.state,
    proxyStatus: deviceProxy.proxyStatus,
  };
}

function buildEmptyDerivedValues() {
  const fallbackIndicator =
    PROPERTY_INDICATORS.find((i) => i.status === PropertyStatus.MISSING) ??
    undefined;

  return {
    descriptor: undefined as PropertyDescriptor | undefined,
    isEditable: false,
    schemaAttrs: undefined as PropertyDescriptor['schemaAttrs'] | undefined,
    deviceState: undefined as string | undefined,
    stateColor: undefined as GuiStateColorKey | undefined,
    proxyStatus: ProxyStatus.UNKNOWN,
    proxyIndicator: undefined as DeviceIndicatorDescriptor | undefined,
    propertyStatus: PropertyStatus.MISSING,
    propertyIndicator: fallbackIndicator,
    isOffline: false,
    isAlive: false,
    isMonitoring: false,
    isOnlineLike: false,
    isReady: false,
  };
}

import * as React from 'react';
import { deviceManager } from '@/device/DeviceManager';
import { DevicePropertyConnector } from '@/karabo_connectors/DevicePropertyConnector';
import type { PropertyModel } from '@/device/device-model/types/PropertyType';
import type { HashValueType } from '@/karabo_hash/HashValueType';
import type { Attributes, HashTypes } from 'karabo-ts';
import { PropertyProxy } from '@/device/device-proxy/PropertyProxy';
import {
  buildPropertyDescriptor,
  type PropertyDescriptor,
} from '@/device/device-proxy/PropertyDescriptor';
import { useGlobalStore } from '@/store/globalAppStateStore';
import { AccessLevel } from '@/karabo_data/SchemaEnums';
import type { EditContext } from '@/device/device-model/editability';
import { splitKaraboKeys } from '@/components/shared/helpers/splitKaraboKeys';
import { ProxyStatus, PropertyStatus } from '@/device/enums';
import {
  DEVICE_INDICATORS,
  PROPERTY_INDICATORS,
} from '@/device/constants/overlay_indicator_constants';
import type {
  DeviceIndicatorDescriptor,
  PropertyIndicatorDescriptor,
} from '@/device/device-proxy/types';
import type { GuiStateColorKey } from '@/karabo_data/Indicators';
import { mapGuiStateColor } from '@/components/shared/helpers/mapStateColor';

export interface UseDevicePropertyResult {
  value: HashValueType | undefined;
  model: PropertyModel | undefined;
  timeAttrs: Attributes | undefined;

  /**
   * Runtime value type reported by config/live updates
   * (binding.type with fallback to schema.valueType).
   */
  type: HashTypes | undefined;

  /**
   * Declared schema type of the property.
   */
  valueType: HashTypes | undefined;

  /**
   * Declared schema default value.
   */
  defaultValue: HashValueType | undefined;

  // device state
  deviceState: string | undefined;
  stateColor: GuiStateColorKey | undefined;

  // identity
  deviceId: string | undefined;
  propertyPath: string | undefined;

  // schema / editability
  descriptor: PropertyDescriptor | undefined;
  isEditable: boolean;
  schemaAttrs: PropertyDescriptor['schemaAttrs'] | undefined;

  // device lifecycle
  proxyStatus: ProxyStatus;
  proxyIndicator: DeviceIndicatorDescriptor | undefined;

  // handy derived flags
  isOffline: boolean;
  isAlive: boolean;
  isMonitoring: boolean;
  isOnlineLike: boolean;
  isReady: boolean; // has schema + config

  // property-level status (MISSING vs NONE)
  propertyStatus: PropertyStatus;
  propertyIndicator: PropertyIndicatorDescriptor | undefined;
}

export function useDeviceProperty(
  karaboKeys: string | undefined
): UseDevicePropertyResult {
  // ─────────────────────────────────────────────
  // Parse "DEVICE.prop" → deviceId + propertyPath
  // ─────────────────────────────────────────────
  const { deviceId, propertyPath } = React.useMemo(() => {
    if (!karaboKeys || !karaboKeys.includes('.')) {
      return { deviceId: '', propertyPath: '' };
    }
    return splitKaraboKeys(karaboKeys);
  }, [karaboKeys]);

  // ─────────────────────────────────────────────
  // Synchronous initialisation (prevents flashes)
  // ─────────────────────────────────────────────
  const getInitialState = React.useCallback(() => {
    if (!deviceId || !propertyPath) {
      return {
        model: undefined as PropertyModel | undefined,
        value: undefined as HashValueType | undefined,
        timeAttrs: undefined as Attributes | undefined,
      };
    }

    const deviceProxy = deviceManager.getDevice(deviceId);
    const propertyProxy = new PropertyProxy(deviceProxy, propertyPath);
    const model = propertyProxy.model;

    return {
      model,
      value: (model?.binding.value ?? undefined) as HashValueType | undefined,
      timeAttrs: (model?.binding.timeAttrs ?? undefined) as
        | Attributes
        | undefined,
    };
  }, [deviceId, propertyPath]);

  const [model, setModel] = React.useState<PropertyModel | undefined>(
    () => getInitialState().model
  );
  const [value, setValue] = React.useState<HashValueType | undefined>(
    () => getInitialState().value
  );
  const [timeAttrs, setTimeAttrs] = React.useState<Attributes | undefined>(
    () => getInitialState().timeAttrs
  );

  // Version bump when device state / proxy status changes
  const [deviceStateVersion, setDeviceStateVersion] = React.useState(0);

  // Guard to know when the effect wiring is done
  const [isInitialized, setIsInitialized] = React.useState(false);

  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.Observer
  );

  // ─────────────────────────────────────────────
  // Wiring to DeviceProxy + backend monitoring
  // ─────────────────────────────────────────────
  React.useEffect(() => {
    if (!deviceId || !propertyPath) {
      setIsInitialized(false);
      return;
    }

    const deviceProxy = deviceManager.getDevice(deviceId);
    const propertyProxy = new PropertyProxy(deviceProxy, propertyPath);

    const currentModel = propertyProxy.model;
    if (currentModel) {
      setModel(currentModel);
      setValue(
        (currentModel.binding.value ?? undefined) as HashValueType | undefined
      );
      setTimeAttrs(
        (currentModel.binding.timeAttrs ?? undefined) as Attributes | undefined
      );
    }

    const stopMonitoring = DevicePropertyConnector.inst.ensurePropertyMonitored(
      deviceId,
      propertyPath
    );

    const unsubscribeProperty = propertyProxy.subscribe(
      (newValue, newTimeAttrs) => {
        setValue(newValue);
        setTimeAttrs(newTimeAttrs);
        setModel(propertyProxy.model);
      }
    );

    // schema change listener
    const unsubscribeSchema = deviceProxy.subscribeToSchema((payload) => {
      if (payload.allChanged.includes(propertyPath)) {
        // Refresh model reference so widgets can re-read schema attrs
        setModel(propertyProxy.model);
      }
    });

    const stateListener = () => {
      setDeviceStateVersion((v) => v + 1);
    };
    const statusListener = () => {
      setDeviceStateVersion((v) => v + 1);
    };

    deviceProxy.subscribe('state_changed', stateListener);
    deviceProxy.subscribe('status_changed', statusListener);

    setIsInitialized(true);

    return () => {
      unsubscribeProperty();
      unsubscribeSchema();
      deviceProxy.unsubscribe('state_changed', stateListener);
      deviceProxy.unsubscribe('status_changed', statusListener);
      stopMonitoring();
    };
  }, [deviceId, propertyPath]);

  // ─────────────────────────────────────────────
  // Derived descriptor, status flags, indicators
  // ─────────────────────────────────────────────
  const {
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
  } = React.useMemo(() => {
    // tie to deviceStateVersion so we recompute when device runtime changes
    void deviceStateVersion;

    if (!deviceId || !propertyPath) {
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

    const proxy = deviceManager.getDevice(deviceId);

    const proxyStatus = proxy.proxyStatus;
    const proxyIndicator =
      DEVICE_INDICATORS.find((d) => d.status === proxyStatus) ?? undefined;

    const isOffline = proxyStatus === ProxyStatus.OFFLINE;
    const isAlive = proxyStatus === ProxyStatus.ALIVE;
    const isMonitoring = proxyStatus === ProxyStatus.MONITORING;

    // "online-ish" = anything except OFFLINE/UNKNOWN
    const isOnlineLike =
      proxyStatus !== ProxyStatus.OFFLINE &&
      proxyStatus !== ProxyStatus.UNKNOWN;

    const isReady = proxy.hasSchema && proxy.hasConfig;

    // Device state:
    //  - if this hook is bound to "state", prefer the live model value
    //  - otherwise use cached runtime state from the proxy
    let deviceState: string | undefined;
    if (propertyPath === "state" && model?.binding.value != null) {
      deviceState = String(model.binding.value);
    } else {
      deviceState = proxy.state;
    }

    const stateColor = deviceState ? mapGuiStateColor(deviceState) : undefined;

    // Descriptor + editability
    let descriptor: PropertyDescriptor | undefined;
    let isEditable = false;
    let schemaAttrs: PropertyDescriptor['schemaAttrs'] | undefined;

    if (model) {
      const ctx: EditContext = {
        userAccessLevel,
        deviceState,
      };

      descriptor = buildPropertyDescriptor(model, ctx);
      isEditable = descriptor.isEditable;
      schemaAttrs = descriptor.schemaAttrs;
    }

    // Only mark property as MISSING when the proxy is stable & hook initialized
    const isStableAndReady =
      (isMonitoring || isAlive) && proxy.hasSchema && proxy.hasConfig;

    let propertyStatus: PropertyStatus = PropertyStatus.NONE;

    if (
      propertyPath !== 'state' &&
      isStableAndReady &&
      isInitialized &&
      !model
    ) {
      propertyStatus = PropertyStatus.MISSING;
    }

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
    model,
    userAccessLevel,
    deviceStateVersion,
    isInitialized,
  ]);

  // ─────────────────────────────────────────────
  // Schema vs runtime types & defaults
  // ─────────────────────────────────────────────

  // Declared schema type (what the schema says)
  const schemaValueType =
    (model?.schema.schemaAttrs.valueType as HashTypes | undefined) ??
    (schemaAttrs?.valueType as HashTypes | undefined);

  // Runtime type (what live updates say, with fallback to schema)
  const runtimeValueType =
    (model?.binding.type as HashTypes | undefined) ?? schemaValueType;

  const schemaDefaultValue =
    (model?.schema.schemaAttrs.defaultValue as HashValueType | undefined) ??
    (schemaAttrs?.defaultValue as HashValueType | undefined);

  // ─────────────────────────────────────────────
  // Final result object
  // ─────────────────────────────────────────────
  return {
    value,
    model,
    timeAttrs,

    //runtime vs schema split
    type: runtimeValueType,
    valueType: schemaValueType,
    defaultValue: schemaDefaultValue,

    deviceId: deviceId || undefined,
    deviceState,
    stateColor,
    propertyPath: propertyPath || undefined,
    descriptor,
    isEditable,
    schemaAttrs,
    proxyStatus,
    proxyIndicator,
    isOffline,
    isAlive,
    isMonitoring,
    isOnlineLike,
    isReady,
    propertyStatus,
    propertyIndicator,
  };
}

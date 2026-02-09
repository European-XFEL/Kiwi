import * as React from 'react';
import { getTopology } from '@/singletons/api';
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
import { splitKaraboKeys } from './utils/splitKaraboKeys';
import { ProxyStatus, PropertyStatus } from '@/lib/binding/ProxyStatus';
import {
  DEVICE_INDICATORS,
  PROPERTY_INDICATORS,
} from '@/lib/binding/overlay_indicator_constants';
import type {
  ProxyStatusIcon,
  ProxyBindingIcon,
} from '@/lib/binding/proxies/types';
import { Timestamp } from '@/lib/binding/utils/timestamps';

export interface UseDevicePropertyResult {
  value: HashValues | undefined;
  propertyModel: PropertyModel | undefined;
  timestamp: Timestamp | undefined;

  type: HashTypes | undefined;
  valueType: HashTypes | undefined;

  deviceState: string | undefined;

  deviceId: string | undefined;
  propertyPath: string | undefined;

  descriptor: PropertyDescriptor | undefined;
  isEditable: boolean;
  schemaAttrs: PropertyDescriptor['schemaAttrs'] | undefined;

  proxyStatus: ProxyStatus;
  missing: ProxyStatusIcon | undefined;

  isOffline: boolean;

  propertyStatus: PropertyStatus;
  propertyIndicator: ProxyBindingIcon | undefined;
}

interface PropertyData {
  propertyModel: PropertyModel | undefined;
  value: HashValues | undefined;
  timestamp: Timestamp | undefined;
}

interface ProxyStatusView {
  deviceState: string | undefined;
  proxyStatus: ProxyStatus;
}

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

  const userAccessLevel = useGlobalStore(
    (s) => s.sessionInfo?.accessLevel ?? AccessLevel.Observer
  );

  const [propertyData, setPropertyData] = React.useState<PropertyData>(() =>
    initializeProxyData(deviceId, propertyPath)
  );

  const [proxyView, setProxyView] = React.useState<ProxyStatusView>(() =>
    initializeProxyStatusView(deviceId)
  );

  React.useEffect(() => {
    if (!deviceId || !propertyPath) {
      setPropertyData({
        propertyModel: undefined,
        value: undefined,
        timestamp: undefined,
      });
      setProxyView({
        deviceState: undefined,
        proxyStatus: ProxyStatus.OFFLINE,
      });
      return;
    }

    const root_proxy = getTopology().getDevice(deviceId);
    const propertyProxy = new PropertyProxy(root_proxy, propertyPath);

    // Init property snapshot
    const currentPropertyModel = propertyProxy.model;
    setPropertyData({
      propertyModel: currentPropertyModel,
      value: currentPropertyModel?.binding.value ?? undefined,
      timestamp: currentPropertyModel?.binding.timestamp,
    });

    // Init device snapshot
    setProxyView({
      deviceState: root_proxy.state,
      proxyStatus: root_proxy.status,
    });

    // Start monitoring this device (global refcount)
    const stopMonitoring = root_proxy.addMonitor();

    // Property value changes
    const unsubscribeProperty = propertyProxy.subscribe(
      (newValue, newTimeAttrs) => {
        let timestamp: Timestamp | undefined;

        if (
          newTimeAttrs &&
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

    const unsubscribeSchema = root_proxy.subscribeToSchema((payload) => {
      if (payload.allChanged.includes(propertyPath)) {
        setPropertyData((prev) => ({
          ...prev,
          propertyModel: propertyProxy.model,
        }));
      }
    });

    const updateProxyView = () => {
      setProxyView({
        deviceState: root_proxy.state,
        proxyStatus: root_proxy.status,
      });
    };

    root_proxy.on('state_changed', updateProxyView);
    root_proxy.on('status_changed', updateProxyView);

    return () => {
      unsubscribeProperty();
      unsubscribeSchema();
      root_proxy.off('state_changed', updateProxyView);
      root_proxy.off('status_changed', updateProxyView);
      stopMonitoring();
    };
  }, [deviceId, propertyPath]);

  const derivedValues = React.useMemo(() => {
    if (!deviceId || !propertyPath) {
      return buildEmptyDerivedValues();
    }

    const { propertyModel } = propertyData;
    const { deviceState, proxyStatus } = proxyView;

    const missing =
      DEVICE_INDICATORS.find((d) => d.status === proxyStatus) ?? undefined;

    const isOffline = proxyStatus === ProxyStatus.OFFLINE;

    let descriptor: PropertyDescriptor | undefined;
    let isEditable = false;
    let schemaAttrs: PropertyDescriptor['schemaAttrs'] | undefined;

    if (propertyModel) {
      const ctx: EditContext = { userAccessLevel, deviceState };
      descriptor = buildPropertyDescriptor(propertyModel, ctx);
      isEditable = descriptor.isEditable;
      schemaAttrs = descriptor.schemaAttrs;
    }

    const propertyStatus = !propertyModel
      ? PropertyStatus.MISSING
      : PropertyStatus.NONE;

    const propertyIndicator =
      PROPERTY_INDICATORS.find((p) => p.status === propertyStatus) ?? undefined;

    return {
      descriptor,
      isEditable,
      schemaAttrs,
      deviceState,
      proxyStatus,
      missing,
      propertyStatus,
      propertyIndicator,
      isOffline,
    };
  }, [
    deviceId,
    propertyPath,
    propertyData.propertyModel,
    proxyView,
    userAccessLevel,
  ]);

  const result = React.useMemo((): UseDevicePropertyResult => {
    const { propertyModel, value, timestamp } = propertyData;
    const { schemaAttrs } = derivedValues;

    const valueType =
      (propertyModel?.schema.schemaAttrs.valueType as HashTypes | undefined) ??
      (schemaAttrs?.valueType as HashTypes | undefined);

    const type =
      (propertyModel?.binding.type as HashTypes | undefined) ?? valueType;

    return {
      propertyModel,
      value,
      timestamp,

      type,
      valueType,

      deviceId: deviceId || undefined,
      propertyPath: propertyPath || undefined,

      ...derivedValues,
    };
  }, [propertyData, derivedValues, deviceId, propertyPath]);

  return result;
}

function initializeProxyData(
  deviceId: string,
  propertyPath: string
): PropertyData {
  if (!deviceId || !propertyPath) {
    return { propertyModel: undefined, value: undefined, timestamp: undefined };
  }

  const root_proxy = getTopology().getDevice(deviceId);
  const propertyProxy = new PropertyProxy(root_proxy, propertyPath);
  const propertyModel = propertyProxy.model;

  return {
    propertyModel,
    value: propertyModel?.binding.value ?? undefined,
    timestamp: propertyModel?.binding.timestamp,
  };
}

function initializeProxyStatusView(deviceId: string): ProxyStatusView {
  if (!deviceId) {
    return { deviceState: undefined, proxyStatus: ProxyStatus.OFFLINE };
  }

  const root_proxy = getTopology().getDevice(deviceId);
  return {
    deviceState: root_proxy.state,
    proxyStatus: root_proxy.status,
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
    proxyStatus: ProxyStatus.OFFLINE,
    missing: undefined as ProxyStatusIcon | undefined,
    propertyStatus: PropertyStatus.NONE,
    propertyIndicator: fallbackIndicator,
    isOffline: false,
  };
}

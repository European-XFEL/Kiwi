import { act, renderHook, waitFor } from '@testing-library/react';

import {
  BindingRoot,
  DeviceProxy,
  NodeBinding,
  PropertyProxy,
  StringBinding,
} from '@/lib/binding/api';
import { createMockSystemTopology, SingletonContext } from '@/testing';

import { useProxies } from '../useProxies';

const makeTopology = createMockSystemTopology;

const makePipelineTopology = () => {
  const devices = new Map<string, DeviceProxy>();

  const getDevice = jest.fn((deviceId: string) => {
    let device = devices.get(deviceId);
    if (!device) {
      device = new DeviceProxy(deviceId);

      const rootBinding = new BindingRoot();
      const outputBinding = new NodeBinding();
      outputBinding.displayType = 'OutputChannel';
      outputBinding.value.set('value', new StringBinding({ value: 'initial' }));

      const otherOutputBinding = new NodeBinding();
      otherOutputBinding.displayType = 'OutputChannel';
      otherOutputBinding.value.set(
        'value',
        new StringBinding({ value: 'other' })
      );

      rootBinding.value!.set('channel', outputBinding);
      rootBinding.value!.set('otherChannel', otherOutputBinding);
      rootBinding.value!.set('plain', new StringBinding({ value: 'plain' }));
      device.binding = rootBinding;

      devices.set(deviceId, device);
    }
    return device;
  });

  return { devices, topology: { getDevice } };
};

const makeNetwork = () => ({
  onGetDeviceConfiguration: jest.fn(),
  onGetDeviceSchema: jest.fn(),
  onRequestNetwork: jest.fn(),
  onStartMonitoringDevice: jest.fn(),
  onStopMonitoringDevice: jest.fn(),
  onSubscribeToOutput: jest.fn(),
});

describe('useProxies', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('produces one real PropertyProxy per scene key', async () => {
    const topology = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const { result, unmount } = renderHook(() => useProxies(['DEV.speed']));

      await waitFor(() =>
        expect(result.current[0]).toBeInstanceOf(PropertyProxy)
      );

      expect(result.current).toHaveLength(1);
      unmount();
    });
  });

  it('preserves scene key order, including nested property paths', async () => {
    const topology = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const { result, unmount } = renderHook(() =>
        useProxies(['DEV_A.motor.speed.value', 'DEV_B.temp'])
      );

      await waitFor(() =>
        expect(result.current[1]).toBeInstanceOf(PropertyProxy)
      );

      expect(result.current[0]).toBeInstanceOf(PropertyProxy);
      expect(result.current[0].path).toBe('motor.speed.value');
      expect(result.current[1].path).toBe('temp');

      unmount();
    });
  });

  it('disposes proxies on unmount', async () => {
    const topology = makeTopology();
    const disposeSpy = jest.spyOn(PropertyProxy.prototype, 'dispose');

    await SingletonContext.run({ topology }, async () => {
      const { result, unmount } = renderHook(() => useProxies(['DEV.speed']));

      await waitFor(() =>
        expect(result.current[0]).toBeInstanceOf(PropertyProxy)
      );

      unmount();
      expect(disposeSpy).toHaveBeenCalled();
    });
  });

  it('recreates proxies and disposes old ones when keys change', async () => {
    const topology = makeTopology();
    const disposeSpy = jest.spyOn(PropertyProxy.prototype, 'dispose');

    await SingletonContext.run({ topology }, async () => {
      const { result, rerender, unmount } = renderHook(
        ({ keys }: { keys: string[] }) => useProxies(keys),
        { initialProps: { keys: ['DEV_A.speed'] } }
      );

      await waitFor(() =>
        expect(result.current[0]).toBeInstanceOf(PropertyProxy)
      );

      const firstProxy = result.current[0];

      rerender({ keys: ['DEV_B.temp'] });

      await waitFor(() =>
        expect(result.current[0]).toBeInstanceOf(PropertyProxy)
      );

      expect(result.current[0]).not.toBe(firstProxy);
      expect(disposeSpy).toHaveBeenCalled();

      unmount();
    });
  });

  it('does not replace the proxies array when a device update fires with unchanged state and status', async () => {
    const topology = makeTopology();

    await SingletonContext.run({ topology }, async () => {
      const { result, unmount } = renderHook(() => useProxies(['DEV_A.speed']));

      await waitFor(() =>
        expect(result.current[0]).toBeInstanceOf(PropertyProxy)
      );

      const proxiesBefore = result.current;
      const proxyBefore = result.current[0];

      act(() => {
        topology.getDevice('DEV_A').state_update.fire(undefined);
      });

      expect(result.current).toBe(proxiesBefore);
      expect(result.current[0]).toBe(proxyBefore);

      unmount();
    });
  });

  it('unsubscribes pipeline outputs when scene keys change away from a pipeline property', async () => {
    const { topology } = makePipelineTopology();
    const network = makeNetwork();

    await SingletonContext.run({ topology, network }, async () => {
      const { result, rerender, unmount } = renderHook(
        ({ keys }: { keys: string[] }) => useProxies(keys),
        { initialProps: { keys: ['DEV.channel.value'] } }
      );

      await waitFor(() =>
        expect(result.current[0]?.path).toBe('channel.value')
      );

      expect(network.onSubscribeToOutput).toHaveBeenCalledWith(
        'DEV',
        'channel',
        true
      );

      rerender({ keys: ['DEV.plain'] });

      await waitFor(() => expect(result.current[0]?.path).toBe('plain'));

      expect(network.onSubscribeToOutput).toHaveBeenCalledWith(
        'DEV',
        'channel',
        false
      );

      unmount();
    });
  });

  it('switches pipeline subscriptions when scene keys move between output channels', async () => {
    const { topology } = makePipelineTopology();
    const network = makeNetwork();

    await SingletonContext.run({ topology, network }, async () => {
      const { result, rerender, unmount } = renderHook(
        ({ keys }: { keys: string[] }) => useProxies(keys),
        { initialProps: { keys: ['DEV.channel.value'] } }
      );

      await waitFor(() =>
        expect(result.current[0]?.path).toBe('channel.value')
      );

      expect(network.onSubscribeToOutput).toHaveBeenNthCalledWith(
        1,
        'DEV',
        'channel',
        true
      );

      rerender({ keys: ['DEV.otherChannel.value'] });

      await waitFor(() =>
        expect(result.current[0]?.path).toBe('otherChannel.value')
      );

      expect(network.onSubscribeToOutput).toHaveBeenNthCalledWith(
        2,
        'DEV',
        'channel',
        false
      );
      expect(network.onSubscribeToOutput).toHaveBeenNthCalledWith(
        3,
        'DEV',
        'otherChannel',
        true
      );

      unmount();
    });
  });
});

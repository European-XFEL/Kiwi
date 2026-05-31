import { DeviceProxy } from '@/lib/binding/api';
import { SingletonContext } from '@/testing';

describe('DeviceProxy pipeline subscriptions', () => {
  it('shares one backend subscribe for repeated interest in the same output path', async () => {
    const network = {
      onSubscribeToOutput: jest.fn(),
      onRequestNetwork: jest.fn(),
      onStartMonitoringDevice: jest.fn(),
      onStopMonitoringDevice: jest.fn(),
      onGetDeviceSchema: jest.fn(),
      onGetDeviceConfiguration: jest.fn(),
    };

    await SingletonContext.run({ network }, async () => {
      const proxy = new DeviceProxy('TEST_KIWI');

      proxy.connectPipeline('channel');
      proxy.connectPipeline('channel');

      expect(network.onSubscribeToOutput).toHaveBeenCalledTimes(1);
      expect(network.onSubscribeToOutput).toHaveBeenCalledWith(
        'TEST_KIWI',
        'channel',
        true
      );

      proxy.disconnectPipeline('channel');
      expect(network.onSubscribeToOutput).toHaveBeenCalledTimes(1);

      proxy.disconnectPipeline('channel');
      expect(network.onSubscribeToOutput).toHaveBeenCalledTimes(2);
      expect(network.onSubscribeToOutput).toHaveBeenLastCalledWith(
        'TEST_KIWI',
        'channel',
        false
      );
    });
  });

  it('tracks different output paths independently', async () => {
    const network = {
      onSubscribeToOutput: jest.fn(),
      onRequestNetwork: jest.fn(),
      onStartMonitoringDevice: jest.fn(),
      onStopMonitoringDevice: jest.fn(),
      onGetDeviceSchema: jest.fn(),
      onGetDeviceConfiguration: jest.fn(),
    };

    await SingletonContext.run({ network }, async () => {
      const proxy = new DeviceProxy('TEST_KIWI');

      proxy.connectPipeline('channelA');
      proxy.connectPipeline('channelB');
      proxy.disconnectPipeline('channelA');
      proxy.disconnectPipeline('channelB');

      expect(network.onSubscribeToOutput.mock.calls).toEqual([
        ['TEST_KIWI', 'channelA', true],
        ['TEST_KIWI', 'channelB', true],
        ['TEST_KIWI', 'channelA', false],
        ['TEST_KIWI', 'channelB', false],
      ]);
    });
  });
});

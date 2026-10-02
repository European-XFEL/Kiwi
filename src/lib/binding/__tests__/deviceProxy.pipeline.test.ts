import { DeviceProxy, PropertyProxy } from '@/lib/binding/api';
import { Hash, NodeType, Schema } from '@/karabo/data/api';
import { SystemTopology } from '@/lib/topology/Topology';
import { SingletonContext } from '@/testing';

describe('DeviceProxy pipeline subscriptions', () => {
  it.each(['device', 'macro'])(
    'restores shared pipeline subscriptions after a %s goes offline and returns',
    async (instanceType) => {
      const network = {
        onSubscribeToOutput: jest.fn(),
        onRequestNetwork: jest.fn(),
        onStartMonitoringDevice: jest.fn(),
        onStopMonitoringDevice: jest.fn(),
        onGetDeviceSchema: jest.fn(),
        onGetDeviceConfiguration: jest.fn(),
      };

      await SingletonContext.run({ network }, async () => {
        const topology = new SystemTopology();
        const instance = new Hash(`${instanceType}.TEST_KIWI`, new Hash());
        topology.initialize(new Hash(`${instanceType}.TEST_KIWI`, new Hash()));
        const device = topology.getDevice('TEST_KIWI');

        const schemaHash = new Hash(
          'channel.schema.first',
          '',
          'channel.schema.second',
          ''
        );
        schemaHash.setAttributes('channel', {
          nodeType: NodeType.Node,
          displayType: 'OutputChannel',
        });
        schemaHash.setAttributes('channel.schema', { nodeType: NodeType.Node });
        for (const path of ['first', 'second']) {
          schemaHash.setAttributes(`channel.schema.${path}`, {
            nodeType: NodeType.Leaf,
            valueType: 'STRING',
          });
        }
        const schema = new Schema('TestDevice', schemaHash);
        topology.handleDeviceSchema('TEST_KIWI', schema);

        const first = new PropertyProxy(device, 'channel.schema.first');
        const second = new PropertyProxy(device, 'channel.schema.second');
        first.startMonitoring();
        second.startMonitoring();
        expect(device.pipeline_subscriptions.get('channel')).toBe(2);
        network.onSubscribeToOutput.mockClear();

        topology.updateTopology(
          new Hash(
            'changes',
            new Hash('gone', instance, 'new', new Hash(), 'update', new Hash())
          )
        );
        expect(device.isOnline).toBe(false);
        expect(device.pipeline_subscriptions.get('channel')).toBe(2);
        expect(network.onSubscribeToOutput).not.toHaveBeenCalled();

        topology.updateTopology(
          new Hash(
            'changes',
            new Hash('gone', new Hash(), 'new', instance, 'update', new Hash())
          )
        );
        expect(device.isOnline).toBe(true);
        expect(network.onGetDeviceSchema).toHaveBeenCalledWith('TEST_KIWI');
        expect(network.onSubscribeToOutput).not.toHaveBeenCalled();

        topology.handleDeviceSchema('TEST_KIWI', schema);
        expect(network.onSubscribeToOutput.mock.calls).toEqual([
          ['TEST_KIWI', 'channel', true],
        ]);
        expect(device.pipeline_subscriptions.get('channel')).toBe(2);

        topology.handleNetworkData(
          'TEST_KIWI:channel',
          new Hash('first', 'reconnected'),
          new Hash('timestamp', 0)
        );
        expect(first.value).toBe('reconnected');
        expect(network.onRequestNetwork).toHaveBeenCalledWith(
          'TEST_KIWI:channel'
        );

        device.setOnlineFlag(false);
        first.dispose();
        expect(device.pipeline_subscriptions.get('channel')).toBe(1);
        second.dispose();
        expect(device.pipeline_subscriptions.size).toBe(0);
        expect(network.onSubscribeToOutput).toHaveBeenLastCalledWith(
          'TEST_KIWI',
          'channel',
          false
        );

        network.onSubscribeToOutput.mockClear();
        device.setOnlineFlag(true);
        device.addMonitor();
        topology.handleDeviceSchema('TEST_KIWI', schema);
        expect(network.onSubscribeToOutput).not.toHaveBeenCalled();
      });
    }
  );

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

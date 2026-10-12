import {
  Hash,
  HashList,
  Schema,
  Timestamp,
  encodeBinary,
  decodeBinary,
} from '@/karabo/data/api';
import { NodeType } from '@/karabo/data/enums';
import { PropertyProxy, DoubleBinding } from '@/lib/binding/api';
import { SystemTopology } from '@/lib/topology/Topology';
import { SingletonContext } from '@/testing';
import { Network } from '../Network';
import { Manager } from '../Manager';
import { getLogger } from '../api';

it('encodes history requests and dispatches framed replies to shared property signals', () => {
  const network = new Network();
  const topology = new SystemTopology();
  const context = new SingletonContext({ network, topology });
  const manager = new Manager();
  const send = jest.spyOn(network, 'sendHash').mockImplementation(() => {});
  const device = topology.getDevice('A');
  device.binding.value!.set('value', new DoubleBinding());
  const first = new PropertyProxy(device, 'value');
  const second = new PropertyProxy(device, 'value');
  const other = new PropertyProxy(device, 'other');
  expect(first.historic_data).toBe(second.historic_data);
  expect(first.historic_data).not.toBe(other.historic_data);
  const anotherDevice = new PropertyProxy(topology.getDevice('B'), 'value');
  expect(first.historic_data).not.toBe(anotherDevice.historic_data);
  const anotherReceive = jest.fn();
  anotherDevice.historic_data.subscribe(anotherDevice, anotherReceive);
  first.getHistory({
    timeStart: '2026-01-01T00:00:00',
    timeEnd: '2026-01-02T00:00:00',
  });
  const request = decodeBinary(
    new Uint8Array(encodeBinary(send.mock.calls[0][0]))
  );
  expect(
    ['type', 'deviceId', 'property', 't0', 't1', 'maxNumData'].map((key) =>
      request.getValue(key)
    )
  ).toEqual([
    'getPropertyHistory',
    'A',
    'value',
    '2026-01-01T00:00:00',
    '2026-01-02T00:00:00',
    -1,
  ]);
  other.getHistory({ timeStart: '', timeEnd: '' });
  expect(send).toHaveBeenCalledTimes(1);
  const receive = jest.fn();
  const isolated = jest.fn();
  const unsubscribe = second.historic_data.subscribe(second, receive);
  other.historic_data.subscribe(other, isolated);
  first.dispose();
  const schemaHash = new Hash('value', new Hash());
  schemaHash.setAttributes('value', {
    nodeType: NodeType.Leaf,
    valueType: 'DOUBLE',
  });
  device.handleDeviceSchema(new Schema('Test', schemaHash));
  expect(first.historic_data).toBe(second.historic_data);
  second.binding!.setValue(2, new Timestamp(5));
  const timestamp = second.timestamp;
  const createDevice = jest.spyOn(topology, 'getDevice');
  const createSignal = jest.spyOn(device, 'getHistorySignal');
  const debug = jest.spyOn(getLogger(), 'debug');
  const sample = new Hash('v', 4);
  new Timestamp(10).toHashAttributes(sample);
  const history = new HashList([sample]);
  const frame = (success: boolean, id = 'A', property = 'value') => {
    const binary = new Uint8Array(
      encodeBinary(
        new Hash(
          'type',
          'propertyHistory',
          'success',
          success,
          'deviceId',
          id,
          'property',
          property,
          'data',
          history
        )
      )
    );
    const framed = new Uint8Array(binary.length + 4);
    framed.set(binary, 4);
    manager.processMessage(framed.buffer);
  };
  frame(true);
  expect(receive).toHaveBeenCalledTimes(1);
  expect(receive.mock.calls[0][0][0].getValue('v')).toBe(4);
  expect(second.value).toBe(2);
  expect(second.timestamp).toBe(timestamp);
  expect(anotherReceive).not.toHaveBeenCalled();
  expect(isolated).not.toHaveBeenCalled();
  frame(false);
  expect(debug).toHaveBeenCalledTimes(1);
  manager.handle_propertyHistory(
    new Hash('success', true, 'deviceId', 'A', 'property', 'value')
  );
  manager.handle_propertyHistory(
    new Hash(
      'success',
      true,
      'deviceId',
      'A',
      'property',
      'value',
      'data',
      'invalid'
    )
  );
  frame(true, 'B');
  expect(anotherReceive).toHaveBeenCalledTimes(1);
  frame(true, 'unknown');
  frame(true, 'A', 'unsolicited');
  expect(receive).toHaveBeenCalledTimes(1);
  expect(createDevice).not.toHaveBeenCalled();
  expect(createSignal).not.toHaveBeenCalled();
  unsubscribe();
  frame(true);
  expect(receive).toHaveBeenCalledTimes(1);
  second.dispose();
  other.dispose();
  anotherDevice.dispose();
  context.restore();
  jest.restoreAllMocks();
});

import { Hash } from '@/karabo/data/api';
import { Network } from '../Network';
import { getLogger, getNetwork } from '../api';
import { Logger } from '../Logger';
import { SingletonContext } from '@/testing';

describe('Network command logging', () => {
  let context: SingletonContext;

  beforeEach(() => {
    context = new SingletonContext({
      logger: new Logger(),
      network: new Network(),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    context.restore();
  });

  it('logs the device and property paths when requesting reconfiguration', () => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    const network = getNetwork();
    const sendHash = jest
      .spyOn(network, 'sendHash')
      .mockImplementation(() => {});
    const unsubscribe = getLogger().subscribe(jest.fn());
    const configuration = new Hash('speed', 3.5, 'node.temperature', 9);

    network.onReconfigure('DEVICE_A', configuration);

    expect(getLogger().getSnapshot()).toEqual([
      expect.objectContaining({
        level: 'info',
        message:
          'Request to reconfigure the properties "speed, node.temperature" of device "DEVICE_A"',
      }),
    ]);
    expect(sendHash).toHaveBeenCalledTimes(1);
    const request = sendHash.mock.calls[0][0] as Hash;
    expect(request.getValue('type')).toBe('reconfigure');
    expect(request.getValue('deviceId')).toBe('DEVICE_A');
    expect(request.getValue('configuration')).toBe(configuration);
    expect(request.getValue('reply')).toBe(true);
    unsubscribe();
  });

  it('logs the device and command while preserving the execute request', () => {
    jest.spyOn(console, 'info').mockImplementation(() => {});
    const network = getNetwork();
    const sendHash = jest
      .spyOn(network, 'sendHash')
      .mockImplementation(() => {});
    const unsubscribe = getLogger().subscribe(jest.fn());

    network.onExecute('DEVICE_A', 'start');

    expect(getLogger().getSnapshot()).toEqual([
      expect.objectContaining({
        level: 'info',
        message: 'Executing command "start" on device "DEVICE_A"',
      }),
    ]);
    expect(console.info).toHaveBeenCalledWith(
      'Executing command "start" on device "DEVICE_A"'
    );
    expect(sendHash).toHaveBeenCalledTimes(1);
    expect(sendHash).toHaveBeenCalledWith(
      new Hash(
        'type',
        'execute',
        'deviceId',
        'DEVICE_A',
        'command',
        'start',
        'reply',
        true
      )
    );
    unsubscribe();
  });
});

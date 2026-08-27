import { Hash } from '@/karabo/data/api';
import { Capabilities } from '@/karabo/data/api';
import { retrieveDeviceScene } from '../request';

const mockCallDeviceSlot = jest.fn();
const mockGetDeviceInstanceInfo = jest.fn();

jest.mock('../singletons/api', () => ({
  getManager: () => ({
    callDeviceSlot: mockCallDeviceSlot,
  }),
  getTopology: () => ({
    getDeviceInstanceInfo: mockGetDeviceInstanceInfo,
  }),
}));

describe('retrieveDeviceScene', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the scene model together with the device id on success', async () => {
    mockGetDeviceInstanceInfo.mockReturnValue(
      new Hash('capabilities', Capabilities.PROVIDES_SCENES)
    );
    mockCallDeviceSlot.mockImplementation((handler) => {
      handler(
        true,
        new Hash({
          payload: new Hash({
            data: '<svg width="100" height="50" version="1.1"></svg>',
            name: 'Device Scene',
          }),
          origin: 'DEVICE_A',
        })
      );
      return 'request-token';
    });

    const result = await retrieveDeviceScene('DEVICE_A', 'scene-a');

    expect(typeof result).toBe('object');
    expect(result).not.toBeNull();
    expect(result).not.toHaveProperty('deviceId', undefined);
    if (typeof result === 'string') {
      throw new Error('Expected device scene data');
    }
    expect(result.simple_name).toBe('DEVICE_A|scene-a');
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
    expect(result.uuid).toBeTruthy();
    expect(mockCallDeviceSlot).toHaveBeenCalledWith(
      expect.any(Function),
      'DEVICE_A',
      'requestScene',
      expect.any(Hash)
    );
  });

  it('returns an error when the device is not online', async () => {
    mockGetDeviceInstanceInfo.mockReturnValue(undefined);

    await expect(retrieveDeviceScene('DEVICE_A', 'scene-a')).resolves.toBe(
      'Device "DEVICE_A" not online. Cannot retrieve its "scene-a" scene.'
    );
    expect(mockCallDeviceSlot).not.toHaveBeenCalled();
  });
});

import { Hash } from '@/karabo/data/api';
import { DeviceProxy } from '@/lib/binding/api';
import { SystemTopology } from '@/lib/topology/Topology.ts';

export class MockDevice extends DeviceProxy {
  public stopMonitoring = jest.fn();

  public constructor(deviceId: string) {
    super(deviceId);
    const device = this as DeviceProxy;
    jest.spyOn(device, 'addMonitor').mockReturnValue(this.stopMonitoring);
  }
}

export class MockSystemTopology extends SystemTopology {
  public constructor() {
    super();
    this._system_hash = new Hash();
    jest
      .spyOn(this as SystemTopology, 'getDevice')
      .mockImplementation((deviceId) => this.getMockDevice(deviceId));
  }

  public override getDevice(deviceId: string): MockDevice {
    return this.getMockDevice(deviceId);
  }

  private getMockDevice(deviceId: string): MockDevice {
    let device = this.devices.get(deviceId);
    if (!device) {
      device = new MockDevice(deviceId);
      this.devices.set(deviceId, device);
    }
    return device as MockDevice;
  }
}

export function createMockSystemTopology(): MockSystemTopology {
  return new MockSystemTopology();
}

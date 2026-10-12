import { Hash } from '@/karabo/data/api';
import { DeviceProxy, InstanceStatus } from '@/lib/binding/api';
import { SystemTopology } from '../Topology';

function entry(kind: string, attrs: Record<string, unknown> = {}) {
  const hash = new Hash();
  hash.setElement(`${kind}.DEV`, new Hash(), attrs);
  return hash;
}

function change(action: string, entries: Hash) {
  const hash = new Hash();
  for (const key of ['new', 'update', 'gone']) {
    hash.set(`changes.${key}`, key === action ? entries : new Hash());
  }
  return hash;
}

test('instance status emits only changes without advancing controller revisions', () => {
  const proxy = new DeviceProxy('DEV');
  const owner = {};
  const listener = jest.fn();
  const revision = proxy.rootRevision;
  proxy.instance_status_update.subscribe(owner, listener);
  expect(proxy.instanceStatus).toBe(InstanceStatus.NONE);
  proxy.setInstanceStatus(InstanceStatus.OK);
  proxy.setInstanceStatus(InstanceStatus.OK);
  expect(listener.mock.calls).toEqual([[InstanceStatus.OK]]);
  expect(proxy.rootRevision).toBe(revision);
});

test('applies mixed instance batches in gone, new, update order', () => {
  const topology = new SystemTopology();
  const initial = new Hash();
  initial.setElement('device.DEV', new Hash(), { status: 'error' });
  initial.setElement('macro.MACRO', new Hash(), { status: 'ok' });
  initial.setElement('server.SERVER', new Hash());
  topology.initialize(initial);
  const device = topology.getDevice('DEV');
  const macro = topology.getDevice('MACRO');

  const gone = new Hash();
  gone.set('device.DEV', new Hash());
  gone.set('macro.MACRO', new Hash());
  gone.set('server.SERVER', new Hash());
  const added = new Hash();
  added.setElement('device.DEV', new Hash(), { status: 'ok', host: 'new' });
  added.setElement('macro.LATER', new Hash(), { status: 'unknown' });
  const updated = new Hash();
  updated.setElement('device.DEV', new Hash(), { host: 'updated' });
  updated.setElement('macro.LATER', new Hash(), { status: 'error' });
  const batch = new Hash();
  batch.set('changes.gone', gone);
  batch.set('changes.new', added);
  batch.set('changes.update', updated);
  topology.updateTopology(batch);

  expect(topology.getDevice('DEV')).toBe(device);
  expect(device.isOnline).toBe(true);
  expect(device.instanceStatus).toBe(InstanceStatus.OK);
  expect(topology.getDeviceInstanceInfo('DEV')?.getValue('host')).toBe(
    'updated'
  );
  expect(macro.isOnline).toBe(false);
  expect(macro.instanceStatus).toBe(InstanceStatus.NONE);
  expect(topology.getDevice('LATER').instanceStatus).toBe(InstanceStatus.ERROR);
  expect(topology._system_hash?.has('server.SERVER')).toBe(false);
});

describe.each(['device', 'macro'])('%s instance topology', (kind) => {
  test('safely looks up missing instances before and after initialization', () => {
    const topology = new SystemTopology();
    expect(topology.getDeviceInstanceInfo('DEV')).toBeUndefined();
    topology.initialize(new Hash());
    expect(topology.getDeviceInstanceInfo('DEV')).toBeUndefined();
  });

  test('hydrates cached and newly requested proxies from initialization', () => {
    const topology = new SystemTopology();
    const proxy = topology.getDevice('DEV');
    topology.initialize(entry(kind, { status: 'ok' }));
    expect(proxy.isOnline).toBe(true);
    expect(proxy.instanceStatus).toBe(InstanceStatus.OK);
    expect(topology.getDeviceInstanceInfo('DEV')?.getValue('status')).toBe(
      'ok'
    );
    const later = new SystemTopology();
    later.initialize(entry(kind, { status: 'error' }));
    expect(later.getDevice('DEV').instanceStatus).toBe(InstanceStatus.ERROR);
  });

  test('merges status-only and partial updates, disappearance, reappearance and clear', () => {
    const topology = new SystemTopology();
    topology.initialize(entry(kind, { status: 'ok', host: 'first' }));
    const proxy = topology.getDevice('DEV');
    const owner = {};
    const listener = jest.fn();
    proxy.instance_status_update.subscribe(owner, listener);
    topology.updateTopology(change('update', entry(kind, { status: 'error' })));
    expect(proxy.instanceStatus).toBe(InstanceStatus.ERROR);
    topology.updateTopology(change('update', entry(kind, { host: 'second' })));
    expect(proxy.instanceStatus).toBe(InstanceStatus.ERROR);
    expect(listener).toHaveBeenCalledTimes(1);
    topology.updateTopology(change('gone', entry(kind)));
    expect(proxy.isOnline).toBe(false);
    expect(proxy.instanceStatus).toBe(InstanceStatus.NONE);
    expect(topology.getDeviceInstanceInfo('DEV')).toBeUndefined();
    topology.updateTopology(change('new', entry(kind, { status: 'unknown' })));
    expect(topology.getDevice('DEV')).toBe(proxy);
    expect(proxy.isOnline).toBe(true);
    expect(proxy.instanceStatus).toBe(InstanceStatus.UNKNOWN);
    topology.clear();
    expect(proxy.isOnline).toBe(false);
    expect(proxy.instanceStatus).toBe(InstanceStatus.NONE);
    expect(topology.getDeviceInstanceInfo('DEV')).toBeUndefined();
  });

  test.each([
    [undefined, 'none'],
    ['unexpected', 'unknown'],
  ])('defaults status %s to %s', (status, expected) => {
    const topology = new SystemTopology();
    topology.initialize(entry(kind, status === undefined ? {} : { status }));
    expect(topology.getDevice('DEV').instanceStatus).toBe(expected);
  });

  test('reinitialization resets cached instances absent from the new topology', () => {
    const topology = new SystemTopology();
    topology.initialize(entry(kind, { status: 'ok' }));
    const proxy = topology.getDevice('DEV');
    topology.initialize(new Hash());
    expect(proxy.isOnline).toBe(false);
    expect(proxy.instanceStatus).toBe(InstanceStatus.NONE);
  });
});

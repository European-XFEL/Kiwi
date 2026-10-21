import { Hash } from '@/karabo/data/api';
import { InstanceStatus } from '@/lib/binding/api';
import { SingletonContext } from '@/testing';
import { KaraboEvent } from '@/lib/events';
import { Mediator } from '@/lib/singletons/Mediator';
import { SystemTopology } from '../Topology';

function entries(
  kind: string,
  id: string,
  attrs: Record<string, unknown> = {}
) {
  const hash = new Hash();
  const instances = new Hash();
  instances.setElement(id, new Hash(), attrs);
  hash.set(kind, instances);
  return hash;
}

function device(
  id = 'DEV',
  attrs: Record<string, unknown> = {},
  kind = 'device'
) {
  return entries(kind, id, {
    host: 'HOST',
    serverId: 'SERVER',
    classId: 'Class',
    capabilities: 0,
    status: 'ok',
    ...attrs,
  });
}

function initial() {
  const hash = device();
  hash.merge(entries('server', 'SERVER', { host: 'HOST', lang: 'python' }));
  hash.merge(device('OTHER'));
  hash.merge(device('MACRO', { classId: 'Macro' }, 'macro'));
  return hash;
}

function batch(
  topology: SystemTopology,
  changes: Partial<Record<'gone' | 'new' | 'update', Hash>>
) {
  const hash = new Hash();
  for (const kind of ['gone', 'new', 'update'] as const) {
    hash.set(`changes.${kind}`, changes[kind] ?? new Hash());
  }
  topology.updateTopology(hash);
}

test('initializes a React-independent host/server/class/device and macro tree', () => {
  const topology = new SystemTopology();
  const tree = topology.systemTree;
  const listener = jest.fn();
  tree.subscribe(listener);
  topology.initialize(initial());
  const [host] = tree.getSnapshot();
  const [server] = host.children!;
  expect(host.name).toBe('HOST');
  expect(server).toBe(tree.getInstanceNode('SERVER'));
  expect(server.children!.map((node) => node.name)).toEqual(['Class', 'Macro']);
  const dev = tree.getInstanceNode('DEV')!;
  expect(dev.parent).toBe(server.children![0]);
  expect(dev.parent!.parent).toBe(server);
  expect(dev.attributes.getValue('serverId')).toBe('SERVER');
  expect(dev.status).toBe(InstanceStatus.OK);
  expect(tree.getInstanceNode('MACRO')?.kind).toBe('macro');
  const visited: string[] = [];
  tree.visit((node) => {
    visited.push(node.name);
  });
  expect(visited).toEqual([
    'HOST',
    'SERVER',
    'Class',
    'DEV',
    'OTHER',
    'Macro',
    'MACRO',
  ]);
  expect(listener).toHaveBeenCalledTimes(1);
  topology.initialize(new Hash());
  expect(topology.systemTree).toBe(tree);
  expect(tree.getSnapshot()).toEqual([]);
  expect(tree.getInstanceNode('DEV')).toBeUndefined();
});

test('partial and unchanged updates preserve the snapshot and notify only changed decorations', () => {
  const topology = new SystemTopology();
  topology.initialize(initial());
  const tree = topology.systemTree;
  const snapshot = tree.getSnapshot();
  const dev = tree.getInstanceNode('DEV')!;
  const structural = jest.fn();
  const decoration = jest.fn();
  const other = jest.fn();
  tree.subscribe(structural);
  dev.subscribeDecoration(decoration);
  tree.getInstanceNode('OTHER')!.subscribeDecoration(other);
  batch(topology, { update: entries('device', 'DEV', { status: 'error' }) });
  expect(dev.status).toBe(InstanceStatus.ERROR);
  expect(dev.attributes.getValue('status')).toBe('error');
  expect(dev.attributes.getValue('classId')).toBe('Class');
  expect(topology.getDevice('DEV').instanceStatus).toBe(InstanceStatus.ERROR);
  batch(topology, { update: entries('device', 'DEV', { status: 'error' }) });
  batch(topology, { update: entries('server', 'SERVER', { log: 'DEBUG' }) });
  expect(tree.getSnapshot()).toBe(snapshot);
  expect(structural).not.toHaveBeenCalled();
  expect(decoration).toHaveBeenCalledTimes(1);
  expect(other).not.toHaveBeenCalled();
});

test('instance updates skip unknown and removed instances without changing the hierarchy', () => {
  const topology = new SystemTopology();
  topology.initialize(initial());
  const tree = topology.systemTree;
  batch(topology, { gone: device('DEV') });
  const snapshot = tree.getSnapshot();
  const updates = device('DEV', { status: 'error' });
  updates.merge(device('UNKNOWN', { status: 'error' }));
  updates.merge(device('UNKNOWN_MACRO', {}, 'macro'));
  updates.merge(entries('server', 'UNKNOWN_SERVER', { host: 'OTHER_HOST' }));
  batch(topology, { update: updates });
  for (const id of ['DEV', 'UNKNOWN', 'UNKNOWN_MACRO', 'UNKNOWN_SERVER']) {
    expect(tree.getInstanceNode(id)).toBeUndefined();
  }
  expect(tree.getSnapshot()).toBe(snapshot);
  batch(topology, { new: device('UNKNOWN') });
  expect(tree.getInstanceNode('UNKNOWN')?.status).toBe(InstanceStatus.OK);
});

test('publishes structure against the completed source', () => {
  const topology = new SystemTopology();
  topology.initialize(initial());
  const tree = topology.systemTree;
  const events: string[] = [];
  tree.subscribe(() => {
    events.push('structure');
    expect(tree.getInstanceNode('DEV')).toBeUndefined();
    expect(tree.getInstanceNode('LATE')?.status).toBe(InstanceStatus.ERROR);
  });
  tree.batch(() => {
    batch(topology, { update: entries('device', 'DEV', { status: 'error' }) });
    batch(topology, { gone: device() });
    batch(topology, { new: device('LATE') });
    batch(topology, { update: entries('device', 'LATE', { status: 'error' }) });
  });
  expect(events).toEqual(['structure']);
});

test('prunes only emptied branches and preserves surviving identities in one mixed batch', () => {
  const topology = new SystemTopology();
  topology.initialize(initial());
  const tree = topology.systemTree;
  const other = tree.getInstanceNode('OTHER')!;
  const parent = other.parent;
  const host = tree.getSnapshot()[0];
  const structural = jest.fn();
  tree.subscribe(structural);
  batch(topology, {
    gone: device(),
    new: device('LATER'),
    update: entries('device', 'LATER', { status: 'unknown' }),
  });
  expect(tree.getInstanceNode('DEV')).toBeUndefined();
  expect(tree.getInstanceNode('OTHER')).toBe(other);
  expect(other.parent).toBe(parent);
  expect(tree.getSnapshot()[0]).toBe(host);
  expect(parent!.children!.map((node) => node.name)).toEqual([
    'OTHER',
    'LATER',
  ]);
  expect(tree.getInstanceNode('LATER')?.status).toBe(InstanceStatus.UNKNOWN);
  expect(structural).toHaveBeenCalledTimes(1);
  batch(topology, { gone: device('MACRO', {}, 'macro') });
  expect(tree.getInstanceNode('SERVER')!.children).toEqual([parent]);
  batch(topology, { gone: entries('server', 'SERVER') });
  expect(tree.getSnapshot()).toEqual([]);
  expect(tree.getInstanceNode('OTHER')).toBeUndefined();
});

test('inserts servers before devices in a batch and omits missing metadata or servers', () => {
  const topology = new SystemTopology();
  topology.initialize(new Hash());
  const added = device();
  added.merge(entries('server', 'SERVER', { host: 'HOST' }));
  added.merge(device('ORPHAN', { serverId: 'MISSING' }));
  added.merge(
    entries('device', 'INCOMPLETE', { host: 'HOST', serverId: 'SERVER' })
  );
  added.merge(device('WRONG_HOST', { host: 'OTHER_HOST' }));
  batch(topology, { new: added });
  expect(topology.systemTree.getInstanceNode('DEV')).toBeDefined();
  for (const id of ['ORPHAN', 'INCOMPLETE', 'WRONG_HOST']) {
    expect(topology.systemTree.getInstanceNode(id)).toBeUndefined();
  }
  const listener = jest.fn();
  topology.systemTree.subscribe(listener);
  const snapshot = topology.systemTree.getSnapshot();
  batch(topology, { new: device() });
  expect(topology.systemTree.getSnapshot()).toBe(snapshot);
  expect(listener).not.toHaveBeenCalled();
});

test('monitoring updates notify only changed decorations without structural changes', () => {
  const topology = new SystemTopology();
  topology.initialize(initial());
  const tree = topology.systemTree;
  const dev = tree.getInstanceNode('DEV')!;
  const structural = jest.fn();
  const decoration = jest.fn();
  tree.subscribe(structural);
  dev.subscribeDecoration(decoration);
  tree.setMonitoring('DEV', true);
  tree.setMonitoring('DEV', true);
  expect(dev.monitoring).toBe(true);
  expect(decoration).toHaveBeenCalledTimes(1);
  tree.setMonitoring('DEV', false);
  expect(dev.monitoring).toBe(false);
  expect(decoration).toHaveBeenCalledTimes(2);
  expect(structural).not.toHaveBeenCalled();
});

test('proxies broadcast monitoring transitions without topology receiving them', () => {
  const mediator = new Mediator();
  const start = jest.fn();
  const stop = jest.fn();
  mediator.on(KaraboEvent.StartMonitoringDevice, start);
  mediator.on(KaraboEvent.StopMonitoringDevice, stop);
  const context = new SingletonContext({
    mediator,
    network: {
      onGetDeviceSchema: jest.fn(),
      onStopMonitoringDevice: jest.fn(),
    },
  });
  try {
    const topology = new SystemTopology();
    const proxy = topology.getDevice('DEV');
    const release = proxy.addMonitor();
    topology.initialize(initial());
    const tree = topology.systemTree;
    const dev = tree.getInstanceNode('DEV')!;
    expect(dev.monitoring).toBe(false);
    const structural = jest.fn();
    const decoration = jest.fn();
    tree.subscribe(structural);
    dev.subscribeDecoration(decoration);
    const releaseSecond = proxy.addMonitor();
    release();
    expect(proxy.isMonitoring).toBe(true);
    expect(decoration).not.toHaveBeenCalled();
    releaseSecond();
    expect(proxy.isMonitoring).toBe(false);
    expect(dev.monitoring).toBe(false);
    expect(decoration).not.toHaveBeenCalled();
    expect(structural).not.toHaveBeenCalled();
    expect(start.mock.calls).toEqual([[{ device_id: 'DEV' }]]);
    expect(stop.mock.calls).toEqual([[{ device_id: 'DEV' }]]);
    topology.clear();
    expect(tree.getSnapshot()).toEqual([]);
    topology.clear();
    expect(structural).toHaveBeenCalledTimes(1);
  } finally {
    context.restore();
  }
});

test('destroying a monitored proxy broadcasts its final stop transition', () => {
  const mediator = new Mediator();
  const stop = jest.fn();
  mediator.on(KaraboEvent.StopMonitoringDevice, stop);
  const context = new SingletonContext({
    mediator,
    network: { onStopMonitoringDevice: jest.fn() },
  });
  try {
    const proxy = new SystemTopology().getDevice('OFFLINE');
    proxy.addMonitor();
    proxy.destroy();
    proxy.destroy();
    expect(proxy.isMonitoring).toBe(false);
    expect(stop.mock.calls).toEqual([[{ device_id: 'OFFLINE' }]]);
  } finally {
    context.restore();
  }
});

import { AccessLevel, Hash, HashAttributes } from '@/karabo/data/api';
import {
  DeviceProxy,
  NodeBinding,
  StringBinding,
  Int32Binding,
  ProxyStatus,
} from '@/lib/binding/api';
import { ConfigurationTreeModel } from '../ConfigurationTreeModel';

function device() {
  const root = new DeviceProxy('DEV');
  root.isOnline = true;
  root.status = ProxyStatus.SCHEMA;
  const group = new NodeBinding();
  group.value.set(
    'reading',
    new Int32Binding({
      attributes: new HashAttributes({ displayedName: 'Reading' }),
    })
  );
  group.value.set(
    'expert',
    new StringBinding({
      attributes: new HashAttributes({
        requiredAccessLevel: AccessLevel.EXPERT,
      }),
    })
  );
  root.binding.value!.set('group', group);
  root.binding.value!.set('state', new StringBinding());
  jest.spyOn(root, 'addMonitor').mockReturnValue(jest.fn());
  return root;
}

test('keeps schema order and dotted paths, filters namespaces and creates proxies lazily', () => {
  const root = device();
  const model = new ConfigurationTreeModel();
  model.setRoot(root);
  const data = model.getSnapshot();
  expect(data.map((node) => node.id)).toEqual(['group', 'state']);
  expect(data[0].children?.map((node) => [node.id, node.name])).toEqual([
    ['group.reading', 'Reading'],
  ]);
  const subscribe = jest.spyOn(root.schema_update, 'subscribe');
  expect(subscribe).not.toHaveBeenCalled();
  const proxy = data[0].children![0].getProxy();
  expect(proxy.key).toBe('DEV.group.reading');
  expect(data[0].children![0].getProxy()).toBe(proxy);
  expect(subscribe).toHaveBeenCalledTimes(1);
  model.setVisibility(AccessLevel.EXPERT);
  expect(model.getSnapshot()[0].children?.map((node) => node.id)).toEqual([
    'group.reading',
    'group.expert',
  ]);
  model.dispose();
});

test('indexes filtered schema paths without creating proxies and clears stale paths on replacement', () => {
  const root = device();
  const subscribe = jest.spyOn(root.schema_update, 'subscribe');
  const model = new ConfigurationTreeModel();
  model.setRoot(root);
  expect(model.getNode('group.reading')).toBe(
    model.getSnapshot()[0].children![0]
  );
  expect(model.getNode('group.expert')).toBeUndefined();
  expect(model.getNode('missing')).toBeUndefined();
  expect(subscribe).toHaveBeenCalledTimes(1);

  model.setVisibility(AccessLevel.EXPERT);
  const expert = model.getNode('group.expert')!;
  const proxy = expert.getProxy();
  model.setVisibility(AccessLevel.OPERATOR);
  expect(model.getNode('group.expert')).toBeUndefined();
  model.setVisibility(AccessLevel.EXPERT);
  expect(model.getNode('group.expert')!.getProxy()).toBe(proxy);

  root.binding.value!.set('group', new StringBinding());
  root.schema_update.fire();
  expect(model.getNode('group')?.children).toBeUndefined();
  expect(model.getNode('group.reading')).toBeUndefined();
  expect(model.getNode('group.expert')).toBeUndefined();

  const other = device();
  other.binding.value!.clear_namespace();
  other.binding.value!.set('other', new StringBinding());
  model.setRoot(other);
  expect(model.getNode('group')).toBeUndefined();
  expect(model.getNode('state')).toBeUndefined();
  expect(model.getNode('other')).toBe(model.getSnapshot()[0]);
  model.dispose();
  expect(model.getNode('other')).toBeUndefined();
});

test('publishes complete configuration and status through values without replacing hierarchy', () => {
  const root = device();
  const model = new ConfigurationTreeModel();
  model.setRoot(root);
  const hierarchy = model.getSnapshot();
  const observed: unknown[] = [];
  const remove = root.config_update.subscribe(model, () =>
    observed.push([
      root.state,
      root.getBinding('group.reading')?.getValue(),
      root.status,
    ])
  );
  const before = model.getValueSnapshot();
  root.handleDeviceConfiguration(
    new Hash('group.reading', 42, 'state', 'ACTIVE')
  );
  expect(observed).toEqual([['ACTIVE', 42, ProxyStatus.ALIVE]]);
  expect(model.getValueSnapshot()).toBeGreaterThan(before);
  expect(model.getSnapshot()).toBe(hierarchy);
  remove();
  model.dispose();
});

test('schema replacement disposes cached proxies and replaces metadata and children', () => {
  const root = device();
  const model = new ConfigurationTreeModel();
  model.setRoot(root);
  const old = model.getSnapshot()[0].children![0].getProxy();
  const dispose = jest.spyOn(old, 'dispose');
  root.binding.value!.set(
    'group',
    new StringBinding({
      attributes: new HashAttributes({ displayedName: 'Replaced' }),
    })
  );
  root.binding.value!.set('added', new StringBinding());
  root.schema_update.fire();
  expect(dispose).toHaveBeenCalledTimes(1);
  expect(model.getSnapshot().map((node) => node.name)).toEqual([
    'Replaced',
    'state',
    'added',
  ]);
  expect(model.getSnapshot()[0].children).toBeUndefined();
  model.dispose();
});

test('owns one monitor and releases it on switching, offline and repeated cleanup', () => {
  const first = device();
  const second = device();
  const releaseFirst = jest.fn();
  const releaseSecond = jest.fn();
  jest.mocked(first.addMonitor).mockReturnValue(releaseFirst);
  jest.mocked(second.addMonitor).mockReturnValue(releaseSecond);
  const model = new ConfigurationTreeModel();
  model.setRoot(first);
  model.setRoot(first);
  expect(first.addMonitor).toHaveBeenCalledTimes(1);
  model.setRoot(second);
  expect(releaseFirst).toHaveBeenCalledTimes(1);
  second.setOnlineFlag(false);
  expect(model.root).toBeUndefined();
  expect(model.getSnapshot()).toEqual([]);
  expect(releaseSecond).toHaveBeenCalledTimes(1);
  model.dispose();
  model.dispose();
  expect(releaseSecond).toHaveBeenCalledTimes(1);
});

test('does not acquire a monitor for an offline selection', () => {
  const root = device();
  root.isOnline = false;
  root.status = ProxyStatus.OFFLINE;
  const model = new ConfigurationTreeModel();
  model.setRoot(root);
  expect(model.root).toBeUndefined();
  expect(root.addMonitor).not.toHaveBeenCalled();
  model.dispose();
});

test('notifies value subscribers once after the complete configuration and status update', () => {
  const root = device();
  const model = new ConfigurationTreeModel();
  model.setRoot(root);
  const observed: unknown[] = [];
  const remove = model.subscribeValues(() =>
    observed.push([
      root.state,
      root.getBinding('group.reading')?.getValue(),
      root.status,
    ])
  );
  root.handleDeviceConfiguration(
    new Hash('group.reading', 42, 'state', 'ACTIVE')
  );
  expect(observed).toEqual([['ACTIVE', 42, ProxyStatus.ALIVE]]);
  remove();
  model.dispose();
});

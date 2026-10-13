import { Hash } from '@/karabo/data/api';
import { SystemTopology } from '@/lib/topology/Topology';
import { SingletonContext } from '@/testing';
import { Manager } from '../Manager';
import { Mediator } from '../Mediator';

test('naturally sorts initial servers by host, preserving ties, attributes and device arrival order', () => {
  const topology = new SystemTopology();
  const context = new SingletonContext({
    topology,
    mediator: new Mediator(),
    network: {},
  });
  try {
    const initial = new Hash();
    for (const [id, host] of [
      ['S10', 'host10'],
      ['S2B', 'host2'],
      ['S2A', 'host2'],
      ['S1', 'host1'],
    ]) {
      initial.setElement(`server.${id}`, new Hash('value', id), {
        host,
        lang: 'python',
        log: 'DEBUG',
      });
    }
    for (const id of ['device10', 'device2']) {
      initial.setElement(`device.${id}`, new Hash(), {
        host: 'host2',
        serverId: 'S2B',
        classId: 'Class',
        capabilities: 0,
        status: 'ok',
      });
    }
    const manager = new Manager();
    manager.handle_systemTopology(new Hash('systemTopology', initial));
    expect(topology.systemTree.getSnapshot().map((node) => node.name)).toEqual([
      'host1',
      'host2',
      'host10',
    ]);
    expect(
      topology.systemTree.getSnapshot()[1].children!.map((node) => node.name)
    ).toEqual(['S2B', 'S2A']);
    expect(
      topology.systemTree
        .getInstanceNode('S2B')!
        .children![0].children!.map((node) => node.name)
    ).toEqual(['device10', 'device2']);
    expect(
      initial.getValue<Hash>('server').getValue<Hash>('S2B').getValue('value')
    ).toBe('S2B');
    expect(
      topology.systemTree.getInstanceNode('S2B')!.attributes.getValue('log')
    ).toBe('DEBUG');
    const added = new Hash();
    added.setElement('server.S0', new Hash(), { host: 'host0' });
    manager.handle_topologyUpdate(
      new Hash(
        'changes',
        new Hash('gone', new Hash(), 'new', added, 'update', new Hash())
      )
    );
    expect(topology.systemTree.getSnapshot().map((node) => node.name)).toEqual([
      'host1',
      'host2',
      'host10',
      'host0',
    ]);
  } finally {
    topology.clear();
    context.restore();
  }
});

test('initial topology without server entries remains valid', () => {
  const topology = new SystemTopology();
  const context = new SingletonContext({
    topology,
    mediator: new Mediator(),
    network: {},
  });
  try {
    new Manager().handle_systemTopology(new Hash('systemTopology', new Hash()));
    expect(topology.initialized).toBe(true);
    expect(topology.systemTree.getSnapshot()).toEqual([]);
  } finally {
    topology.clear();
    context.restore();
  }
});

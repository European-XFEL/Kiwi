import { Hash, HashAttributes } from '@/karabo/data/api';
import { InstanceStatus } from '../binding/InstanceStatus';
import { Signal } from '../utils';

type NodeKind = 'host' | 'server' | 'class' | 'device' | 'macro';

function instanceStatus(status: unknown): InstanceStatus {
  if (status === undefined) {
    return InstanceStatus.NONE;
  }
  if (Object.values(InstanceStatus).includes(status as InstanceStatus)) {
    return status as InstanceStatus;
  }
  return InstanceStatus.UNKNOWN;
}

export class SystemTreeNode {
  public children: SystemTreeNode[] | null;
  public status = InstanceStatus.NONE;
  public monitoring = false;
  private decorationRevision = 0;
  private readonly decorationChanged = new Signal();

  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly kind: NodeKind,
    public readonly parent: SystemTreeNode | null,
    public attributes = new HashAttributes()
  ) {
    this.children = kind === 'device' || kind === 'macro' ? null : [];
    this.status = instanceStatus(attributes.findValue('status'));
  }

  public subscribeDecoration = (listener: () => void): (() => void) =>
    this.decorationChanged.subscribe(this, listener);

  public getDecorationSnapshot = (): number => this.decorationRevision;

  public updateAttributes(attributes: HashAttributes): void {
    for (const [key, value] of attributes) {
      this.attributes.set(key, value);
    }
    const status = instanceStatus(this.attributes.findValue('status'));
    if (this.status !== status) {
      this.status = status;
      this.notifyDecoration();
    }
  }

  public setMonitoring(monitoring: boolean): void {
    if (this.monitoring !== monitoring) {
      this.monitoring = monitoring;
      this.notifyDecoration();
    }
  }

  private notifyDecoration(): void {
    this.decorationRevision += 1;
    this.decorationChanged.fire();
  }
}

/** Session topology independent of React; snapshots change only with hierarchy. */
export class SystemTree {
  private roots: SystemTreeNode[] = [];
  private readonly instances = new Map<string, SystemTreeNode>();
  private readonly structureChanged = new Signal();
  private batchDepth = 0;
  private hierarchyChanged = false;

  public getSnapshot = (): SystemTreeNode[] => this.roots;

  public subscribe = (listener: () => void): (() => void) =>
    this.structureChanged.subscribe(this, listener);

  public getInstanceNode(instanceId: string): SystemTreeNode | undefined {
    return this.instances.get(instanceId);
  }

  public visit(visitor: (node: SystemTreeNode) => boolean | void): void {
    const visit = (nodes: SystemTreeNode[]): boolean => {
      for (const node of nodes) {
        if (visitor(node) || (node.children && visit(node.children))) {
          return true;
        }
      }
      return false;
    };
    visit(this.roots);
  }

  public batch(update: () => void): void {
    this.batchDepth += 1;
    try {
      update();
    } finally {
      this.batchDepth -= 1;
      if (this.batchDepth === 0 && this.hierarchyChanged) {
        this.hierarchyChanged = false;
        this.roots = [...this.roots];
        this.structureChanged.fire();
      }
    }
  }

  public initialize(topology: Hash): void {
    this.batch(() => {
      this.clear();
      this.update(topology, topology);
    });
  }

  public clear(): void {
    this.batch(() => {
      if (this.roots.length) {
        this.roots = [];
        this.instances.clear();
        this.hierarchyChanged = true;
      }
    });
  }

  /** Use merged attributes but only touch the instances named by this batch. */
  public update(entries: Hash, topology: Hash): void {
    this.batch(() => {
      for (const kind of ['server', 'device', 'macro'] as const) {
        if (!entries.has(kind)) {
          continue;
        }
        const instances = topology.getValue<Hash>(kind);
        for (const id of entries.getValue<Hash>(kind).keys()) {
          const attributes = instances.getAttributes(id);
          const existing = this.instances.get(id);
          if (existing) {
            existing.updateAttributes(attributes);
          } else if (kind === 'server') {
            this.addServer(id, attributes);
          } else {
            this.addDevice(id, kind, attributes);
          }
        }
      }
    });
  }

  public removeInstance(instanceId: string): void {
    this.batch(() => {
      const node = this.instances.get(instanceId);
      if (!node) {
        return;
      }
      this.removeNode(node);
      const parent = node.parent!;
      if (!parent.children!.length) {
        this.removeNode(parent);
      }
    });
  }

  public setMonitoring(instanceId: string, monitoring: boolean): void {
    this.instances.get(instanceId)?.setMonitoring(monitoring);
  }

  private addServer(id: string, attributes: HashAttributes): void {
    const hostId = attributes.findValue<string>('host');
    if (typeof hostId !== 'string' || !hostId) {
      return;
    }
    let host = this.roots.find((node) => node.id === hostId);
    if (!host) {
      host = new SystemTreeNode(hostId, hostId, 'host', null);
      this.roots.push(host);
    }
    const server = new SystemTreeNode(
      id,
      id,
      'server',
      host,
      new HashAttributes(attributes)
    );
    host.children!.push(server);
    this.instances.set(id, server);
    this.hierarchyChanged = true;
  }

  private addDevice(
    id: string,
    kind: 'device' | 'macro',
    attributes: HashAttributes
  ): void {
    const hostId = attributes.findValue('host');
    const serverId = attributes.findValue('serverId');
    const classId = attributes.findValue('classId');
    const server = this.instances.get(serverId);
    if (
      typeof classId !== 'string' ||
      !classId ||
      typeof attributes.findValue('capabilities') !== 'number' ||
      !attributes.has('status') ||
      server?.kind !== 'server' ||
      server.parent?.id !== hostId
    ) {
      return;
    }
    let classNode = server.children!.find((node) => node.name === classId);
    if (!classNode) {
      classNode = new SystemTreeNode(
        `${serverId}.${classId}`,
        classId,
        'class',
        server
      );
      server.children!.push(classNode);
    }
    const node = new SystemTreeNode(
      id,
      id,
      kind,
      classNode,
      new HashAttributes(attributes)
    );
    classNode.children!.push(node);
    this.instances.set(id, node);
    this.hierarchyChanged = true;
  }

  private removeNode(node: SystemTreeNode): void {
    const forget = (node: SystemTreeNode): void => {
      if (
        node.kind === 'server' ||
        node.kind === 'device' ||
        node.kind === 'macro'
      ) {
        this.instances.delete(node.id);
      }
      node.children?.forEach(forget);
    };
    forget(node);
    if (node.parent) {
      node.parent.children = node.parent.children!.filter(
        (child) => child !== node
      );
    } else {
      this.roots = this.roots.filter((root) => root !== node);
    }
    this.hierarchyChanged = true;
  }
}

import { AccessLevel } from '@/karabo/data/api';
import {
  BindingNamespace,
  DeviceProxy,
  ImageBinding,
  NDArrayBinding,
  NodeBinding,
  PropertyProxy,
} from '@/lib/binding/api';
import { SlotBinding } from '@/lib/binding/BaseBinding';

export interface ConfigurationNode {
  id: string;
  name: string;
  children?: ConfigurationNode[];
  getProxy: () => PropertyProxy;
}

/**
 * Bridges DeviceProxy signals to two independent React external stores:
 * ConfigurationPanel observes the hierarchy, while mounted rows observe values.
 * Live configuration updates keep the hierarchy snapshot unchanged, preserving
 * tree navigation and avoiding a full hierarchy render for each device update.
 */
export class ConfigurationTreeModel {
  public root?: DeviceProxy;
  // Changing devices remounts the tree and resets selection and expansion.
  public deviceRevision = 0;
  // Schema changes trigger column sizing even when all property paths survive.
  public schemaRevision = 0;
  private visibility = AccessLevel.OPERATOR;
  private data: ConfigurationNode[] = [];
  // Includes collapsed rows that have never requested a PropertyProxy.
  private readonly nodes = new Map<string, ConfigurationNode>();
  // Proxies mutate in place; this counter gives React a changing value snapshot.
  private valueRevision = 0;
  // Created on first row mount and reused until the schema or device changes.
  private proxies = new Map<string, PropertyProxy>();
  // Outgoing hierarchy notifications for ConfigurationPanel's useSyncExternalStore.
  private listeners = new Set<() => void>();
  // Outgoing notifications for mounted RowContent instances: values, colors and slots.
  private valueListeners = new Set<() => void>();
  // Incoming DeviceProxy signal subscriptions, stored as unsubscribe callbacks.
  // These are separate from the React listeners above and follow the selected device.
  private subscriptions: (() => void)[] = [];
  // One shared device monitor supplies updates for every row, including while hidden.
  private releaseMonitor?: () => void;

  // React calls the returned cleanup when this hierarchy subscriber unmounts.
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  // Return the same array between rebuilds so value updates do not invalidate it.
  getSnapshot = () => this.data;
  // Each mounted row subscribes here; it does not start its own device monitor.
  subscribeValues = (listener: () => void) => {
    this.valueListeners.add(listener);
    return () => {
      this.valueListeners.delete(listener);
    };
  };
  getValueSnapshot = () => this.valueRevision;

  getNode(path: string): ConfigurationNode | undefined {
    return this.nodes.get(path);
  }

  setRoot(root?: DeviceProxy): void {
    if (root && !root.isOnline) {
      root = undefined;
    }
    if (this.root === root) {
      return;
    }
    // Detach from the old device before cleanup can emit further status changes.
    this.subscriptions.forEach((remove) => remove());
    this.subscriptions = [];
    this.disposeProxies();
    const release = this.releaseMonitor;
    this.releaseMonitor = undefined;
    this.root = undefined;
    release?.();
    this.root = root;
    this.deviceRevision += 1;
    if (root) {
      this.subscriptions = [
        // Schema replaces bindings and metadata, so rebuild nodes and cached proxies.
        root.schema_update.subscribe(this, this.onSchema),
        // Fired after the whole configuration and status transition are complete.
        // This also covers state changes; a state_update subscription would duplicate it.
        root.config_update.subscribe(this, this.onValues),
        // Detect departure even when no further configuration arrives.
        root.status_update.subscribe(this, this.onStatus),
      ];
      // Subscribe before monitoring, which can immediately change device status.
      this.releaseMonitor = root.addMonitor();
    }
    this.rebuild();
  }

  setVisibility(level: AccessLevel.OPERATOR | AccessLevel.EXPERT): void {
    if (this.visibility !== level) {
      this.visibility = level;
      this.rebuild();
    }
  }

  private onSchema = () => {
    this.schemaRevision += 1;
    // Old proxies cache bindings from the previous schema and must be recreated.
    this.disposeProxies();
    this.rebuild();
  };
  private onValues = () => {
    this.valueRevision += 1;
    // Refresh every mounted row: root state can change colors and slot eligibility
    // even for properties whose own values did not change.
    this.valueListeners.forEach((listener) => listener());
  };
  private onStatus = () => {
    // Online status transitions are covered by config_update; only departure clears.
    if (!this.root?.isOnline) {
      this.setRoot(undefined);
    }
  };

  private rebuild(): void {
    this.nodes.clear();
    const build = (
      namespace: BindingNamespace,
      parent: string
    ): ConfigurationNode[] => {
      const nodes: ConfigurationNode[] = [];
      for (const [name, binding] of namespace.entries()) {
        if (binding.requiredAccessLevel > this.visibility) {
          continue;
        }
        const path = parent ? `${parent}.${name}` : name;
        const node: ConfigurationNode = {
          id: path,
          name: binding.displayedName || name,
          getProxy: () => this.getProxy(path),
        };
        this.nodes.set(path, node);
        if (
          binding instanceof NodeBinding &&
          !(binding instanceof SlotBinding) &&
          !(binding instanceof ImageBinding) &&
          !(binding instanceof NDArrayBinding)
        ) {
          node.children = build(binding.value, path);
        }
        nodes.push(node);
      }
      return nodes;
    };
    this.data = this.root ? build(this.root.binding.value!, '') : [];
    // Publish only after both the hierarchy and path index are complete.
    this.listeners.forEach((listener) => listener());
    // Mounted rows must also refresh after schema replacement or visibility changes.
    this.onValues();
  }

  private getProxy(path: string): PropertyProxy {
    let proxy = this.proxies.get(path);
    if (!proxy) {
      proxy = new PropertyProxy(this.root!, path);
      this.proxies.set(path, proxy);
    }
    return proxy;
  }

  private disposeProxies(): void {
    // PropertyProxy owns binding/schema subscriptions even without its own monitor.
    this.proxies.forEach((proxy) => proxy.dispose());
    this.proxies.clear();
  }

  dispose(): void {
    // Use the same cleanup for unmount, disconnect and switching devices.
    // React removes its own listeners via subscribe/subscribeValues cleanup callbacks.
    this.setRoot(undefined);
  }
}

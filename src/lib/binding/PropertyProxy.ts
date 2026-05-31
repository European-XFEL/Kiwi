import { BaseBinding } from './BaseBinding';
import type { DeviceProxy } from './DeviceProxy';
import { Signal } from '../utils';
import { AccessLevel, AccessMode } from '@/karabo/data/enums';
import { ProxyStatus } from './ProxyStatus';

type Unsubscribe = () => void;

const SCHEMA_LOADED_STATUSES = new Set<ProxyStatus>([
  ProxyStatus.SCHEMA,
  ProxyStatus.ALIVE,
  ProxyStatus.MONITORING,
]);

export class PropertyProxy {
  public binding?: BaseBinding;
  private edit_binding?: BaseBinding;
  private _existing = true;

  public readonly config_update = new Signal<[PropertyProxy]>();
  private readonly binding_update_signal = new Signal<[PropertyProxy]>();

  private removeConfigUpdate?: Unsubscribe;
  private removeBindingUpdate?: Unsubscribe;
  private removeMonitor?: Unsubscribe;

  public pipeline_parent_path = '';
  public isMonitored = false;

  constructor(
    private readonly root_proxy: DeviceProxy,
    public readonly path: string
  ) {
    this.setBinding(this.root_proxy.getBinding(this.path));

    this.pipeline_parent_path = this._set_pipeline_path();

    if (SCHEMA_LOADED_STATUSES.has(this.root_proxy.status)) {
      this._existing = this.binding !== undefined;
    }

    this.removeBindingUpdate = this.root_proxy.schema_update.subscribe(
      this,
      this.onSchemaUpdate
    );
  }

  get key(): string {
    return this.root.deviceId + '.' + this.path;
  }

  get root(): DeviceProxy {
    return this.root_proxy;
  }

  get value(): any {
    return this.binding?.value?.value_;
  }

  get timestamp(): any {
    return this.binding?.timestamp;
  }

  get edit_value(): any {
    return this.edit_binding?.value;
  }

  get existing(): boolean {
    return this._existing;
  }

  isEditable(userAccessLevel: AccessLevel): boolean {
    const binding = this.binding;
    if (!binding) return false;
    if (binding.accessMode !== AccessMode.RECONFIGURABLE) return false;
    if (userAccessLevel < binding.requiredAccessLevel) return false;

    return binding.is_allowed(this.root_proxy.state ?? '');
  }

  set edit_value(value: any) {
    if (!this.edit_binding) {
      const klass = this.binding!.constructor as new () => BaseBinding;
      this.edit_binding = new klass();
    }
    this.edit_binding.setValue(value, undefined);
  }

  private setBinding(binding?: BaseBinding): void {
    // always detach from previous binding
    this.removeConfigUpdate?.();
    this.removeConfigUpdate = undefined;
    this.binding = binding;

    // attach to new binding
    if (this.binding) {
      this.removeConfigUpdate = this.binding.value_update.subscribe(
        this,
        this.onBindingValueUpdate
      );
    }
  }

  private onBindingValueUpdate(): void {
    this.config_update.fire(this);
  }

  private onSchemaUpdate(): void {
    this.setBinding(this.root_proxy.getBinding(this.path));
    this._existing = this.binding !== undefined;
    this.binding_update_signal.fire(this);

    const pipeline_parent_path = this._set_pipeline_path();
    if (
      this.isMonitored &&
      pipeline_parent_path !== this.pipeline_parent_path
    ) {
      if (this.pipeline_parent_path !== '') {
        this.root_proxy.disconnectPipeline(this.pipeline_parent_path);
      }
      if (pipeline_parent_path !== '') {
        this.root_proxy.connectPipeline(pipeline_parent_path);
      }
    }
    this.pipeline_parent_path = pipeline_parent_path;
  }

  public value_update(callback: (proxy: PropertyProxy) => void): Unsubscribe {
    return this.config_update.subscribe(this, callback);
  }

  public binding_update(callback: (proxy: PropertyProxy) => void): Unsubscribe {
    return this.binding_update_signal.subscribe(this, callback);
  }

  private _set_pipeline_path(): string {
    if (!this.binding) {
      return '';
    }

    function* genParents(p: string): Generator<string> {
      if (p.includes('.')) {
        p = p.slice(0, p.lastIndexOf('.'));
        yield p;
        yield* genParents(p);
      }
    }
    // Return the path of that parent if found.
    for (const path of genParents(this.path)) {
      const binding = this.root_proxy.getBinding(path);
      if (binding?.displayType === 'OutputChannel') {
        return path;
      }
    }
    return '';
  }

  public startMonitoring(): () => void {
    if (this.isMonitored) {
      return () => this.stopMonitoring();
    }

    console.log('START monitoring', this.key);
    this.isMonitored = true;
    this.removeMonitor = this.root_proxy.addMonitor();
    if (this.pipeline_parent_path !== '') {
      this.root_proxy.connectPipeline(this.pipeline_parent_path);
    }
    return () => this.stopMonitoring();
  }

  public stopMonitoring(): void {
    if (!this.isMonitored) {
      return;
    }

    console.log('STOP monitoring', this.key);
    this.isMonitored = false;
    this.removeMonitor?.();
    this.removeMonitor = undefined;
    if (this.pipeline_parent_path !== '') {
      this.root_proxy.disconnectPipeline(this.pipeline_parent_path);
    }
  }

  public dispose(): void {
    console.log('Disposing the proxy and unsubscribing', this.key);
    if (this.isMonitored) {
      this.stopMonitoring();
    }
    this.removeConfigUpdate?.();
    this.removeConfigUpdate = undefined;

    this.removeBindingUpdate?.();
    this.removeBindingUpdate = undefined;
  }
}

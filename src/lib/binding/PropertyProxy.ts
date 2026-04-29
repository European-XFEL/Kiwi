import { BaseBinding } from './BaseBinding';
import type { DeviceProxy } from './DeviceProxy';
import { Signal } from '../utils';
import { AccessLevel, AccessMode } from '@/karabo/data/enums';

type Unsubscribe = () => void;

export class PropertyProxy {
  public binding?: BaseBinding;
  private edit_binding?: BaseBinding;

  public readonly config_update = new Signal<[PropertyProxy]>();
  private readonly binding_update_signal = new Signal<[PropertyProxy]>();

  private removeConfigUpdate?: Unsubscribe;
  private removeBindingUpdate?: Unsubscribe;

  constructor(
    private readonly root_proxy: DeviceProxy,
    public readonly path: string
  ) {
    this.setBinding(this.root_proxy.getBinding(this.path));

    this.removeBindingUpdate = this.root_proxy.schema_update.subscribe(
      this,
      this.onSchemaUpdate
    );
  }

  get key(): string {
    return this.path;
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
    this.binding_update_signal.fire(this);
  }

  public value_update(callback: (proxy: PropertyProxy) => void): Unsubscribe {
    return this.config_update.subscribe(this, callback);
  }

  public binding_update(callback: (proxy: PropertyProxy) => void): Unsubscribe {
    return this.binding_update_signal.subscribe(this, callback);
  }

  public dispose(): void {
    this.removeConfigUpdate?.();
    this.removeConfigUpdate = undefined;

    this.removeBindingUpdate?.();
    this.removeBindingUpdate = undefined;
  }
}

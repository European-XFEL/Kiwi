import { BaseBinding } from './BaseBinding';
import type { DeviceProxy } from './DeviceProxy';
import { WeakEvent } from '../WeakEvent';

type Unsubscribe = () => void;

export class PropertyProxy {
  public binding?: BaseBinding;

  public readonly config_update = new WeakEvent();

  private removeConfigUpdate?: Unsubscribe;
  private removeBindingUpdate?: Unsubscribe;

  constructor(
    private readonly root_proxy: DeviceProxy,
    public readonly path: string
  ) {
    this.setBinding(this.root_proxy.getBinding(this.path));

    this.removeBindingUpdate = this.root_proxy.schema_update.subscribeWeak(
      this,
      this.onSchemaUpdate
    );
  }

  get key(): string {
    return this.path;
  }

  get value(): any {
    return this.binding?.value;
  }

  get timestamp(): any {
    return this.binding?.timestamp;
  }

  private setBinding(binding?: BaseBinding): void {
    // always detach from previous binding
    this.removeConfigUpdate?.();
    this.removeConfigUpdate = undefined;
    this.binding = binding;

    // attach to new binding
    if (this.binding) {
      this.removeConfigUpdate = this.binding.value_update.subscribeWeak(
        this,
        this.onBindingValueUpdate
      );
    }
  }

  private onBindingValueUpdate = (): void => {
    this.config_update.fire(this);
  };

  private onSchemaUpdate = (): void => {
    this.setBinding(this.root_proxy.getBinding(this.path));
  };

  public value_update(callback: (proxy: PropertyProxy) => void): Unsubscribe {
    return this.config_update.subscribe(() => callback(this));
  }

  public dispose(): void {
    this.removeConfigUpdate?.();
    this.removeConfigUpdate = undefined;

    this.removeBindingUpdate?.();
    this.removeBindingUpdate = undefined;
  }
}

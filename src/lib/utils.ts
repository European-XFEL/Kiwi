export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// -----------------------------------------

type Unsubscribe = () => void;

/** Synchronous notifications with weakly held owners. */
export class Signal<TArgs extends unknown[] = []> {
  private nextId: number;
  // Iterable index with weak owner references.
  private subscribers: Map<number, WeakRef<object>>;
  // Owner-keyed callbacks do not keep owners alive.
  private handlers = new WeakMap<
    object,
    Map<number, (...args: TArgs) => void>
  >();
  private registry: FinalizationRegistry<number>;

  constructor() {
    this.nextId = 1;
    this.subscribers = new Map<number, WeakRef<object>>();

    // Finalization removes stale subscriber ids.
    this.registry = new FinalizationRegistry<number>((id) => {
      this.subscribers.delete(id);
    });
  }

  /** Subscribe an owner and return idempotent cleanup. */
  subscribe(owner: object, handler: (...args: TArgs) => void): Unsubscribe {
    const id = this.nextId++;
    let handlers = this.handlers.get(owner);
    if (!handlers) {
      handlers = new Map();
      this.handlers.set(owner, handlers);
    }
    handlers.set(id, handler);
    const reference = new WeakRef(owner);
    this.subscribers.set(id, reference);
    // Each subscription needs its own unregister token.
    this.registry.register(owner, id, reference);
    // Cleanup must not retain the owner or handler.
    return this.unsubscribe.bind(this, id);
  }

  private unsubscribe(id: number): void {
    const reference = this.subscribers.get(id);
    if (!reference) return;
    this.registry.unregister(reference);
    this.subscribers.delete(id);
    const owner = reference.deref();
    if (!owner) return;
    const handlers = this.handlers.get(owner)!;
    handlers.delete(id);
    if (!handlers.size) this.handlers.delete(owner);
  }

  /** Notify listeners synchronously in subscription order. */
  fire(...args: TArgs): void {
    for (const [id, sub] of this.subscribers) {
      const owner = sub.deref();
      if (owner) {
        this.handlers.get(owner)!.get(id)!.apply(owner, args);
      } else {
        this.unsubscribe(id);
      }
    }
  }
}

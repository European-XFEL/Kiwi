type Unsubscribe = () => void;

type Subscriber = {
  handler: (...args: any[]) => void;
  owner?: WeakRef<object>; // XXX: For WeakRefs
};

export class WeakEvent {
  private nextId = 1;
  private subscribers = new Map<number, Subscriber>();
  private registry = new FinalizationRegistry<number>((id) =>
    this.subscribers.delete(id)
  );

  subscribeWeak(owner: object, handler: (...args: any[]) => void): Unsubscribe {
    const id = this.nextId++;
    this.subscribers.set(id, { owner: new WeakRef(owner), handler });
    this.registry.register(owner, id);
    return () => this.subscribers.delete(id);
  }

  subscribe(handler: (...args: any[]) => void): Unsubscribe {
    const id = this.nextId++;
    this.subscribers.set(id, { handler });
    return () => this.subscribers.delete(id);
  }

  fire(...args: any[]): void {
    for (const [id, sub] of this.subscribers) {
      if (!sub.owner) {
        // strong subscription: call normally
        sub.handler(...args);
        continue;
      }

      const owner = sub.owner.deref();
      if (owner) (sub.handler as Function).apply(owner, args);
      else this.subscribers.delete(id);
    }
  }
}

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// -----------------------------------------

type Unsubscribe = () => void;

type Subscriber<TArgs extends any[]> = {
  handler: (...args: TArgs) => void;
  owner: WeakRef<object>;
};

export class Signal<TArgs extends any[] = []> {
  private nextId: number;
  private subscribers: Map<number, Subscriber<TArgs>>;
  private registry: FinalizationRegistry<number>;

  constructor() {
    this.nextId = 1;
    this.subscribers = new Map<number, Subscriber<TArgs>>();

    // Note: It is safe to use an arrow function here because the
    // registry belongs to the Signal instance itself.
    this.registry = new FinalizationRegistry<number>((id) => {
      this.subscribers.delete(id);
    });
  }

  subscribe(owner: object, handler: (...args: TArgs) => void): Unsubscribe {
    const id = this.nextId++;
    this.subscribers.set(id, { owner: new WeakRef(owner), handler });
    this.registry.register(owner, id);
    return () => this.subscribers.delete(id);
  }

  fire(...args: TArgs): void {
    for (const [id, sub] of this.subscribers) {
      const owner = sub.owner.deref();
      if (owner) {
        sub.handler.apply(owner, args);
      } else {
        this.subscribers.delete(id);
      }
    }
  }
}

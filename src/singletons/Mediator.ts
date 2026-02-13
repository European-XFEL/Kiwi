import { Hash } from '@/karabo-hash/hash';
type BroadCastHandler = (data: Hash) => void;

export class Mediator {
  private listeners = new Map<any, Set<BroadCastHandler>>();

  postEvent(sender: any, data: Hash = new Hash()) {
    const set = this.listeners.get(sender);
    if (!set || set.size === 0) {
      return;
    }

    for (const h of set) {
      h(data);
    }
  }

  on(sender: any, handler: BroadCastHandler): () => void {
    let set = this.listeners.get(sender);
    if (!set) {
      set = new Set<BroadCastHandler>();
      this.listeners.set(sender, set);
    }

    set.add(handler);

    return () => {
      const s = this.listeners.get(sender);
      if (!s) {
        return;
      }

      s.delete(handler);

      if (s.size === 0) {
        this.listeners.delete(sender);
      }
    };
  }

  registerListener(eventMap: Partial<Record<any, BroadCastHandler>>) {
    for (const [k, handler] of Object.entries(eventMap) as Array<
      [any, BroadCastHandler | undefined]
    >) {
      if (!handler) {
        console.log('Not a handler registered ...');
        continue;
      }

      let set = this.listeners.get(k);
      if (!set) {
        set = new Set<BroadCastHandler>();
        this.listeners.set(k, set);
      }

      set.add(handler);
    }
  }

  unregisterListener(eventMap: Partial<Record<any, BroadCastHandler>>) {
    for (const [k, handler] of Object.entries(eventMap) as Array<
      [any, BroadCastHandler | undefined]
    >) {
      if (!handler) {
        continue;
      }

      const set = this.listeners.get(k);
      if (!set) {
        continue;
      }

      set.delete(handler);

      if (set.size === 0) {
        this.listeners.delete(k);
      }
    }
  }
}

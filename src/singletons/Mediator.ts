import { useEffect, useRef } from 'react';

export enum KaraboEvent {
  ListDomains = 'ListDomains',
  ListItems = 'ListProjects',
}

export type PayloadMap = Record<string, unknown>;
export type BroadcastHandler = (data: PayloadMap) => void;
type KaraboEventMap = Partial<Record<KaraboEvent, BroadcastHandler>>;

class Mediator {
  private listeners = new Map<KaraboEvent, Set<BroadcastHandler>>();

  private handle(sender: KaraboEvent, data: any) {
    const set = this.listeners.get(sender);
    if (!set || set.size === 0) return;

    // Shallow copy for safety!
    for (const h of Array.from(set)) {
      h(data);
    }
  }

  postEvent(sender: KaraboEvent, data: PayloadMap = {}) {
    queueMicrotask(() => this.handle(sender, data));
  }

  on(sender: KaraboEvent, handler: BroadcastHandler): () => void {
    let set = this.listeners.get(sender);
    if (!set) this.listeners.set(sender, (set = new Set()));
    set.add(handler);

    return () => {
      const s = this.listeners.get(sender);
      if (!s) return;
      s.delete(handler);
      if (s.size === 0) this.listeners.delete(sender);
    };
  }

  registerListener(eventMap: KaraboEventMap) {
    for (const [k, handler] of Object.entries(eventMap) as Array<
      [KaraboEvent, BroadcastHandler]
    >) {
      if (!handler) continue;
      let set = this.listeners.get(k);
      if (!set) this.listeners.set(k, (set = new Set()));
      set.add(handler);
    }
  }

  unregisterListener(eventMap: KaraboEventMap) {
    for (const [k, handler] of Object.entries(eventMap) as Array<
      [KaraboEvent, BroadcastHandler]
    >) {
      if (!handler) continue;
      const set = this.listeners.get(k);
      if (!set) continue;

      set.delete(handler);
      if (set.size === 0) this.listeners.delete(k);
    }
  }
}

const mediator = new Mediator();
export const get_mediator = () => mediator;

export function broadcast_event(sender: KaraboEvent, data: PayloadMap = {}) {
  mediator.postEvent(sender, data);
}

export type { KaraboEventMap };

/**
 * React hook: subscribe once (per key), return unsubscribe and call only per key
 */
export function useKaraboEvent(
  key: KaraboEvent,
  handler: (data: PayloadMap) => void
) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    return mediator.on(key, (data) => ref.current(data));
  }, [key]);
}

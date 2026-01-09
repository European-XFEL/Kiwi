import { getMediator } from '@/singletons/api';
import { useEffect, useRef } from 'react';

type PayloadMap = Record<string, unknown>;
export type BroadcastHandler = (data: PayloadMap) => void;
export type KaraboEventMap = Partial<Record<any, BroadcastHandler>>;

enum KaraboEvent {
  ListDomains = 'ListDomains',
  ListItems = 'ListProjects',
}

function broadcast_event(sender: KaraboEvent, data: {}) {
  getMediator().postEvent(sender, data);
}

function register_for_broadcasts(eventMap: KaraboEventMap) {
  getMediator().registerListener(eventMap);
}

function unregister_for_broadcasts(eventMap: KaraboEventMap) {
  getMediator().unregisterListener(eventMap);
}

/**
 * React hook: subscribe once (per key), return unsubscribe and call only per key
 */
function useKaraboEvent(key: any, handler: (data: PayloadMap) => void) {
  const ref = useRef(handler);
  ref.current = handler;

  useEffect(() => {
    return getMediator().on(key, (data) => ref.current(data));
  }, [key]);
}

export {
  KaraboEvent,
  broadcast_event,
  useKaraboEvent,
  register_for_broadcasts,
  unregister_for_broadcasts,
};

import { Hash } from '@/karabo-hash/hash';
import { getMediator } from '@/singletons/api';
import { useEffect, useRef } from 'react';

export type BroadcastHandler = (data: Hash) => void;
export type KaraboEventMap = Partial<Record<any, BroadcastHandler>>;

enum KaraboEvent {
  ListDomains = 'ListDomains',
  ListItems = 'ListProjects',
  LoadProjectItems = 'LoadProjectItems',
}

function broadcast_event(sender: KaraboEvent, data: Hash) {
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
function useKaraboEvent(key: any, handler: (data: Hash) => void) {
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

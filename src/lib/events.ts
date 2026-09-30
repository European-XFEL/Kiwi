import { getMediator } from '@/lib/singletons/api';
import { useEffect, useRef } from 'react';

export type BroadcastHandler = (data: any) => void;
export type KaraboEventMap = Partial<Record<KaraboEvent, BroadcastHandler>>;

enum KaraboEvent {
  ListDomains = 'ListDomains', // triggered by reception of GUI Server message of type
  ListProjects = 'ListProjects',
  ListItems = 'ListItems', // triggered by reception of GUI Server message of type
  LoadProjectItems = 'LoadProjectItems', // triggered by reception of GUI Server message of type
  ListScenes = 'ListScenes', // trigerred by reception of reply to slotGetScenes of the ProjectDbManager (via GUI's "requestGeneric")
  // Every set/clear broadcasts, even when unchanged.
  // Empty Hash; read root and domain from ProjectItemModel.
  RootProjectChanged = 'RootProjectChanged',
  ProjectUpdated = 'ProjectUpdated', // uuids of updated projects as string[] under 'uuids' key
  SessionDropped = 'SessionDropped',
  SessionExpired = 'SessionExpired',
  SessionExpirationNotified = 'SessionExpirationNotified',
  Notification = 'Notification',
  OpenScene = 'OpenScene',
  OpenUnattachedScene = 'OpenUnattachedScene',
  // Tab changes within a session only. GoToHomeTab and session end reset the
  // workspace instead.
  // No payload; read the active scene tab from PanelWrangler.
  ActiveSceneTabChanged = 'ActiveSceneTabChanged',
  // Shows the Home tab, which exists only while no scene tab is open: closes
  // every scene tab and clears the project root. Sent by the Home buttons,
  // "Back to Start", and closing the last tab. No payload.
  GoToHomeTab = 'GoToHomeTab',
  OpenSceneLink = 'OpenSceneLink',
  OpenSceneBrowser = 'OpenSceneBrowser',
  DatabaseBusy = 'DatabaseBusy',
  NetworkConnectStatus = 'NetworkConnectStatus',
}

function broadcast_event(sender: KaraboEvent, data: any) {
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
function useKaraboEvent(key: KaraboEvent, handler: (data: any) => void) {
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

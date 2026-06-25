import type { SceneModel } from '@/karabo/common/scenemodel/api';
import type { LoadedSceneRef } from '@/store/api';
import type { Hash } from '@/karabo/data/hash';
import { useGlobalStore, useRecentStore } from '@/store/api';
import {
  KaraboEvent,
  KaraboEventMap,
  register_for_broadcasts,
  unregister_for_broadcasts,
} from '@/lib/events';
import { fetchSceneContent } from '@/lib/request';
import type {
  PanelSlot,
  PanelState,
  PanelTab,
  SceneTabSnapshot,
} from '@/features/workspace/types';

export type SceneTabContent = {
  sceneRef?: LoadedSceneRef;
  sceneModel?: SceneModel;
  error?: string;
};

export const HOME_TAB_ID = 'home' as const;

const HOME_TAB: PanelTab = { id: HOME_TAB_ID, title: 'Home', closable: false };

function createEmptyArea(id: PanelSlot): PanelState {
  return { id, tabs: [], activeTabId: undefined };
}

function createCenterArea(tabs?: PanelTab[], activeTabId?: string): PanelState {
  if (!tabs || tabs.length === 0) {
    return {
      id: 'center',
      tabs: [HOME_TAB],
      activeTabId: HOME_TAB_ID,
    };
  }

  return {
    id: 'center',
    tabs,
    activeTabId: activeTabId ?? tabs[0]?.id,
  };
}

function toSceneTabId(uuid: string): string {
  return `scene:${uuid}`;
}

function toPanelTab(snapshot: SceneTabSnapshot): PanelTab {
  return {
    id: snapshot.id,
    title: snapshot.title,
    closable: true,
  };
}

// Scene equality is based on scene identity only. host/port are connection
// transport, not part of a scene's identity (treated as const for scenes), so
// they must not participate in this comparison.
function isSameSceneSnapshot(
  current: SceneTabSnapshot | undefined,
  requested: SceneTabSnapshot
): boolean {
  return (
    current?.id === requested.id &&
    current.domain === requested.domain &&
    current.projectName === requested.projectName &&
    current.uuid === requested.uuid
  );
}

export class PanelWrangler {
  private state = {
    left: createEmptyArea('left'),
    center: createCenterArea(),
    right: createEmptyArea('right'),
  };

  private content = new Map<string, SceneTabContent>();
  private sceneTabs = new Map<string, SceneTabSnapshot>();
  private loadingTabIds = new Set<string>();
  private listeners = new Set<() => void>();
  private readonly eventMap: KaraboEventMap;

  public constructor() {
    this.eventMap = {
      [KaraboEvent.OpenScene]: this.onEventOpenScene,
      [KaraboEvent.OpenSceneBrowser]: this.onEventOpenSceneBrowser,
    };

    register_for_broadcasts(this.eventMap);
  }

  dispose() {
    unregister_for_broadcasts(this.eventMap);
  }

  getSnapshot = () => {
    return this.state;
  };

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getContent(tabId: string): SceneTabContent | undefined {
    return this.content.get(tabId);
  }

  getSceneTab(tabId: string): SceneTabSnapshot | undefined {
    return this.sceneTabs.get(tabId);
  }

  setContent(tabId: string, data: SceneTabContent): void {
    this.content.set(tabId, data);

    if (data.sceneRef) {
      this.updateSceneTitle(tabId, data.sceneRef.name);
    }

    this.state = { ...this.state };
    this.emit();
  }

  resetCenter(): void {
    for (const tabId of this.state.center.tabs.map((tab) => tab.id)) {
      this.content.delete(tabId);
      this.sceneTabs.delete(tabId);
      this.loadingTabIds.delete(tabId);
    }

    this.commit({
      ...this.state,
      center: createCenterArea(),
    });
  }

  selectTab(area: PanelSlot, tabId: string): void {
    const areaModel = this.state[area];
    if (!areaModel.tabs.some((tab) => tab.id === tabId)) {
      return;
    }

    if (areaModel.activeTabId === tabId) {
      if (area === 'center') {
        this.ensureActiveCenterTabContent();
      }
      return;
    }

    this.commit({
      ...this.state,
      [area]: { ...areaModel, activeTabId: tabId },
    });
  }

  closeTab(area: PanelSlot, tabId: string): void {
    if (tabId === HOME_TAB_ID) {
      return;
    }

    const areaModel = this.state[area];
    const nextTabs = areaModel.tabs.filter((tab) => tab.id !== tabId);

    this.content.delete(tabId);
    this.sceneTabs.delete(tabId);
    this.loadingTabIds.delete(tabId);

    if (nextTabs.length === 0 && area === 'center') {
      this.commit({
        ...this.state,
        center: createCenterArea(),
      });
      return;
    }

    const nextActiveTabId =
      areaModel.activeTabId === tabId
        ? nextTabs[nextTabs.length - 1]?.id
        : areaModel.activeTabId;

    this.commit({
      ...this.state,
      [area]: {
        ...areaModel,
        tabs: nextTabs,
        activeTabId: nextActiveTabId,
      },
    });
  }

  private openScene(snapshot: SceneTabSnapshot): void {
    const center = this.state.center;
    const nextTab = toPanelTab(snapshot);

    const hasDifferentProjectTab = center.tabs.some((tab) => {
      if (tab.id === HOME_TAB_ID) {
        return false;
      }

      const existing = this.sceneTabs.get(tab.id);
      if (!existing) {
        return false;
      }

      return (
        existing.domain !== snapshot.domain ||
        existing.projectName !== snapshot.projectName
      );
    });

    if (hasDifferentProjectTab) {
      for (const tab of center.tabs) {
        if (tab.id !== HOME_TAB_ID) {
          this.content.delete(tab.id);
          this.sceneTabs.delete(tab.id);
          this.loadingTabIds.delete(tab.id);
        }
      }

      this.sceneTabs.set(snapshot.id, snapshot);
      this.commit({
        ...this.state,
        center: {
          ...center,
          tabs: [nextTab],
          activeTabId: snapshot.id,
        },
      });
      return;
    }

    this.sceneTabs.set(snapshot.id, snapshot);
    const index = center.tabs.findIndex((tab) => tab.id === snapshot.id);

    let tabs: PanelTab[];
    if (index !== -1) {
      tabs = center.tabs.map((tab, tabIndex) =>
        tabIndex === index ? nextTab : tab
      );
    } else if (this.isHomeOnly()) {
      tabs = [nextTab];
    } else {
      tabs = [...center.tabs, nextTab];
    }

    this.commit({
      ...this.state,
      center: {
        ...center,
        tabs,
        activeTabId: snapshot.id,
      },
    });
  }

  private commit(nextState: typeof this.state): void {
    this.state = nextState;
    this.syncBrowserURL();
    this.ensureActiveCenterTabContent();
    this.emit();
  }

  private ensureActiveCenterTabContent(): void {
    // TODO: fetching scene content here is temporary. Once scene content is
    // sourced from the Project singleton, this fetch should be removed and the
    // content read from there instead of fetchSceneContent().
    const activeScene = this.getActiveCenterSceneTab();
    if (!activeScene) {
      return;
    }

    const existingContent = this.content.get(activeScene.id);
    if (
      (existingContent && !existingContent.error) ||
      this.loadingTabIds.has(activeScene.id)
    ) {
      return;
    }

    this.loadingTabIds.add(activeScene.id);

    const domain = activeScene.domain;
    const projectName = activeScene.projectName;

    fetchSceneContent(domain, projectName, activeScene.uuid)
      .then((sceneModel) => {
        this.loadingTabIds.delete(activeScene.id);

        if (
          !isSameSceneSnapshot(this.sceneTabs.get(activeScene.id), activeScene)
        ) {
          return;
        }

        if (!sceneModel) {
          this.setContent(activeScene.id, {
            error: 'The scene could not be loaded.',
          });
          return;
        }

        const resolvedName = sceneModel.simple_name;

        const sceneRef = {
          width: sceneModel.width,
          height: sceneModel.height,
          domain: domain,
          projectName: projectName,
          uuid: sceneModel.uuid || activeScene.uuid,
          name: resolvedName,
        };

        const topic = useGlobalStore.getState().sessionInfo?.guiServerTopic;
        if (topic) {
          useRecentStore.getState().setRecentScene({
            topic,
            domain: sceneRef.domain,
            uuid: sceneRef.uuid,
            name: sceneRef.name,
            projectName: sceneRef.projectName,
          });
        }

        this.setContent(activeScene.id, { sceneRef, sceneModel });
      })
      .catch((error: unknown) => {
        this.loadingTabIds.delete(activeScene.id);

        if (
          !isSameSceneSnapshot(this.sceneTabs.get(activeScene.id), activeScene)
        ) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : 'The scene could not be loaded.';

        this.setContent(activeScene.id, { error: message });
      });
  }

  private getActiveCenterSceneTab(): SceneTabSnapshot | undefined {
    const activeTabId = this.state.center.activeTabId;
    if (!activeTabId || activeTabId === HOME_TAB_ID) {
      return undefined;
    }

    return this.sceneTabs.get(activeTabId);
  }

  private createSceneSnapshot(params: {
    host: string;
    port: number;
    domain: string;
    projectName: string;
    uuid: string;
    title: string;
  }): SceneTabSnapshot {
    return {
      id: toSceneTabId(params.uuid),
      title: params.title,
      host: params.host,
      port: params.port,
      domain: params.domain,
      projectName: params.projectName,
      uuid: params.uuid,
    };
  }

  private onEventOpenScene = (data: Hash): void => {
    const snapshot = this.createSceneSnapshotFromOpenSceneHash(data);
    if (!snapshot) {
      return;
    }

    this.openScene(snapshot);
  };

  private onEventOpenSceneBrowser = (data: Hash): void => {
    const snapshot = this.createSceneSnapshotFromOpenSceneBrowserHash(data);
    if (!snapshot) {
      return;
    }

    this.openScene(snapshot);
  };

  private createSceneSnapshotFromOpenSceneHash(
    data: Hash
  ): SceneTabSnapshot | undefined {
    const uuid = data.getValue<string>('uuid');
    if (!uuid) {
      return undefined;
    }

    const existing = this.sceneTabs.get(toSceneTabId(uuid));
    const active = this.getActiveCenterSceneTab();

    const domain = data.has('domain')
      ? data.getValue<string>('domain')
      : (existing?.domain ?? active?.domain);
    const projectName = data.has('project')
      ? data.getValue<string>('project')
      : (existing?.projectName ?? active?.projectName);

    if (!domain || !projectName) {
      return undefined;
    }

    const sessionInfo = useGlobalStore.getState().sessionInfo;
    const host = existing?.host ?? active?.host ?? sessionInfo?.guiServerHost;
    const portValue =
      existing?.port ?? active?.port ?? sessionInfo?.guiServerPort;

    if (!host || portValue === undefined || !Number.isFinite(portValue)) {
      return undefined;
    }

    const title = data.has('name')
      ? data.getValue<string>('name')
      : (existing?.title ?? uuid.slice(0, 8));

    return this.createSceneSnapshot({
      host,
      port: portValue,
      domain,
      projectName,
      uuid,
      title,
    });
  }

  private createSceneSnapshotFromOpenSceneBrowserHash(
    data: Hash
  ): SceneTabSnapshot | undefined {
    const uuid = data.getValue<string>('uuid');
    if (!uuid) {
      return undefined;
    }

    const domain = data.getValue<string>('domain');
    const projectName = data.getValue<string>('project');
    const host = data.getValue<string>('host');
    const portValue = Number(data.getValue<number | string>('port'));

    if (!domain || !projectName || !host || !Number.isFinite(portValue)) {
      return undefined;
    }

    const existing = this.sceneTabs.get(toSceneTabId(uuid));
    const title = data.has('name')
      ? data.getValue<string>('name')
      : (existing?.title ?? uuid.slice(0, 8));

    return this.createSceneSnapshot({
      host,
      port: portValue,
      domain,
      projectName,
      uuid,
      title,
    });
  }

  private updateSceneTitle(tabId: string, title: string): void {
    const snapshot = this.sceneTabs.get(tabId);
    if (snapshot && snapshot.title !== title) {
      this.sceneTabs.set(tabId, { ...snapshot, title });
    }

    const center = this.state.center;
    const index = center.tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1 || center.tabs[index]?.title === title) {
      return;
    }

    const tabs = center.tabs.map((tab) =>
      tab.id === tabId ? { ...tab, title } : tab
    );
    this.state = {
      ...this.state,
      center: {
        ...center,
        tabs,
      },
    };
  }

  private syncBrowserURL(): void {
    if (typeof window === 'undefined') {
      return;
    }

    const activeScene = this.getActiveCenterSceneTab();
    const pathname = window.location.pathname || '/main';

    if (!activeScene) {
      window.history.replaceState(null, '', pathname);
      return;
    }

    const params = new URLSearchParams({
      host: activeScene.host,
      port: String(activeScene.port),
      domain: activeScene.domain,
      projectName: activeScene.projectName,
      uuid: activeScene.uuid,
    });

    window.history.replaceState(null, '', `${pathname}?${params.toString()}`);
  }

  private isHomeOnly(): boolean {
    const center = this.state.center;
    return center.tabs.length === 1 && center.tabs[0]?.id === HOME_TAB_ID;
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

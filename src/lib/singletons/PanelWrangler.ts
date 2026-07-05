import { SceneModel } from '@/karabo/common/scenemodel/api';
import type { LoadedSceneRef } from '@/store/api';
import type { Hash } from '@/karabo/data/hash';
import { useGlobalStore, useRecentStore } from '@/store/api';
import {
  KaraboEvent,
  KaraboEventMap,
  register_for_broadcasts,
  unregister_for_broadcasts,
} from '@/lib/events';
import type {
  PanelSlot,
  PanelState,
  PanelTab,
  SceneTabSnapshot,
} from '@/features/workspace/types';
import { getProjectModel } from './api';

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

export class PanelWrangler {
  private state = {
    left: createEmptyArea('left'),
    center: createCenterArea(),
    right: createEmptyArea('right'),
  };

  private content = new Map<string, SceneTabContent>();
  private sceneTabs = new Map<string, SceneTabSnapshot>();
  private listeners = new Set<() => void>();
  private readonly eventMap: KaraboEventMap;

  public constructor() {
    this.eventMap = {
      [KaraboEvent.OpenScene]: this.onEventOpenScene,
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

  private openScene(
    snapshot: SceneTabSnapshot,
    content: SceneTabContent
  ): void {
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
        existing.projectUuid !== snapshot.projectUuid
      );
    });

    if (hasDifferentProjectTab) {
      for (const tab of center.tabs) {
        if (tab.id !== HOME_TAB_ID) {
          this.content.delete(tab.id);
          this.sceneTabs.delete(tab.id);
        }
      }

      this.sceneTabs.set(snapshot.id, snapshot);
      this.content.set(snapshot.id, content);
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
    this.content.set(snapshot.id, content);
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
    this.emit();
  }

  private getActiveCenterSceneTab(): SceneTabSnapshot | undefined {
    const activeTabId = this.state.center.activeTabId;
    if (!activeTabId || activeTabId === HOME_TAB_ID) {
      return undefined;
    }

    return this.sceneTabs.get(activeTabId);
  }

  private createSceneOpenData(model: SceneModel):
    | {
        snapshot: SceneTabSnapshot;
        content: SceneTabContent;
        sceneRef: LoadedSceneRef;
      }
    | undefined {
    const projectModel = getProjectModel();
    const project = projectModel.root;
    const domain = projectModel.domain;

    if (!project || !domain || !model.uuid) {
      return undefined;
    }

    const sceneName = model.simple_name || model.uuid.slice(0, 8);
    const sceneRef: LoadedSceneRef = {
      width: model.width,
      height: model.height,
      domain,
      projectUuid: project.uuid,
      projectName: project.simple_name,
      uuid: model.uuid,
      name: sceneName,
    };

    const snapshot: SceneTabSnapshot = {
      id: toSceneTabId(model.uuid),
      title: sceneName,
      domain,
      projectUuid: project.uuid,
      projectName: project.simple_name,
      uuid: model.uuid,
    };

    return {
      snapshot,
      sceneRef,
      content: { sceneRef, sceneModel: model },
    };
  }

  private onEventOpenScene = (data: Hash): void => {
    const model = data.getValue<SceneModel>('model');

    const sceneData = this.createSceneOpenData(model);
    if (!sceneData) {
      return;
    }

    this.recordRecentScene(sceneData.sceneRef);
    this.openScene(sceneData.snapshot, sceneData.content);
  };

  private recordRecentScene(sceneRef: LoadedSceneRef): void {
    const topic = useGlobalStore.getState().sessionInfo?.guiServerTopic;
    if (!topic) {
      return;
    }

    useRecentStore.getState().setRecentScene({
      topic,
      domain: sceneRef.domain,
      projectUuid: sceneRef.projectUuid,
      uuid: sceneRef.uuid,
      name: sceneRef.name,
      projectName: sceneRef.projectName,
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

    const sessionInfo = useGlobalStore.getState().sessionInfo;
    if (
      !sessionInfo?.guiServerHost ||
      sessionInfo.guiServerPort === undefined
    ) {
      return;
    }

    const params = new URLSearchParams({
      host: sessionInfo.guiServerHost,
      port: String(sessionInfo.guiServerPort),
      domain: activeScene.domain,
      projectUuid: activeScene.projectUuid,
      sceneUuid: activeScene.uuid,
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

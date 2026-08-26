import type { SceneModel } from '@/karabo/common/scenemodel/api';
import type { FitMode } from '@/features/scene-view/api';
import type { LoadedSceneRef } from '@/store/api';
import { SceneControllerRegistry } from '@/features/scenepanel/SceneControllerRegistry';
import type { Hash } from '@/karabo/data/hash';
import { useGlobalStore, useRecentStore } from '@/store/api';
import {
  KaraboEvent,
  KaraboEventMap,
  register_for_broadcasts,
  unregister_for_broadcasts,
} from '@/lib/events';
import type {
  DeviceSceneTabSnapshot,
  PanelSlot,
  PanelState,
  PanelTab,
  SceneTabSnapshot,
} from '@/features/workspace/types';
import {
  findProjectModelInProject,
  walkProjectModels,
} from '@/karabo/common/project/api';
import { getProjectModel } from './api';
import { DeviceSceneModel } from '@/karabo/common/scenemodel/SceneModel';

// Per-tab scene state. fitMode lives here (not in a global store) so each scene
// tab remembers its own zoom-to-fit choice independently of the others.
export type SceneTabContent = {
  sceneRef?: LoadedSceneRef;
  sceneModel?: SceneModel;
  sceneControllerRegistry?: SceneControllerRegistry;
  fitMode?: FitMode;
  error?: string;
};

export const HOME_TAB_ID = 'home' as const;

const DEFAULT_FIT_MODE: FitMode = 'fit-page';

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

function toDeviceScenePanelTab(snapshot: DeviceSceneTabSnapshot): PanelTab {
  return {
    id: snapshot.id,
    title: `${snapshot.deviceId}|${snapshot.sceneName}`,
    closable: true,
  };
}

// Scene controller registry reuse is keyed by scene uuid, matching the tab id
// (`scene:${uuid}`). A same-uuid content update should keep the existing
// registry and tab-local state even if domain/project metadata changes.
function isSameSceneRef(
  current: LoadedSceneRef | undefined,
  requested: LoadedSceneRef
): boolean {
  return current?.uuid === requested.uuid;
}

export class PanelWrangler {
  private state = {
    left: createEmptyArea('left'),
    center: createCenterArea(),
    right: createEmptyArea('right'),
  };

  private content = new Map<string, SceneTabContent>();
  private sceneTabs = new Map<string, SceneTabSnapshot>();
  private deviceSceneTabs = new Map<string, DeviceSceneTabSnapshot>();
  private listeners = new Set<() => void>();
  private readonly eventMap: KaraboEventMap;

  public constructor() {
    this.eventMap = {
      [KaraboEvent.OpenScene]: this.onEventOpenScene,
      [KaraboEvent.OpenDeviceScene]: this.onEventOpenDeviceScene,
    };

    register_for_broadcasts(this.eventMap);
  }

  dispose() {
    unregister_for_broadcasts(this.eventMap);

    for (const content of this.content.values()) {
      content.sceneControllerRegistry?.dispose();
    }
    this.content.clear();
    this.sceneTabs.clear();
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

  getSceneTab(
    tabId: string
  ): SceneTabSnapshot | DeviceSceneTabSnapshot | undefined {
    return this.sceneTabs.get(tabId);
  }

  // Every stored tab content passes through here so a scene tab always carries
  // its registry and fit mode, no matter which path (setContent, OpenScene
  // event) produced it.
  private resolveTabContent(
    tabId: string,
    data: SceneTabContent
  ): SceneTabContent {
    const existing = this.content.get(tabId);

    // Reuse the registry when the update targets the same scene uuid so the
    // currently mounted controller contexts remain reachable during same-tab
    // metadata updates. Unmounted controllers are not preserved by the registry.
    const reuseRegistry =
      existing?.sceneControllerRegistry !== undefined &&
      data.sceneRef !== undefined &&
      isSameSceneRef(existing.sceneRef, data.sceneRef);

    let sceneControllerRegistry: SceneControllerRegistry | undefined;
    if (reuseRegistry) {
      sceneControllerRegistry = existing.sceneControllerRegistry;
    } else {
      // The PanelWrangler owns each tab's registry lifecycle: dispose the old
      // registry here before replacing it.
      existing?.sceneControllerRegistry?.dispose();
      sceneControllerRegistry = data.sceneRef
        ? new SceneControllerRegistry(data.sceneRef)
        : undefined;
    }

    // Keep the tab's current fit mode across same-tab updates (rename, re-fetch,
    // error recovery). A brand-new tab starts at the default. An explicit
    // fitMode on `data` always wins.
    const fitMode = data.fitMode ?? existing?.fitMode ?? DEFAULT_FIT_MODE;

    return { ...data, sceneControllerRegistry, fitMode };
  }

  setContent(tabId: string, data: SceneTabContent): void {
    this.content.set(tabId, this.resolveTabContent(tabId, data));

    if (data.sceneRef) {
      this.updateSceneTitle(tabId, data.sceneRef.name);
    }

    this.state = { ...this.state };
    this.emit();
  }

  // Update a single tab's fit mode and notify subscribers so the panel rescales.
  setFitMode(tabId: string, fitMode: FitMode): void {
    const existing = this.content.get(tabId);
    if (!existing || existing.fitMode === fitMode) {
      return;
    }

    this.content.set(tabId, { ...existing, fitMode });
    this.state = { ...this.state };
    this.emit();
  }

  resetCenter(): void {
    for (const tabId of this.state.center.tabs.map((tab) => tab.id)) {
      this.content.get(tabId)?.sceneControllerRegistry?.dispose();
      this.content.delete(tabId);
      this.sceneTabs.delete(tabId);
    }

    this.commit({
      ...this.state,
      center: createCenterArea(),
    });
  }

  // Full teardown for a session boundary. resetCenter() deliberately keeps the
  // side panels, which is right for "go home" within a session but wrong when
  // the session itself ends: nothing from the old session may stay reachable by
  // the next one. Iterates `content` rather than the center tabs so a registry
  // is disposed no matter which slot its tab lived in.
  resetWorkspace(): void {
    for (const content of this.content.values()) {
      content.sceneControllerRegistry?.dispose();
    }
    this.content.clear();
    this.sceneTabs.clear();

    this.commit({
      left: createEmptyArea('left'),
      center: createCenterArea(),
      right: createEmptyArea('right'),
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

    this.content.get(tabId)?.sceneControllerRegistry?.dispose();
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

      const root = getProjectModel().root;
      return (
        existing.domain !== snapshot.domain ||
        !root ||
        !findProjectModelInProject(root, existing.projectUuid)
      );
    });

    if (hasDifferentProjectTab) {
      for (const tab of center.tabs) {
        if (tab.id !== HOME_TAB_ID) {
          this.content.get(tab.id)?.sceneControllerRegistry?.dispose();
          this.content.delete(tab.id);
          this.sceneTabs.delete(tab.id);
        }
      }

      this.sceneTabs.set(snapshot.id, snapshot);
      this.content.set(
        snapshot.id,
        this.resolveTabContent(snapshot.id, content)
      );
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
    this.content.set(snapshot.id, this.resolveTabContent(snapshot.id, content));
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

  private openDeviceScene(
    snapshot: DeviceSceneTabSnapshot,
    content: SceneTabContent
  ): void {
    const center = this.state.center;
    const nextTab = toDeviceScenePanelTab(snapshot);

    this.deviceSceneTabs.set(snapshot.id, snapshot);
    this.content.set(snapshot.id, this.resolveTabContent(snapshot.id, content));
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

    const sceneProject = Array.from(walkProjectModels(project)).find(
      (projectModel) =>
        projectModel.scenes?.some((scene) => scene.uuid === model.uuid)
    );
    if (!sceneProject) {
      return undefined;
    }

    const sceneName = model.simple_name || model.uuid.slice(0, 8);
    const sceneRef: LoadedSceneRef = {
      width: model.width,
      height: model.height,
      domain,
      projectUuid: sceneProject.uuid,
      projectName: sceneProject.simple_name,
      uuid: model.uuid,
      name: sceneName,
    };

    const snapshot: SceneTabSnapshot = {
      id: toSceneTabId(model.uuid),
      title: sceneName,
      domain,
      projectUuid: sceneProject.uuid,
      projectName: sceneProject.simple_name,
      uuid: model.uuid,
    };

    return {
      snapshot,
      sceneRef,
      content: { sceneRef, sceneModel: model },
    };
  }

  private createDeviceSceneOpenData(model: DeviceSceneModel):
    | {
        snapshot: DeviceSceneTabSnapshot;
        content: SceneTabContent;
        sceneRef: LoadedSceneRef;
      }
    | undefined {
    const sceneName = model.simple_name || model.uuid.slice(0, 8);
    const sceneRef: LoadedSceneRef = {
      width: model.width,
      height: model.height,
      uuid: model.uuid,
      deviceId: model.deviceId,
      name: sceneName,
    };

    const snapshot: DeviceSceneTabSnapshot = {
      id: toSceneTabId(model.uuid),
      title: sceneName,
      deviceId: model.deviceId,
      sceneName: sceneName,
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

  private onEventOpenDeviceScene = (data: Hash): void => {
    const model = data.getValue<DeviceSceneModel>('model');
    const deviceSceneData = this.createDeviceSceneOpenData(model);
    if (!deviceSceneData) {
      return;
    }
    this.openDeviceScene(deviceSceneData.snapshot, deviceSceneData.content);
  };

  private recordRecentScene(sceneRef: LoadedSceneRef): void {
    const topic = useGlobalStore.getState().sessionInfo?.guiServerTopic;
    if (!topic) {
      return;
    }

    // NOTE: Only project scenes are currently stored in the list of recently
    //       used scenes - the non-null assertion operators should not
    //       trigger any assertion violation at runtime.
    useRecentStore.getState().setRecentScene({
      topic,
      domain: sceneRef.domain!,
      projectUuid: sceneRef.projectUuid!,
      uuid: sceneRef.uuid,
      name: sceneRef.name,
      projectName: sceneRef.projectName!,
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

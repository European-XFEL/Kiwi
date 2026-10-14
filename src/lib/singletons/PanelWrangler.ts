import type {
  BaseWidgetObjectData,
  SceneModel,
} from '@/karabo/common/scenemodel/api';
import {
  type ApplicationMode,
  type LoadedSceneRef,
  useGlobalStore,
} from '@/store/api';
import {
  createWorkspacePolicy,
  HOME_TAB_ID,
} from '@/features/workspace/configuration';
import type { FitMode } from '@/features/scene-view/api';
import { SceneControllerRegistry } from '@/features/scenepanel/SceneControllerRegistry';
import type { Hash } from '@/karabo/data/api';
import {
  KaraboEvent,
  KaraboEventMap,
  broadcast_event,
  register_for_broadcasts,
  unregister_for_broadcasts,
} from '@/lib/events';
import type {
  UnnatachedSceneTabSnapshot,
  PanelSlot,
  PanelState,
  PanelTab,
  SceneTabSnapshot,
  RightPanelState,
  PanelAreaState,
} from '@/features/workspace/types';
import {
  CONTROLLERS_TAB_ID,
  CONFIGURATION_TAB_ID,
  SYSTEM_TOPOLOGY_TAB_ID,
} from '@/features/workspace/utils';
import { PROJECTS_TAB_ID } from '@/features/projectpanel/configuration';
import type { ProjectSnapshot } from './ProjectItemModel';
import { getProjectModel } from './api';
import {
  readActiveTab,
  writeActiveTab,
  type SavedActiveTab,
} from './activeTabStorage';

// Per-tab scene state. fitMode lives here (not in a global store) so each scene
// tab remembers its own zoom-to-fit choice independently of the others.
export type SceneTabContent = {
  sceneRef?: LoadedSceneRef;
  sceneModel?: SceneModel;
  sceneControllerRegistry?: SceneControllerRegistry;
  fitMode?: FitMode;
  error?: string;
};

export { HOME_TAB_ID } from '@/features/workspace/configuration';

const DEFAULT_FIT_MODE: FitMode = 'fit-page';

function createLeftArea(showProjects: boolean): PanelState {
  return {
    id: 'left',
    tabs: [
      { id: SYSTEM_TOPOLOGY_TAB_ID, title: 'SystemTopology', closable: false },
      ...(showProjects
        ? [{ id: PROJECTS_TAB_ID, title: 'Projects', closable: false }]
        : []),
    ],
    activeTabId: SYSTEM_TOPOLOGY_TAB_ID,
  };
}

function createRightArea(): RightPanelState {
  return {
    id: 'right',
    tabs: [
      { id: CONTROLLERS_TAB_ID, title: 'Controllers', closable: false },
      { id: CONFIGURATION_TAB_ID, title: 'Configuration', closable: false },
    ],
    activeTabId: CONTROLLERS_TAB_ID,
    controllerPanels: [],
  };
}

function createCenterArea(defaultTab: PanelTab): PanelState {
  return { id: 'center', tabs: [defaultTab], activeTabId: defaultTab.id };
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

function toUnattachedScenePanelTab(
  snapshot: UnnatachedSceneTabSnapshot
): PanelTab {
  return {
    id: snapshot.id,
    title: snapshot.deviceId
      ? `${snapshot.deviceId}|${snapshot.sceneName}`
      : snapshot.sceneName,
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
  // Mirrors DatabaseBusy: the database connection alone decides when a project
  // is loading, so resets leave this flag untouched.
  private state: PanelAreaState & {
    projectLoading: boolean;
    projectPanelActivation: number;
  };

  private content = new Map<string, SceneTabContent>();
  private sceneTabs = new Map<string, SceneTabSnapshot>();
  private deviceSceneTabs = new Map<string, UnnatachedSceneTabSnapshot>();
  private listeners = new Set<() => void>();
  private readonly eventMap: KaraboEventMap;
  private projectSnapshot: ProjectSnapshot;
  private policy = createWorkspacePolicy();

  public constructor() {
    this.projectSnapshot = getProjectModel().getSnapshot();
    this.state = {
      projectLoading: false,
      projectPanelActivation: 0,
      left: createLeftArea(this.policy.showProjectNavigation),
      center: this.defaultCenter,
      right: createRightArea(),
    };
    this.eventMap = {
      [KaraboEvent.OpenScene]: this.onEventOpenScene,
      [KaraboEvent.OpenUnattachedScene]: this.onEventOpenUnattachedScene,
      [KaraboEvent.OpenControllerPanel]: this.onEventOpenControllerPanel,
      [KaraboEvent.GoToHomeTab]: this.onEventGoToHomeTab,
      [KaraboEvent.DatabaseBusy]: this.onEventDatabaseBusy,
      [KaraboEvent.RootProjectChanged]: this.onEventRootProjectChanged,
    };

    register_for_broadcasts(this.eventMap);
  }

  setMode(mode: ApplicationMode): void {
    const policy = createWorkspacePolicy(mode);
    if (this.policy.defaultCenterTab.id === policy.defaultCenterTab.id) {
      return;
    }
    this.policy = policy;
    this.resetWorkspace();
  }

  dispose() {
    unregister_for_broadcasts(this.eventMap);

    for (const content of this.content.values()) {
      content.sceneControllerRegistry?.dispose();
    }
    this.content.clear();
    this.sceneTabs.clear();
    this.deviceSceneTabs.clear();
    this.commit({
      ...this.state,
      center: { ...this.state.center },
      right: createRightArea(),
    });
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

  isSceneTabOpen = (): boolean =>
    this.state.center.tabs.some(
      (tab) => this.sceneTabs.has(tab.id) || this.deviceSceneTabs.has(tab.id)
    );

  getContent(tabId: string): SceneTabContent | undefined {
    return this.content.get(tabId);
  }

  showProjects(): void {
    if (!this.policy.showProjectNavigation || !this.projectSnapshot.root) {
      return;
    }
    this.commit({
      ...this.state,
      left: { ...this.state.left, activeTabId: PROJECTS_TAB_ID },
      // Also reveal an already selected Projects tab after a repeated load.
      projectPanelActivation: this.state.projectPanelActivation + 1,
    });
  }

  openControllerPanel(model: BaseWidgetObjectData): string | undefined {
    const key = model.keys[0];
    if (!key) {
      return undefined;
    }
    const right = this.state.right;
    const existing = right.controllerPanels.find(
      (panel) => panel.model.keys[0] === key
    );
    const panel = existing ?? { id: `controller:${key}`, title: key, model };
    if (!existing || right.activeTabId !== CONTROLLERS_TAB_ID) {
      let controllerPanels = right.controllerPanels;
      if (!existing) {
        controllerPanels = [...controllerPanels, panel];
      }
      this.commit({
        ...this.state,
        right: { ...right, activeTabId: CONTROLLERS_TAB_ID, controllerPanels },
      });
    }
    broadcast_event(KaraboEvent.ControllerPanelActivated, { id: panel.id });
    return panel.id;
  }

  closeControllerPanel(id: string): void {
    const right = this.state.right;
    const controllerPanels = right.controllerPanels.filter(
      (panel) => panel.id !== id
    );
    if (controllerPanels.length === right.controllerPanels.length) {
      return;
    }
    this.commit({
      ...this.state,
      right: { ...right, controllerPanels },
    });
  }

  getSceneTab(
    tabId: string
  ): SceneTabSnapshot | UnnatachedSceneTabSnapshot | undefined {
    return this.sceneTabs.get(tabId) ?? this.deviceSceneTabs.get(tabId);
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

  // Content lives outside the snapshot; advance center identity for its subscribers.
  setContent(tabId: string, data: SceneTabContent): void {
    this.content.set(tabId, this.resolveTabContent(tabId, data));

    if (data.sceneRef) {
      this.updateSceneTitle(tabId, data.sceneRef.name);
    }

    this.commit({ ...this.state, center: { ...this.state.center } });
  }

  // Update a single tab's fit mode and notify subscribers so the panel rescales.
  setFitMode(tabId: string, fitMode: FitMode): void {
    const existing = this.content.get(tabId);
    if (!existing || existing.fitMode === fitMode) {
      return;
    }

    this.content.set(tabId, { ...existing, fitMode });
    this.commit({ ...this.state, center: { ...this.state.center } });
  }

  resetCenter(): void {
    this.commit({ ...this.state, center: this.teardownCenter() });
  }

  // Full teardown for a session boundary. resetCenter() deliberately keeps the
  // side panels, which is right for "go home" within a session but wrong when
  // the session itself ends: nothing from the old session may stay reachable by
  // the next one. Iterates `content` rather than the center tabs so a registry
  // is disposed no matter which slot its tab lived in.
  resetWorkspace(): void {
    const center = this.teardownCenter();
    for (const content of this.content.values()) {
      content.sceneControllerRegistry?.dispose();
    }
    this.content.clear();
    this.sceneTabs.clear();
    this.deviceSceneTabs.clear();

    this.commit({
      ...this.state,
      left: createLeftArea(this.policy.showProjectNavigation),
      projectPanelActivation: 0,
      center,
      right: createRightArea(),
    });
  }

  // The single teardown of scene state behind both resets. It does not commit,
  // so each reset notifies subscribers once with its final state.
  private teardownCenter(): PanelState {
    for (const tabId of this.state.center.tabs.map((tab) => tab.id)) {
      this.content.get(tabId)?.sceneControllerRegistry?.dispose();
      this.content.delete(tabId);
      this.sceneTabs.delete(tabId);
      this.deviceSceneTabs.delete(tabId);
    }

    this.clearSavedActiveTab();
    return this.defaultCenter;
  }

  getSavedActiveTab(): SavedActiveTab | undefined {
    if (!this.policy.persistActiveTab) {
      return undefined;
    }
    const saved = readActiveTab();
    const session = useGlobalStore.getState().sessionInfo;
    if (!saved || !session) {
      return undefined;
    }

    // A reload reconnects to the server last used in any browser tab, which
    // is not necessarily the server this tab's scene belongs to.
    const sameServer =
      saved.host === session.guiServerHost &&
      saved.port === session.guiServerPort;
    return sameServer ? saved : undefined;
  }

  clearSavedActiveTab(): void {
    if (this.policy.persistActiveTab) {
      writeActiveTab(undefined);
    }
  }

  selectTab(area: PanelSlot, tabId: string): void {
    const areaModel = this.state[area];
    if (!areaModel.tabs.some((tab) => tab.id === tabId)) {
      return;
    }

    if (areaModel.activeTabId === tabId) {
      return;
    }

    this.commitTabChange({
      ...this.state,
      [area]: { ...areaModel, activeTabId: tabId },
    });
  }

  closeTab(area: PanelSlot, tabId: string): void {
    const areaModel = this.state[area];
    const tab = areaModel.tabs.find((tab) => tab.id === tabId);
    if (!tab || !tab.closable) {
      return;
    }

    const nextTabs = areaModel.tabs.filter((tab) => tab.id !== tabId);

    this.content.get(tabId)?.sceneControllerRegistry?.dispose();
    this.content.delete(tabId);
    this.sceneTabs.delete(tabId);
    this.deviceSceneTabs.delete(tabId);

    if (
      nextTabs.length === 0 &&
      area === 'center' &&
      (!this.projectSnapshot.root || !this.policy.showProjectNavigation)
    ) {
      broadcast_event(KaraboEvent.GoToHomeTab, {});
      return;
    }

    const nextActiveTabId =
      areaModel.activeTabId === tabId
        ? nextTabs[nextTabs.length - 1]?.id
        : areaModel.activeTabId;

    this.commitTabChange({
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

    this.sceneTabs.set(snapshot.id, snapshot);
    this.content.set(snapshot.id, this.resolveTabContent(snapshot.id, content));
    const index = center.tabs.findIndex((tab) => tab.id === snapshot.id);

    let tabs: PanelTab[];
    if (index !== -1) {
      tabs = center.tabs.map((tab, tabIndex) =>
        tabIndex === index ? nextTab : tab
      );
    } else if (this.isDefaultOnly()) {
      tabs = [nextTab];
    } else {
      tabs = [...center.tabs, nextTab];
    }

    this.commitTabChange({
      ...this.state,
      center: {
        ...center,
        tabs,
        activeTabId: snapshot.id,
      },
    });
  }

  private openDeviceScene(
    snapshot: UnnatachedSceneTabSnapshot,
    content: SceneTabContent
  ): void {
    const center = this.state.center;
    const nextTab = toUnattachedScenePanelTab(snapshot);

    this.deviceSceneTabs.set(snapshot.id, snapshot);
    this.content.set(snapshot.id, this.resolveTabContent(snapshot.id, content));
    const index = center.tabs.findIndex((tab) => tab.id === snapshot.id);

    let tabs: PanelTab[];
    if (index !== -1) {
      tabs = center.tabs.map((tab, tabIndex) =>
        tabIndex === index ? nextTab : tab
      );
    } else if (this.isDefaultOnly()) {
      tabs = [nextTab];
    } else {
      tabs = [...center.tabs, nextTab];
    }

    this.commitTabChange({
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
    this.emit();
  }

  // Opening, selecting, and closing tabs. Resets clear the saved tab instead,
  // so the event only ever means a tab change within the session.
  private commitTabChange(nextState: typeof this.state): void {
    const previousTabId = this.state.center.activeTabId;
    this.commit(nextState);
    if (this.state.center.activeTabId !== previousTabId) {
      this.onActiveSceneTabChanged();
    }
  }

  private onActiveSceneTabChanged(): void {
    const scene = this.getActiveCenterSceneTab();
    const session = useGlobalStore.getState().sessionInfo;
    if (this.policy.persistActiveTab) {
      writeActiveTab(
        scene && session
          ? {
              host: session.guiServerHost,
              port: session.guiServerPort,
              domain: scene.domain,
              projectUuid: scene.projectUuid,
              sceneUuid: scene.uuid,
            }
          : undefined
      );
    }
    broadcast_event(KaraboEvent.ActiveSceneTabChanged, {});
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
      }
    | undefined {
    const projectModel = getProjectModel();
    const project = projectModel.root;
    const domain = projectModel.domain;

    if (!project || !domain || !model.uuid) {
      return undefined;
    }

    const sceneProject = projectModel.getSceneProject(model.uuid);
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
      isUnattachedScene: false,
      id: toSceneTabId(model.uuid),
      title: sceneName,
      domain,
      projectUuid: sceneProject.uuid,
      projectName: sceneProject.simple_name,
      uuid: model.uuid,
    };

    return {
      snapshot,
      content: { sceneRef, sceneModel: model },
    };
  }

  private createUnattachedSceneOpenData(
    model: SceneModel,
    deviceId: string | undefined,
    tabId: string
  ):
    | {
        snapshot: UnnatachedSceneTabSnapshot;
        content: SceneTabContent;
        sceneRef: LoadedSceneRef;
      }
    | undefined {
    // For device scenes the simple-name is in the form ${deviceId}|${sceneName}
    // and thus unique
    const sceneId = model.simple_name;
    const sceneRef: LoadedSceneRef = {
      width: model.width,
      height: model.height,
      uuid: model.uuid,
      deviceId,
      name: sceneId,
    };

    const snapshot: UnnatachedSceneTabSnapshot = {
      isUnattachedScene: true,
      id: tabId,
      title: sceneId,
      deviceId,
      sceneName: sceneId,
    };

    return {
      snapshot,
      sceneRef,
      content: { sceneRef, sceneModel: model },
    };
  }

  private get defaultCenter(): PanelState {
    if (this.policy.showProjectNavigation && this.projectSnapshot.root) {
      return { id: 'center', tabs: [], activeTabId: undefined };
    }
    return createCenterArea(this.policy.defaultCenterTab);
  }

  private onEventRootProjectChanged = (): void => {
    const snapshot = getProjectModel().getSnapshot();
    const replaced =
      snapshot.root !== this.projectSnapshot.root ||
      snapshot.domain !== this.projectSnapshot.domain;
    this.projectSnapshot = snapshot;
    if (replaced || !snapshot.root) {
      this.state = { ...this.state, projectPanelActivation: 0 };
      this.resetCenter();
    }
  };

  // The database owns progress. Starting a fresh read clears the previous root;
  // subscribers see the final loading state together with the empty workspace.
  private onEventDatabaseBusy = (data: Hash): void => {
    const projectLoading = data.getValue<boolean>('is_processing');
    if (this.state.projectLoading === projectLoading) {
      return;
    }
    this.state = { ...this.state, projectLoading };
    if (projectLoading) {
      getProjectModel().clearRoot();
    } else {
      this.emit();
    }
  };

  private onEventGoToHomeTab = (): void => {
    getProjectModel().clearRoot();
  };

  private onEventOpenScene = (data: { model: SceneModel }): void => {
    const model = data.model;

    const sceneData = this.createSceneOpenData(model);
    if (!sceneData) {
      return;
    }

    this.openScene(sceneData.snapshot, sceneData.content);
  };

  private onEventOpenControllerPanel = (data: {
    model: BaseWidgetObjectData;
  }): void => {
    this.openControllerPanel(data.model);
  };

  private onEventOpenUnattachedScene = (data: {
    model: SceneModel;
    tabId?: string;
  }): void => {
    const model = data.model;
    // Unattached scenes whose names have a pipe '|' are assumed to be
    // device provided scenes and the deviceId comes before the pipe.
    let deviceId: string | undefined = undefined;
    const pipePos = model.simple_name.indexOf('|');
    if (pipePos > 0) {
      deviceId = model.simple_name.substring(0, model.simple_name.indexOf('|'));
    }
    const unattachedSceneData = this.createUnattachedSceneOpenData(
      model,
      deviceId,
      data.tabId ?? model.simple_name
    );
    if (!unattachedSceneData) {
      return;
    }
    this.openDeviceScene(
      unattachedSceneData.snapshot,
      unattachedSceneData.content
    );
  };

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

  private isDefaultOnly(): boolean {
    const center = this.state.center;
    return (
      center.tabs.length === 1 &&
      center.tabs[0]?.id === this.policy.defaultCenterTab.id
    );
  }

  private emit(): void {
    this.listeners.forEach((listener) => listener());
  }
}

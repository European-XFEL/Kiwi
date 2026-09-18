import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { KaraboEvent, broadcast_event } from '@/lib/events';
import { getMediator, getProjectModel } from '../api';
import { SceneControllerRegistry } from '@/features/scenepanel/SceneControllerRegistry';
import { HOME_TAB_ID, PanelWrangler } from '../PanelWrangler';

const mockSetRecentScene = jest.fn();

jest.mock('@/store/api', () => ({
  useGlobalStore: {
    getState: () => ({
      sessionInfo: {
        guiServerHost: 'host-a',
        guiServerPort: 44444,
        guiServerTopic: 'TOPIC_A',
      },
    }),
  },
  useRecentStore: {
    getState: () => ({
      setRecentScene: mockSetRecentScene,
    }),
  },
}));

function makeScene(uuid: string, simple_name = uuid): SceneModel {
  return new SceneModel({
    uuid,
    simple_name,
    width: 800,
    height: 600,
    initialized: true,
  });
}

function setProject(
  domain: string,
  projectName: string,
  scenes: SceneModel[]
): ProjectModel {
  const project = new ProjectModel({
    uuid: `project-${projectName}`,
    simple_name: projectName,
  });
  project.initialized = true;
  project.scenes = scenes;
  getProjectModel().setRoot(domain, project);
  return project;
}

function openScene(model: SceneModel) {
  broadcast_event(KaraboEvent.OpenScene, { model });
}

function openDeviceScene(model: SceneModel) {
  broadcast_event(KaraboEvent.OpenUnattachedScene, { model });
}

describe('PanelWrangler', () => {
  let wrangler: PanelWrangler;

  beforeEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
    getProjectModel().clearRoot();
    wrangler = new PanelWrangler();
  });

  afterEach(() => {
    wrangler.dispose();
  });

  it('starts with the home tab before any scene is opened', () => {
    expect(wrangler.getSnapshot().center.tabs).toEqual([
      { id: HOME_TAB_ID, title: 'Home', closable: false },
    ]);
    expect(wrangler.getSnapshot().center.activeTabId).toBe(HOME_TAB_ID);
  });

  it('opens scene tabs from OpenScene model events', () => {
    const scene = makeScene('scene-a', 'Scene A');
    setProject('CONTROLS', 'ProjectA', [scene]);

    openScene(scene);

    expect(wrangler.getSnapshot().center.tabs).toEqual([
      { id: 'scene:scene-a', title: 'Scene A', closable: true },
    ]);
    expect(wrangler.getSnapshot().center.activeTabId).toBe('scene:scene-a');
    const content = wrangler.getContent('scene:scene-a');
    expect(content).toMatchObject({
      sceneRef: {
        width: 800,
        height: 600,
        domain: 'CONTROLS',
        projectUuid: 'project-ProjectA',
        projectName: 'ProjectA',
        uuid: 'scene-a',
        name: 'Scene A',
      },
      sceneModel: scene,
      fitMode: 'fit-page',
    });
    // A scene opened via broadcast must carry a registry, otherwise
    // WorkspaceShell's loading gate never clears.
    expect(content?.sceneControllerRegistry).toBeInstanceOf(
      SceneControllerRegistry
    );
    expect(mockSetRecentScene).toHaveBeenCalledWith({
      topic: 'TOPIC_A',
      domain: 'CONTROLS',
      projectUuid: 'project-ProjectA',
      uuid: 'scene-a',
      name: 'Scene A',
      projectName: 'ProjectA',
    });
  });

  it('opens device scene tabs from OpenDeviceScene events', () => {
    const scene = makeScene('device-scene-a', 'DEVICE_A|Device Scene A');
    const tabId = 'DEVICE_A|Device Scene A';

    openDeviceScene(scene);

    expect(wrangler.getSnapshot().center.tabs).toEqual([
      {
        id: tabId,
        title: 'DEVICE_A|DEVICE_A|Device Scene A',
        closable: true,
      },
    ]);
    expect(wrangler.getSnapshot().center.activeTabId).toBe(tabId);
    expect(wrangler.getSceneTab(tabId)).toMatchObject({
      id: tabId,
      title: 'DEVICE_A|Device Scene A',
      deviceId: 'DEVICE_A',
      sceneName: 'DEVICE_A|Device Scene A',
    });
    expect(wrangler.getContent(tabId)).toMatchObject({
      sceneRef: {
        width: 800,
        height: 600,
        uuid: 'device-scene-a',
        deviceId: 'DEVICE_A',
        name: 'DEVICE_A|Device Scene A',
      },
      sceneModel: scene,
      fitMode: 'fit-page',
    });
  });

  it('keeps scenes from a subproject open with their owning project metadata', () => {
    const rootScene = makeScene('scene-root', 'Root Scene');
    const subprojectScene = makeScene('scene-child', 'Child Scene');
    const project = setProject('CONTROLS', 'ProjectA', [rootScene]);
    const subproject = new ProjectModel({
      uuid: 'project-child',
      simple_name: 'Child Project',
    });
    subproject.scenes = [subprojectScene];
    project.subprojects = [subproject];

    openScene(rootScene);
    openScene(subprojectScene);

    expect(wrangler.getSnapshot().center.tabs).toHaveLength(2);
    expect(wrangler.getSceneTab('scene:scene-child')).toMatchObject({
      projectUuid: 'project-child',
      projectName: 'Child Project',
    });
    expect(wrangler.getContent('scene:scene-child')?.sceneRef).toMatchObject({
      projectUuid: subproject.uuid,
    });
    expect(mockSetRecentScene).toHaveBeenLastCalledWith(
      expect.objectContaining({
        projectUuid: subproject.uuid,
      })
    );
    expect(wrangler.getSavedActiveTab()).toMatchObject({
      projectUuid: subproject.uuid,
      sceneUuid: 'scene-child',
    });

    wrangler.selectTab('center', 'scene:scene-root');
    expect(wrangler.getSavedActiveTab()).toMatchObject({
      projectUuid: project.uuid,
      sceneUuid: 'scene-root',
    });
    wrangler.selectTab('center', 'scene:scene-child');
    expect(wrangler.getSavedActiveTab()?.projectUuid).toBe(subproject.uuid);
  });

  it('reuses the existing SceneControllerRegistry when setContent targets the same scene', () => {
    const tabId = 'scene:scene-a';
    const sceneRef = {
      uuid: 'scene-a',
      domain: 'CONTROLS',
      projectUuid: 'project-ProjectA',
      projectName: 'ProjectA',
      name: 'Scene A',
      width: 800,
      height: 600,
    };

    wrangler.setContent(tabId, { sceneRef });
    const first = wrangler.getContent(tabId)?.sceneControllerRegistry;
    expect(first).toBeDefined();

    wrangler.setContent(tabId, { sceneRef: { ...sceneRef, name: 'Renamed' } });

    expect(wrangler.getContent(tabId)?.sceneControllerRegistry).toBe(first);
  });

  it('reuses the existing SceneControllerRegistry when the uuid stays the same but metadata changes', () => {
    const tabId = 'scene:scene-a';
    const sceneRef = {
      uuid: 'scene-a',
      domain: 'CONTROLS',
      projectUuid: 'project-ProjectA',
      projectName: 'ProjectA',
      name: 'Scene A',
      width: 800,
      height: 600,
    };

    wrangler.setContent(tabId, { sceneRef });
    wrangler.setFitMode(tabId, 'fit-width');
    const first = wrangler.getContent(tabId)?.sceneControllerRegistry;
    expect(first).toBeDefined();

    wrangler.setContent(tabId, {
      sceneRef: {
        ...sceneRef,
        domain: 'MID',
        projectUuid: 'project-ProjectB',
        projectName: 'ProjectB',
        name: 'Renamed',
      },
    });

    expect(wrangler.getContent(tabId)?.sceneControllerRegistry).toBe(first);
    expect(wrangler.getContent(tabId)?.fitMode).toBe('fit-width');
  });

  it('replaces the SceneControllerRegistry when setContent targets a different scene', () => {
    const tabId = 'scene:scene-a';
    const sceneRef = {
      uuid: 'scene-a',
      domain: 'CONTROLS',
      projectUuid: 'project-ProjectA',
      projectName: 'ProjectA',
      name: 'Scene A',
      width: 800,
      height: 600,
    };

    wrangler.setContent(tabId, { sceneRef });
    const first = wrangler.getContent(tabId)?.sceneControllerRegistry;
    expect(first).toBeDefined();

    wrangler.setContent(tabId, {
      sceneRef: { ...sceneRef, uuid: 'scene-b' },
    });

    const second = wrangler.getContent(tabId)?.sceneControllerRegistry;
    expect(second).toBeDefined();
    expect(second).not.toBe(first);
  });

  describe('fit mode', () => {
    const sceneRef = {
      uuid: 'scene-a',
      domain: 'CONTROLS',
      projectUuid: 'project-ProjectA',
      projectName: 'ProjectA',
      name: 'Scene A',
      width: 800,
      height: 600,
    };

    it('defaults a new tab to fit-page', () => {
      wrangler.setContent('scene:scene-a', { sceneRef });

      expect(wrangler.getContent('scene:scene-a')?.fitMode).toBe('fit-page');
    });

    it('persists each tab fit mode independently', () => {
      wrangler.setContent('scene:scene-a', { sceneRef });
      wrangler.setContent('scene:scene-b', {
        sceneRef: { ...sceneRef, uuid: 'scene-b' },
      });

      wrangler.setFitMode('scene:scene-a', 'fit-width');

      expect(wrangler.getContent('scene:scene-a')?.fitMode).toBe('fit-width');
      expect(wrangler.getContent('scene:scene-b')?.fitMode).toBe('fit-page');
    });

    it('preserves the fit mode across a same-scene content update', () => {
      wrangler.setContent('scene:scene-a', { sceneRef });
      wrangler.setFitMode('scene:scene-a', 'fit-height');

      wrangler.setContent('scene:scene-a', {
        sceneRef: { ...sceneRef, name: 'Renamed' },
      });

      expect(wrangler.getContent('scene:scene-a')?.fitMode).toBe('fit-height');
    });

    it('ignores setFitMode for an unknown tab', () => {
      wrangler.setFitMode('scene:missing', 'fit-width');

      expect(wrangler.getContent('scene:missing')).toBeUndefined();
    });
  });

  it('ignores model events when no project root is active', () => {
    openScene(makeScene('scene-a', 'Scene A'));

    expect(wrangler.getSnapshot().center.tabs).toEqual([
      { id: HOME_TAB_ID, title: 'Home', closable: false },
    ]);
  });

  describe('multiple tabs in the same project', () => {
    it('appends additional scenes and activates the newest', () => {
      const scenes = [makeScene('s1'), makeScene('s2'), makeScene('s3')];
      setProject('CONTROLS', 'ProjectA', scenes);

      scenes.forEach(openScene);

      const center = wrangler.getSnapshot().center;
      expect(center.tabs.map((tab) => tab.id)).toEqual([
        'scene:s1',
        'scene:s2',
        'scene:s3',
      ]);
      expect(center.activeTabId).toBe('scene:s3');
    });

    it('does not duplicate a tab when the same scene is reopened', () => {
      const sceneA = makeScene('s1');
      const sceneB = makeScene('s2');
      setProject('CONTROLS', 'ProjectA', [sceneA, sceneB]);

      openScene(sceneA);
      openScene(sceneB);
      openScene(sceneA);

      const center = wrangler.getSnapshot().center;
      expect(center.tabs.map((tab) => tab.id)).toEqual([
        'scene:s1',
        'scene:s2',
      ]);
      expect(center.activeTabId).toBe('scene:s1');
    });
  });

  it('clears previous project tabs when opening a scene from another project', () => {
    const sceneA = makeScene('s1');
    const sceneB = makeScene('s2');
    setProject('CONTROLS', 'ProjectA', [sceneA, sceneB]);
    openScene(sceneA);
    openScene(sceneB);

    const sceneC = makeScene('s3');
    setProject('CONTROLS', 'ProjectB', [sceneC]);
    openScene(sceneC);

    const center = wrangler.getSnapshot().center;
    expect(center.tabs.map((tab) => tab.id)).toEqual(['scene:s3']);
    expect(center.activeTabId).toBe('scene:s3');
    expect(wrangler.getSceneTab('scene:s1')).toBeUndefined();
    expect(wrangler.getContent('scene:s1')).toBeUndefined();
  });

  describe('closeTab', () => {
    it('ignores attempts to close the home tab', () => {
      wrangler.closeTab('center', HOME_TAB_ID);

      expect(wrangler.getSnapshot().center.tabs).toEqual([
        { id: HOME_TAB_ID, title: 'Home', closable: false },
      ]);
    });

    it('keeps the current active tab when closing a different tab', () => {
      const sceneA = makeScene('s1');
      const sceneB = makeScene('s2');
      setProject('CONTROLS', 'ProjectA', [sceneA, sceneB]);
      openScene(sceneA);
      openScene(sceneB);

      wrangler.closeTab('center', 'scene:s1');

      const center = wrangler.getSnapshot().center;
      expect(center.tabs.map((tab) => tab.id)).toEqual(['scene:s2']);
      expect(center.activeTabId).toBe('scene:s2');
    });

    it('restores home tab when closing the last scene tab', () => {
      const scene = makeScene('scene-a');
      setProject('CONTROLS', 'ProjectA', [scene]);
      openScene(scene);

      wrangler.closeTab('center', 'scene:scene-a');

      expect(wrangler.getSnapshot().center.tabs).toEqual([
        { id: HOME_TAB_ID, title: 'Home', closable: false },
      ]);
      expect(wrangler.getSnapshot().center.activeTabId).toBe(HOME_TAB_ID);
    });
  });

  describe('selectTab', () => {
    it('ignores selecting a tab that does not exist', () => {
      const scene = makeScene('s1');
      setProject('CONTROLS', 'ProjectA', [scene]);
      openScene(scene);

      wrangler.selectTab('center', 'scene:does-not-exist');

      expect(wrangler.getSnapshot().center.activeTabId).toBe('scene:s1');
    });
  });

  describe('resetWorkspace', () => {
    it('restores the home tab and drops every scene tab', () => {
      const sceneA = makeScene('s1');
      const sceneB = makeScene('s2');
      setProject('CONTROLS', 'ProjectA', [sceneA, sceneB]);
      openScene(sceneA);
      openScene(sceneB);

      wrangler.resetWorkspace();

      const center = wrangler.getSnapshot().center;
      expect(center.tabs).toEqual([
        { id: HOME_TAB_ID, title: 'Home', closable: false },
      ]);
      expect(center.activeTabId).toBe(HOME_TAB_ID);
    });

    it('disposes the registry of every open scene tab', () => {
      const sceneA = makeScene('s1');
      const sceneB = makeScene('s2');
      setProject('CONTROLS', 'ProjectA', [sceneA, sceneB]);
      openScene(sceneA);
      openScene(sceneB);

      const disposeA = jest.spyOn(
        wrangler.getContent('scene:s1')!
          .sceneControllerRegistry as SceneControllerRegistry,
        'dispose'
      );
      const disposeB = jest.spyOn(
        wrangler.getContent('scene:s2')!
          .sceneControllerRegistry as SceneControllerRegistry,
        'dispose'
      );

      wrangler.resetWorkspace();

      expect(disposeA).toHaveBeenCalledTimes(1);
      expect(disposeB).toHaveBeenCalledTimes(1);
    });

    // The difference that matters versus resetCenter: content is keyed
    // independently of the center tab list, so a registry belonging to any other
    // slot must not survive the session either.
    it('disposes content that is not reachable from the center tabs', () => {
      const sceneRef = {
        uuid: 'scene-orphan',
        domain: 'CONTROLS',
        projectUuid: 'project-ProjectA',
        projectName: 'ProjectA',
        name: 'Orphan',
        width: 800,
        height: 600,
      };
      wrangler.setContent('scene:scene-orphan', { sceneRef });
      const registry = wrangler.getContent('scene:scene-orphan')
        ?.sceneControllerRegistry as SceneControllerRegistry;
      const disposeSpy = jest.spyOn(registry, 'dispose');

      wrangler.resetWorkspace();

      expect(disposeSpy).toHaveBeenCalledTimes(1);
      expect(wrangler.getContent('scene:scene-orphan')).toBeUndefined();
    });

    it('forgets per-tab content and scene metadata', () => {
      const scene = makeScene('scene-a');
      setProject('CONTROLS', 'ProjectA', [scene]);
      openScene(scene);
      expect(wrangler.getContent('scene:scene-a')).toBeDefined();
      expect(wrangler.getSceneTab('scene:scene-a')).toBeDefined();

      wrangler.resetWorkspace();

      expect(wrangler.getContent('scene:scene-a')).toBeUndefined();
      expect(wrangler.getSceneTab('scene:scene-a')).toBeUndefined();
    });

    it('recreates all three panel slots as empty', () => {
      const scene = makeScene('scene-a');
      setProject('CONTROLS', 'ProjectA', [scene]);
      openScene(scene);

      wrangler.resetWorkspace();

      const state = wrangler.getSnapshot();
      expect(state.left).toEqual({
        id: 'left',
        tabs: [],
        activeTabId: undefined,
      });
      expect(state.right).toEqual({
        id: 'right',
        tabs: [],
        activeTabId: undefined,
      });
    });

    it('is a no-op on an untouched workspace', () => {
      wrangler.resetWorkspace();

      expect(wrangler.getSnapshot().center.tabs).toEqual([
        { id: HOME_TAB_ID, title: 'Home', closable: false },
      ]);
      expect(wrangler.getSnapshot().center.activeTabId).toBe(HOME_TAB_ID);
    });
  });

  describe('saved active tab', () => {
    const storageKey = 'kiwi/workspace:activeTab';
    const savedScene = {
      host: 'host-a',
      port: 44444,
      domain: 'CONTROLS',
      projectUuid: 'project-ProjectA',
      sceneUuid: 'scene-a',
    };

    afterEach(() => jest.restoreAllMocks());

    it('saves the active project scene with its server and forgets it at Home', () => {
      const scene = makeScene('scene-a');
      setProject('CONTROLS', 'ProjectA', [scene]);

      openScene(scene);
      expect(wrangler.getSavedActiveTab()).toEqual(savedScene);

      wrangler.closeTab('center', 'scene:scene-a');
      expect(wrangler.getSavedActiveTab()).toBeUndefined();
    });

    it('forgets the saved scene when a device scene becomes active', () => {
      const scene = makeScene('scene-a');
      setProject('CONTROLS', 'ProjectA', [scene]);
      openScene(scene);

      openDeviceScene(makeScene('device-scene', 'DEVICE_A|overview'));

      expect(wrangler.getSavedActiveTab()).toBeUndefined();
    });

    it('announces ActiveSceneTabChanged only when the active scene tab changes', () => {
      const sceneA = makeScene('s1');
      const sceneB = makeScene('s2');
      setProject('CONTROLS', 'ProjectA', [sceneA, sceneB]);
      const onActiveSceneTabChanged = jest.fn();
      const unsubscribe = getMediator().on(
        KaraboEvent.ActiveSceneTabChanged,
        onActiveSceneTabChanged
      );

      openScene(sceneA); // Home -> s1
      openScene(sceneB); // s1 -> s2
      wrangler.setFitMode('scene:s2', 'fit-width');
      wrangler.selectTab('center', 'scene:s1'); // s2 -> s1
      wrangler.closeTab('center', 'scene:s2'); // s1 stays active

      expect(onActiveSceneTabChanged).toHaveBeenCalledTimes(3);
      unsubscribe();
    });

    it.each([
      ['the Home button', () => broadcast_event(KaraboEvent.GoHome, {})],
      [
        'closing the last tab',
        () => wrangler.closeTab('center', 'scene:scene-a'),
      ],
    ])(
      'goes Home on %s: resets the tabs, the saved tab, and the project',
      (_trigger, goHome) => {
        const scene = makeScene('scene-a');
        setProject('CONTROLS', 'ProjectA', [scene]);
        openScene(scene);
        const onActiveSceneTabChanged = jest.fn();
        const unsubscribe = getMediator().on(
          KaraboEvent.ActiveSceneTabChanged,
          onActiveSceneTabChanged
        );

        goHome();

        expect(wrangler.getSnapshot().center.tabs).toEqual([
          { id: HOME_TAB_ID, title: 'Home', closable: false },
        ]);
        expect(getProjectModel().root).toBeUndefined();
        expect(wrangler.getSavedActiveTab()).toBeUndefined();
        expect(onActiveSceneTabChanged).not.toHaveBeenCalled();
        unsubscribe();
      }
    );

    it('forgets the saved tab when the session ends without announcing a tab change', () => {
      const scene = makeScene('scene-a');
      setProject('CONTROLS', 'ProjectA', [scene]);
      openScene(scene);
      const onActiveSceneTabChanged = jest.fn();
      const unsubscribe = getMediator().on(
        KaraboEvent.ActiveSceneTabChanged,
        onActiveSceneTabChanged
      );

      wrangler.resetWorkspace();

      expect(wrangler.getSavedActiveTab()).toBeUndefined();
      expect(onActiveSceneTabChanged).not.toHaveBeenCalled();
      unsubscribe();
    });

    it('keeps switching tabs when session storage rejects the write', () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      });
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const sceneA = makeScene('s1');
      const sceneB = makeScene('s2');
      setProject('CONTROLS', 'ProjectA', [sceneA, sceneB]);

      openScene(sceneA);
      openScene(sceneB);
      wrangler.selectTab('center', 'scene:s1');

      expect(wrangler.getSnapshot().center.activeTabId).toBe('scene:s1');
      expect(wrangler.getSavedActiveTab()).toBeUndefined();
    });

    it.each([
      [
        'saved on a different host',
        JSON.stringify({ ...savedScene, host: 'host-b' }),
      ],
      [
        'saved on a different port',
        JSON.stringify({ ...savedScene, port: 44445 }),
      ],
      [
        'missing its project',
        JSON.stringify({ ...savedScene, projectUuid: '' }),
      ],
      ['not valid JSON', '{"host":'],
    ])('does not restore a scene %s', (_reason, stored) => {
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      sessionStorage.setItem(storageKey, stored);

      expect(wrangler.getSavedActiveTab()).toBeUndefined();
    });

    it('does not restore when session storage cannot be read', () => {
      sessionStorage.setItem(storageKey, JSON.stringify(savedScene));
      jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Access denied', 'SecurityError');
      });
      jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      expect(wrangler.getSavedActiveTab()).toBeUndefined();
    });
  });

  it('notifies subscribers on change and stops after unsubscribe', () => {
    const sceneA = makeScene('s1');
    const sceneB = makeScene('s2');
    setProject('CONTROLS', 'ProjectA', [sceneA, sceneB]);
    const listener = jest.fn();
    const unsubscribe = wrangler.subscribe(listener);

    openScene(sceneA);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    openScene(sceneB);
    expect(listener).not.toHaveBeenCalled();
  });

  it('stops reacting to OpenScene events after dispose', () => {
    const scene = makeScene('s1');
    setProject('CONTROLS', 'ProjectA', [scene]);
    wrangler.dispose();

    openScene(scene);

    expect(wrangler.getSnapshot().center.tabs).toEqual([
      { id: HOME_TAB_ID, title: 'Home', closable: false },
    ]);

    wrangler = new PanelWrangler();
  });
});

import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Hash } from '@/karabo/data/hash';
import { HashType } from '@/karabo/data/typenums';
import { KaraboEvent, broadcast_event } from '@/lib/events';
import { getProjectModel } from '../api';
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

function createOpenSceneHash(model: SceneModel): Hash {
  const hash = new Hash();
  hash.set('model', { type_: HashType.None_, value_: model });
  return hash;
}

function openScene(model: SceneModel) {
  broadcast_event(KaraboEvent.OpenScene, createOpenSceneHash(model));
}

describe('PanelWrangler', () => {
  let wrangler: PanelWrangler;

  beforeEach(() => {
    window.history.replaceState(null, '', '/main');
    jest.clearAllMocks();
    getProjectModel().root = undefined;
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

  it('writes scene params on open and clears them when returning home', () => {
    const scene = makeScene('scene-a');
    setProject('CONTROLS', 'ProjectA', [scene]);

    openScene(scene);

    const opened = new URLSearchParams(window.location.search);
    expect(opened.get('host')).toBe('host-a');
    expect(opened.get('port')).toBe('44444');
    expect(opened.get('sceneUuid')).toBe('scene-a');
    expect(opened.get('domain')).toBe('CONTROLS');
    expect(opened.get('projectUuid')).toBe('project-ProjectA');
    expect(opened.get('projectName')).toBeNull();

    wrangler.closeTab('center', 'scene:scene-a');
    expect(window.location.search).toBe('');
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

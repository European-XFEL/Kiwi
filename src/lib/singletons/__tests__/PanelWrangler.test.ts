import { Hash } from '@/karabo/data/hash';
import { KaraboEvent, broadcast_event } from '@/lib/events';
import { HOME_TAB_ID, PanelWrangler } from '../PanelWrangler';

jest.mock('@/lib/request', () => ({
  fetchSceneContent: jest.fn(),
}));

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
      setRecentScene: jest.fn(),
    }),
  },
}));

const { fetchSceneContent } = jest.requireMock('@/lib/request') as {
  fetchSceneContent: jest.Mock;
};

function createOpenSceneHash(params: {
  uuid: string;
  domain?: string;
  projectName?: string;
  name?: string;
}) {
  const hash = new Hash();
  hash.set('uuid', params.uuid);

  if (params.domain !== undefined) {
    hash.set('domain', params.domain);
  }
  if (params.projectName !== undefined) {
    hash.set('project', params.projectName);
  }
  if (params.name) {
    hash.set('name', params.name);
  }

  return hash;
}

function openScene(params: {
  uuid: string;
  domain?: string;
  projectName?: string;
  name?: string;
}) {
  broadcast_event(KaraboEvent.OpenScene, createOpenSceneHash(params));
}

function createOpenSceneBrowserHash(params: {
  uuid: string;
  domain: string;
  projectName: string;
  host: string;
  port: number;
  name?: string;
}) {
  const hash = new Hash();
  hash.set('uuid', params.uuid);
  hash.set('domain', params.domain);
  hash.set('project', params.projectName);
  hash.set('host', params.host);
  hash.set('port', params.port);

  if (params.name) {
    hash.set('name', params.name);
  }

  return hash;
}

function openSceneBrowser(params: {
  uuid: string;
  domain: string;
  projectName: string;
  host: string;
  port: number;
  name?: string;
}) {
  broadcast_event(
    KaraboEvent.OpenSceneBrowser,
    createOpenSceneBrowserHash(params)
  );
}

/** A promise whose resolver is exposed so a test can control fetch timing. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('PanelWrangler', () => {
  let wrangler: PanelWrangler;

  beforeEach(() => {
    window.history.replaceState(null, '', '/main');
    jest.clearAllMocks();
    fetchSceneContent.mockResolvedValue(null);
    wrangler = new PanelWrangler();
  });

  afterEach(() => {
    wrangler.dispose();
  });

  it('opens scene tabs from OpenScene events', () => {
    broadcast_event(
      KaraboEvent.OpenScene,
      createOpenSceneHash({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
        name: 'Scene A',
      })
    );

    expect(wrangler.getSnapshot().center.tabs).toEqual([
      { id: 'scene:scene-a', title: 'Scene A', closable: true },
    ]);
    expect(wrangler.getSnapshot().center.activeTabId).toBe('scene:scene-a');
  });

  it('starts with the home tab before any scene is opened', () => {
    expect(wrangler.getSnapshot().center.tabs).toEqual([
      { id: HOME_TAB_ID, title: 'Home', closable: false },
    ]);
    expect(wrangler.getSnapshot().center.activeTabId).toBe(HOME_TAB_ID);
  });

  it('fetches and stores active scene content', async () => {
    fetchSceneContent.mockResolvedValue({
      uuid: 'scene-a',
      simple_name: 'beckhoff',
      width: 800,
      height: 600,
    });

    broadcast_event(
      KaraboEvent.OpenScene,
      createOpenSceneHash({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
        name: 'Scene A',
      })
    );

    await flushPromises();

    expect(fetchSceneContent).toHaveBeenCalledWith(
      'CONTROLS',
      'ProjectA',
      'scene-a'
    );
    expect(wrangler.getContent('scene:scene-a')?.sceneRef?.name).toBe(
      'beckhoff'
    );
    expect(wrangler.getSnapshot().center.tabs[0]?.title).toBe('beckhoff');
  });

  it('restores home tab when closing the last scene tab', () => {
    broadcast_event(
      KaraboEvent.OpenScene,
      createOpenSceneHash({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
      })
    );

    wrangler.closeTab('center', 'scene:scene-a');

    expect(wrangler.getSnapshot().center.tabs).toEqual([
      { id: HOME_TAB_ID, title: 'Home', closable: false },
    ]);
    expect(wrangler.getSnapshot().center.activeTabId).toBe(HOME_TAB_ID);
  });

  describe('multiple tabs (same project)', () => {
    it('appends additional scenes as tabs and activates the newest', () => {
      openScene({ uuid: 's1', domain: 'CONTROLS', projectName: 'ProjectA' });
      openScene({ uuid: 's2', domain: 'CONTROLS', projectName: 'ProjectA' });
      openScene({ uuid: 's3', domain: 'CONTROLS', projectName: 'ProjectA' });

      const center = wrangler.getSnapshot().center;
      expect(center.tabs.map((tab) => tab.id)).toEqual([
        'scene:s1',
        'scene:s2',
        'scene:s3',
      ]);
      expect(center.activeTabId).toBe('scene:s3');
    });

    it('does not duplicate a tab when the same scene is reopened', () => {
      openScene({ uuid: 's1', domain: 'CONTROLS', projectName: 'ProjectA' });
      openScene({ uuid: 's2', domain: 'CONTROLS', projectName: 'ProjectA' });
      openScene({ uuid: 's1', domain: 'CONTROLS', projectName: 'ProjectA' });

      const center = wrangler.getSnapshot().center;
      expect(center.tabs.map((tab) => tab.id)).toEqual([
        'scene:s1',
        'scene:s2',
      ]);
      expect(center.activeTabId).toBe('scene:s1');
    });
  });

  describe('switching projects', () => {
    it('clears all tabs from the previous project and keeps only the new scene', () => {
      openScene({ uuid: 's1', domain: 'CONTROLS', projectName: 'ProjectA' });
      openScene({ uuid: 's2', domain: 'CONTROLS', projectName: 'ProjectA' });

      openScene({ uuid: 's3', domain: 'CONTROLS', projectName: 'ProjectB' });

      const center = wrangler.getSnapshot().center;
      expect(center.tabs.map((tab) => tab.id)).toEqual(['scene:s3']);
      expect(center.activeTabId).toBe('scene:s3');
      expect(wrangler.getSceneTab('scene:s1')).toBeUndefined();
      expect(wrangler.getSceneTab('scene:s2')).toBeUndefined();
      expect(wrangler.getContent('scene:s1')).toBeUndefined();
    });
  });

  describe('closeTab', () => {
    it('ignores attempts to close the home tab', () => {
      wrangler.closeTab('center', HOME_TAB_ID);

      expect(wrangler.getSnapshot().center.tabs).toEqual([
        { id: HOME_TAB_ID, title: 'Home', closable: false },
      ]);
    });

    it('keeps the current active tab when closing a different tab', () => {
      openScene({ uuid: 's1', domain: 'CONTROLS', projectName: 'ProjectA' });
      openScene({ uuid: 's2', domain: 'CONTROLS', projectName: 'ProjectA' });
      // s2 is active; close the inactive s1.
      wrangler.closeTab('center', 'scene:s1');

      const center = wrangler.getSnapshot().center;
      expect(center.tabs.map((tab) => tab.id)).toEqual(['scene:s2']);
      expect(center.activeTabId).toBe('scene:s2');
    });

    it('activates the last remaining tab when the active middle tab is closed', () => {
      openScene({ uuid: 's1', domain: 'CONTROLS', projectName: 'ProjectA' });
      openScene({ uuid: 's2', domain: 'CONTROLS', projectName: 'ProjectA' });
      openScene({ uuid: 's3', domain: 'CONTROLS', projectName: 'ProjectA' });
      wrangler.selectTab('center', 'scene:s2');

      wrangler.closeTab('center', 'scene:s2');

      const center = wrangler.getSnapshot().center;
      expect(center.tabs.map((tab) => tab.id)).toEqual([
        'scene:s1',
        'scene:s3',
      ]);
      // NOTE: current behaviour jumps to the LAST tab, not the neighbour.
      expect(center.activeTabId).toBe('scene:s3');
    });
  });

  describe('selectTab', () => {
    it('ignores selecting a tab that does not exist', () => {
      openScene({ uuid: 's1', domain: 'CONTROLS', projectName: 'ProjectA' });

      wrangler.selectTab('center', 'scene:does-not-exist');

      expect(wrangler.getSnapshot().center.activeTabId).toBe('scene:s1');
    });
  });

  describe('OpenScene field inheritance', () => {
    it('inherits domain and project from the active scene when omitted', () => {
      openScene({ uuid: 's1', domain: 'CONTROLS', projectName: 'ProjectA' });

      // No domain/project in the event - should inherit from the active scene
      // and therefore be treated as the same project (append, not replace).
      openScene({ uuid: 's2' });

      const center = wrangler.getSnapshot().center;
      expect(center.tabs.map((tab) => tab.id)).toEqual([
        'scene:s1',
        'scene:s2',
      ]);
    });

    it('ignores the event when domain/project are missing and nothing is active', () => {
      openScene({ uuid: 's1' });

      expect(wrangler.getSnapshot().center.tabs).toEqual([
        { id: HOME_TAB_ID, title: 'Home', closable: false },
      ]);
    });
  });

  describe('content fetching', () => {
    it('does not refetch content that is already loaded', async () => {
      fetchSceneContent.mockResolvedValue({
        uuid: 'scene-a',
        simple_name: 'beckhoff',
        width: 800,
        height: 600,
      });

      openScene({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
      });
      await flushPromises();
      expect(wrangler.getContent('scene:scene-a')).toBeDefined();

      fetchSceneContent.mockClear();
      // Re-selecting the already-active, already-loaded tab must not refetch.
      wrangler.selectTab('center', 'scene:scene-a');
      await flushPromises();

      expect(fetchSceneContent).not.toHaveBeenCalled();
    });

    it('stores an error on the tab when the fetch rejects', async () => {
      fetchSceneContent.mockRejectedValue(new Error('DB unavailable'));

      openScene({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
      });
      await flushPromises();

      expect(wrangler.getContent('scene:scene-a')?.error).toBe(
        'DB unavailable'
      );
    });

    it('stores an error on the tab when the fetch resolves without a scene', async () => {
      fetchSceneContent.mockResolvedValue(null);

      openScene({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
      });
      await flushPromises();

      expect(wrangler.getContent('scene:scene-a')?.error).toBe(
        'The scene could not be loaded.'
      );
    });

    it('retries a tab whose previous content load failed', async () => {
      fetchSceneContent
        .mockRejectedValueOnce(new Error('DB unavailable'))
        .mockResolvedValueOnce({
          uuid: 'scene-a',
          simple_name: 'beckhoff',
          width: 800,
          height: 600,
        });

      openScene({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
      });
      await flushPromises();
      expect(wrangler.getContent('scene:scene-a')?.error).toBe(
        'DB unavailable'
      );

      wrangler.selectTab('center', 'scene:scene-a');
      await flushPromises();

      expect(fetchSceneContent).toHaveBeenCalledTimes(2);
      expect(wrangler.getContent('scene:scene-a')?.sceneRef?.name).toBe(
        'beckhoff'
      );
      expect(wrangler.getContent('scene:scene-a')?.error).toBeUndefined();
    });

    it('does not store an error for a tab closed before the fetch rejects', async () => {
      let reject!: (reason: unknown) => void;
      fetchSceneContent.mockReturnValue(
        new Promise((_resolve, rej) => {
          reject = rej;
        })
      );

      openScene({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
      });
      wrangler.closeTab('center', 'scene:scene-a');

      reject(new Error('DB unavailable'));
      await flushPromises();

      expect(wrangler.getContent('scene:scene-a')).toBeUndefined();
    });

    it('discards content that resolves after its tab was closed', async () => {
      const pending = deferred<{
        uuid: string;
        simple_name: string;
        width: number;
        height: number;
      }>();
      fetchSceneContent.mockReturnValue(pending.promise);

      openScene({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
      });
      // Close the tab while the fetch is still in flight.
      wrangler.closeTab('center', 'scene:scene-a');

      pending.resolve({
        uuid: 'scene-a',
        simple_name: 'beckhoff',
        width: 800,
        height: 600,
      });
      await flushPromises();

      expect(wrangler.getContent('scene:scene-a')).toBeUndefined();
    });

    it('ignores stale content when the same scene id is reopened before the old fetch resolves', async () => {
      const firstLoad = deferred<{
        uuid: string;
        simple_name: string;
        width: number;
        height: number;
      }>();
      fetchSceneContent
        .mockReturnValueOnce(firstLoad.promise)
        .mockResolvedValueOnce({
          uuid: 'scene-a',
          simple_name: 'new-project-scene',
          width: 1024,
          height: 768,
        });

      openScene({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
      });
      wrangler.closeTab('center', 'scene:scene-a');
      openScene({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectB',
      });
      await flushPromises();

      expect(wrangler.getContent('scene:scene-a')?.sceneRef?.projectName).toBe(
        'ProjectB'
      );

      firstLoad.resolve({
        uuid: 'scene-a',
        simple_name: 'old-project-scene',
        width: 800,
        height: 600,
      });
      await flushPromises();

      expect(wrangler.getContent('scene:scene-a')?.sceneRef?.projectName).toBe(
        'ProjectB'
      );
      expect(wrangler.getContent('scene:scene-a')?.sceneRef?.name).toBe(
        'new-project-scene'
      );
    });

    it('accepts content when the same scene is reopened with a different host/port mid-load', async () => {
      const firstLoad = deferred<{
        uuid: string;
        simple_name: string;
        width: number;
        height: number;
      }>();
      fetchSceneContent.mockReturnValueOnce(firstLoad.promise);

      openSceneBrowser({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
        host: 'host-a',
        port: 44444,
      });
      // Reopen the SAME scene from a different server while the load is in
      // flight. host/port are not part of scene identity, so this must not
      // invalidate the in-flight content.
      openSceneBrowser({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
        host: 'host-b',
        port: 55555,
      });

      firstLoad.resolve({
        uuid: 'scene-a',
        simple_name: 'beckhoff',
        width: 800,
        height: 600,
      });
      await flushPromises();

      expect(wrangler.getContent('scene:scene-a')?.sceneRef?.name).toBe(
        'beckhoff'
      );
      expect(wrangler.getContent('scene:scene-a')?.error).toBeUndefined();
    });
  });

  describe('host/port sourcing', () => {
    it('OpenSceneBrowser takes host/port from the event payload', () => {
      openSceneBrowser({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
        host: 'remote-host',
        port: 12345,
        name: 'Scene A',
      });

      expect(wrangler.getSnapshot().center.tabs.map((tab) => tab.id)).toEqual([
        'scene:scene-a',
      ]);

      const params = new URLSearchParams(window.location.search);
      expect(params.get('host')).toBe('remote-host');
      expect(params.get('port')).toBe('12345');
      expect(params.get('domain')).toBe('CONTROLS');
      expect(params.get('projectName')).toBe('ProjectA');
      expect(params.get('uuid')).toBe('scene-a');
    });

    it('OpenScene uses the current session host/port, not the event payload', () => {
      // The mocked session exposes host-a:44444; the internal event carries no
      // host/port and must inherit the live connection.
      openScene({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
      });

      const params = new URLSearchParams(window.location.search);
      expect(params.get('host')).toBe('host-a');
      expect(params.get('port')).toBe('44444');
    });
  });

  describe('browser URL sync', () => {
    it('writes scene params on open and clears them when returning home', () => {
      openScene({
        uuid: 'scene-a',
        domain: 'CONTROLS',
        projectName: 'ProjectA',
      });

      const opened = new URLSearchParams(window.location.search);
      expect(opened.get('uuid')).toBe('scene-a');
      expect(opened.get('domain')).toBe('CONTROLS');
      expect(opened.get('projectName')).toBe('ProjectA');

      wrangler.closeTab('center', 'scene:scene-a');
      expect(window.location.search).toBe('');
    });
  });

  describe('subscriptions', () => {
    it('notifies subscribers on change and stops after unsubscribe', () => {
      const listener = jest.fn();
      const unsubscribe = wrangler.subscribe(listener);

      openScene({ uuid: 's1', domain: 'CONTROLS', projectName: 'ProjectA' });
      expect(listener).toHaveBeenCalled();

      unsubscribe();
      listener.mockClear();
      openScene({ uuid: 's2', domain: 'CONTROLS', projectName: 'ProjectA' });
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('dispose', () => {
    it('stops reacting to OpenScene events after dispose', () => {
      wrangler.dispose();

      openScene({ uuid: 's1', domain: 'CONTROLS', projectName: 'ProjectA' });

      expect(wrangler.getSnapshot().center.tabs).toEqual([
        { id: HOME_TAB_ID, title: 'Home', closable: false },
      ]);

      // Re-create so afterEach's dispose() has a live instance to clean up.
      wrangler = new PanelWrangler();
    });
  });
});

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { Hash, HashList, encodeXML } from '@/karabo/data/api';
import { singletons } from '@/lib/singletons/api';
import { KaraboEvent } from '@/lib/events';
import { DbConnection } from '@/lib/singletons/DbConn';
import { Mediator } from '@/lib/singletons/Mediator';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';
import { useGlobalStore } from '@/store/api';
import { SingletonContext } from '@/testing';
import WorkspaceCenterArea from '@/features/workspace/components/WorkspaceCenterArea';
import ProjectPanel from '../ProjectPanel';
import { loadRootProject } from '@/features/project/api';
import { showMessageBox } from '@/lib/messagebox';

jest.mock('@/lib/messagebox', () => ({ showMessageBox: jest.fn() }));
jest.mock('@/app/HomePanel', () => {
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', null, 'Home content'),
  };
});

let db: DbConnection;
let mediator: Mediator;
let model: ProjectItemModel;
let wrangler: PanelWrangler;
let context: SingletonContext;
const requests: string[][] = [];

beforeEach(() => {
  jest.clearAllMocks();
  requests.length = 0;
  jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(360);
  jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
  mediator = new Mediator();
  model = new ProjectItemModel();
  context = new SingletonContext({
    mediator,
    project_model: model,
    db_conn: undefined,
    panel_wrangler: undefined,
    network: {
      onProjectListItems: jest.fn(),
      onProjectLoadItems: (items: HashList) =>
        requests.push(
          Array.from(items, (item) => item.getValue<string>('uuid'))
        ),
    },
  });
  db = new DbConnection();
  singletons.set('db_conn', db);
  wrangler = new PanelWrangler();
  singletons.set('panel_wrangler', wrangler);
  useGlobalStore.getState().setLoggedIn({
    loggedUser: 'test',
    accessLevel: 0,
    isReadOnly: true,
    guiServerHost: 'host',
    guiServerPort: 44444,
    guiServerTopic: 'CONTROLS',
    guiServerVersion: '2.20.0',
    sessionStartEpoc: 1,
  });
});

afterEach(() => {
  cleanup();
  wrangler.dispose();
  db.dispose();
  useGlobalStore.getState().reset();
  context.restore();
  jest.restoreAllMocks();
});

function projectXml(uuid: string, scenes: string[], subprojects: string[]) {
  const project = new Hash(
    'scenes',
    new HashList(scenes.map((uuid) => new Hash('uuid', uuid))),
    'subprojects',
    new HashList(subprojects.map((uuid) => new Hash('uuid', uuid)))
  );
  return `<xml item_type="project" uuid="${uuid}" simple_name="${uuid}" date="2026-07-01T00:00:00">${encodeXML(new Hash('project', project))}</xml>`;
}

function sceneXml(uuid: string) {
  return `<xml item_type="scene" uuid="${uuid}" simple_name="${uuid}" date="2026-07-01T00:00:00"><svg:svg xmlns:svg="http://www.w3.org/2000/svg" xmlns:krb="http://karabo.eu/scene" krb:version="2" width="640" height="480" /></xml>`;
}

function reply(items: [string, string][]) {
  act(() =>
    mediator.postEvent(
      KaraboEvent.LoadProjectItems,
      new Hash({
        success: true,
        'reply.items': new HashList(
          items.map(
            ([uuid, xml]) => new Hash({ uuid, xml, domain: 'CONTROLS' })
          )
        ),
      })
    )
  );
}

async function start() {
  let handle: ReturnType<typeof loadRootProject>;
  await act(async () => {
    handle = loadRootProject({ domain: 'CONTROLS', projectUuid: 'root' });
    mediator.postEvent(
      KaraboEvent.ListItems,
      new Hash({
        reason: '',
        'reply.items': new HashList([
          new Hash({
            uuid: 'root',
            simple_name: 'root',
            date: '',
            is_trashed: false,
          }),
        ]),
      })
    );
  });
  return handle!;
}

function expectPending() {
  expect(model.getSnapshot().nodes).toEqual([]);
  expect(wrangler.getSnapshot().center.tabs.map((tab) => tab.id)).toEqual([
    'home',
  ]);
  expect(wrangler.getSnapshot().projectLoading).toBe(true);
}

it('waits across scene and nested-subproject database batches before publishing the tree', async () => {
  render(
    <>
      <ProjectPanel />
      <WorkspaceCenterArea isVisible />
    </>
  );
  const handle = await start();
  expect(requests).toEqual([['root']]);
  expectPending();
  reply([['root', projectXml('root', ['root-scene'], ['child'])]]);
  expect(requests[1]).toEqual(['root-scene', 'child']);
  expectPending();
  reply([['root-scene', sceneXml('root-scene')]]);
  expectPending();
  reply([['child', projectXml('child', ['child-scene'], ['grandchild'])]]);
  expectPending();
  expect(requests[2]).toEqual(['child-scene', 'grandchild']);
  reply([
    ['child-scene', sceneXml('child-scene')],
    ['grandchild', projectXml('grandchild', ['deep-scene'], [])],
  ]);
  expectPending();
  expect(requests[3]).toEqual(['deep-scene']);
  await act(async () => {
    reply([['deep-scene', sceneXml('deep-scene')]]);
    await handle.promise;
  });
  expect(model.getSceneProject('deep-scene')?.uuid).toBe('grandchild');
  expect(wrangler.getSnapshot().projectLoading).toBe(false);
  expect(wrangler.isSceneTabOpen()).toBe(false);
  expect(wrangler.getSnapshot().center.tabs).toEqual([]);
  expect(screen.queryAllByRole('tab')).toHaveLength(0);
  fireEvent.doubleClick(
    screen.getByText('root-scene').closest('[role="treeitem"]')!
  );
  expect(screen.getByRole('tab', { name: 'root-scene' })).toHaveAttribute(
    'aria-selected',
    'true'
  );
  fireEvent.click(screen.getByRole('button', { name: 'Close root-scene' }));
  expect(wrangler.getSnapshot().center.tabs).toEqual([]);
  expect(screen.queryAllByRole('tab')).toHaveLength(0);
  expect(model.root?.uuid).toBe('root');
});

it.each(['failure', 'cancel', 'session'] as const)(
  'does not attach a partial project after %s',
  async (ending) => {
    render(
      <>
        <ProjectPanel />
        <WorkspaceCenterArea isVisible />
      </>
    );
    const handle = await start();
    reply([['root', projectXml('root', ['root-scene'], ['child'])]]);
    expectPending();
    const rejected = expect(handle.promise).rejects.toThrow();
    await act(async () => {
      if (ending === 'failure') {
        mediator.postEvent(
          KaraboEvent.LoadProjectItems,
          new Hash({ success: false, reason: 'Database unavailable' })
        );
      } else if (ending === 'session') {
        useGlobalStore.getState().setLoggedOut();
        db.reset();
      } else {
        handle.abort();
      }
      await rejected;
    });
    if (ending !== 'failure') {
      reply([
        ['root-scene', sceneXml('root-scene')],
        ['child', projectXml('child', [], [])],
      ]);
    }
    expect(model.root).toBeUndefined();
    expect(model.getSnapshot().nodes).toEqual([]);
    expect(screen.queryByText('root-scene')).toBeNull();
    expect(showMessageBox).toHaveBeenCalledTimes(ending === 'failure' ? 1 : 0);
  }
);

it('cancels on session termination while the project list is still pending', async () => {
  const handle = loadRootProject({ domain: 'CONTROLS', projectUuid: 'root' });
  useGlobalStore.getState().setLoggedOut();
  await expect(handle.promise).rejects.toThrow('cancelled');
  mediator.postEvent(
    KaraboEvent.ListItems,
    new Hash({
      reason: '',
      'reply.items': new HashList([
        new Hash({
          uuid: 'root',
          simple_name: 'root',
          is_trashed: false,
          date: '',
        }),
      ]),
    })
  );
  expect(requests).toEqual([]);
  expect(model.root).toBeUndefined();
  expect(showMessageBox).not.toHaveBeenCalled();
});

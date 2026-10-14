import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';
import { SingletonContext } from '@/testing';
import { openSceneInWorkspace } from '@/features/project/api';
import { TreeApi } from 'react-arborist';
import ProjectPanel from '../ProjectPanel';

jest.mock('@/features/project/api', () => ({
  openSceneInWorkspace: jest.fn(),
}));
jest.mock('@/assets/icons', () => ({
  __esModule: true,
  default: {
    folder: 'folder',
    folderTrash: 'trash',
    image: 'image',
    arrowDown: 'down',
    arrowRight: 'right',
  },
}));

let model: ProjectItemModel;
let context: SingletonContext;
let root: ProjectModel;
let scene: SceneModel;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320);
  jest.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400);
  model = new ProjectItemModel();
  context = new SingletonContext({ project_model: model });
  root = new ProjectModel({
    uuid: 'root',
    simple_name: 'Experiment',
    date: '2026-07-01T00:00:00',
  });
  root.initialized = true;
  scene = new SceneModel({
    uuid: 'scene',
    simple_name: 'Overview',
    initialized: true,
  });
  root.scenes = [scene];
  const child = new ProjectModel({
    uuid: 'child',
    simple_name: 'Motors',
    is_trashed: true,
  });
  child.initialized = true;
  child.scenes = [
    new SceneModel({
      uuid: 'child-scene',
      simple_name: 'Child scene',
      initialized: true,
    }),
  ];
  root.subprojects = [child];
  model.setRoot('CONTROLS', root);
});

afterEach(() => {
  cleanup();
  context.restore();
  jest.restoreAllMocks();
});

function row(name: string) {
  return screen.getByText(name).closest('[role="treeitem"]') as HTMLElement;
}

it('shows the root groups in model order, expands populated groups but leaves nested projects collapsed and renders icons/tooltips', () => {
  render(<ProjectPanel />);
  expect(screen.getByRole('tree', { name: 'Projects' })).toBeInTheDocument();
  expect(row('Experiment')).toHaveAttribute('aria-expanded', 'true');
  expect(row('Motors')).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Child scene')).toBeNull();
  expect(screen.getByText('Experiment')).toHaveClass('font-bold');
  expect(
    row('Experiment').querySelector('img[src="folder"]')
  ).toBeInTheDocument();
  expect(row('Motors').querySelector('img[src="trash"]')).toBeInTheDocument();
  expect(row('Overview').querySelector('img[src="image"]')).toBeInTheDocument();
  expect(screen.getByText('Overview').closest('[title]')).toHaveAttribute(
    'title',
    expect.stringContaining('Overview')
  );
  expect(
    row('Experiment').querySelector('[title]')?.getAttribute('title')
  ).toContain('root');
  fireEvent.doubleClick(row('Motors'));
  expect(screen.getAllByText('Scenes')).toHaveLength(2);
  expect(screen.getByText('Child scene')).toBeInTheDocument();
  expect(screen.getAllByText('Subprojects')).toHaveLength(2);
  expect(
    screen.getAllByRole('treeitem').map((item) => item.textContent)
  ).toEqual([
    'Experiment',
    'Scenes',
    'Overview',
    'Subprojects',
    'Motors',
    'Scenes',
    'Child scene',
    'Subprojects',
  ]);
});

it('selects on a click, opens on double-click/Enter and disclosure only toggles', () => {
  render(<ProjectPanel />);
  fireEvent.click(row('Overview'));
  expect(row('Overview')).toHaveAttribute('aria-selected', 'true');
  expect(openSceneInWorkspace).not.toHaveBeenCalled();
  fireEvent.doubleClick(row('Overview'));
  expect(openSceneInWorkspace).toHaveBeenCalledWith({ model: scene });
  fireEvent.keyDown(screen.getByRole('tree'), { key: 'Enter' });
  expect(openSceneInWorkspace).toHaveBeenCalledTimes(2);
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Collapse Scenes' })[0]
  );
  expect(screen.queryByText('Overview')).toBeNull();
  expect(openSceneInWorkspace).toHaveBeenCalledTimes(2);
  expect(
    screen.getAllByText('Scenes')[0].closest('[role=treeitem]')
  ).toHaveAttribute('aria-selected', 'false');
  fireEvent.doubleClick(
    screen.getAllByText('Scenes')[0].closest('[role=treeitem]')!
  );
  expect(screen.getByText('Overview')).toBeInTheDocument();
});

it('updates the same root while retaining expansion and clears removed selection', () => {
  render(<ProjectPanel />);
  fireEvent.doubleClick(row('Motors'));
  fireEvent.click(row('Motors'));
  act(() => {
    root.simple_name = 'Updated';
    model.setRoot('CONTROLS', root);
  });
  expect(row('Motors')).toHaveAttribute('aria-expanded', 'true');
  expect(row('Motors')).toHaveAttribute('aria-selected', 'true');
  expect(screen.getByText('Updated')).toBeInTheDocument();
  act(() => {
    root.subprojects = [];
    model.setRoot('CONTROLS', root);
  });
  expect(screen.queryByText('Motors')).toBeNull();
  act(() => model.clearRoot());
  expect(screen.queryAllByRole('treeitem')).toHaveLength(0);
});

it('expands a previously empty group only when its first child is added', () => {
  root.scenes = [];
  model.setRoot('CONTROLS', root);
  render(<ProjectPanel />);
  const scenesGroup = () =>
    screen.getAllByText('Scenes')[0].closest('[role=treeitem]')!;
  expect(scenesGroup()).toHaveAttribute('aria-expanded', 'false');
  act(() => {
    root.scenes = [scene];
    model.setRoot('CONTROLS', root);
  });
  expect(scenesGroup()).toHaveAttribute('aria-expanded', 'true');
  fireEvent.click(
    screen.getAllByRole('button', { name: 'Collapse Scenes' })[0]
  );
  act(() => {
    root.scenes!.push(
      new SceneModel({
        uuid: 'second-scene',
        simple_name: 'Second scene',
        initialized: true,
      })
    );
    model.setRoot('CONTROLS', root);
  });
  expect(scenesGroup()).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Second scene')).toBeNull();
});

it('initializes replacement trees without closing and reopening their groups', () => {
  render(<ProjectPanel />);
  fireEvent.doubleClick(row('Motors'));
  fireEvent.click(row('Child scene'));
  const dispatch = jest.spyOn(TreeApi.prototype, 'dispatch');
  const replacement = new ProjectModel({
    uuid: root.uuid,
    simple_name: 'Replacement',
  });
  replacement.initialized = true;
  replacement.subprojects = root.subprojects;
  act(() => model.setRoot('CONTROLS', replacement));
  expect(row('Replacement')).toHaveAttribute('aria-expanded', 'true');
  expect(row('Motors')).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Child scene')).toBeNull();
  expect(
    screen
      .getAllByRole('treeitem')
      .every((item) => item.getAttribute('aria-selected') === 'false')
  ).toBe(true);
  expect(
    dispatch.mock.calls.filter(
      ([action]) =>
        action.type === 'VISIBILITY_OPEN' || action.type === 'VISIBILITY_CLOSE'
    )
  ).toHaveLength(0);
});

it('opening a subproject reveals expanded groups while its child projects remain collapsed', () => {
  const child = root.subprojects[0];
  const grandchild = new ProjectModel({
    uuid: 'grandchild',
    simple_name: 'Axes project',
  });
  grandchild.initialized = true;
  grandchild.scenes = [
    new SceneModel({
      uuid: 'deep-scene',
      simple_name: 'Deep scene',
      initialized: true,
    }),
  ];
  child.subprojects = [grandchild];
  model.setRoot('CONTROLS', root);
  render(<ProjectPanel />);
  expect(screen.queryByText('Axes project')).toBeNull();
  fireEvent.doubleClick(row('Motors'));
  expect(screen.getByText('Child scene')).toBeInTheDocument();
  expect(row('Axes project')).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Deep scene')).toBeNull();
  fireEvent.doubleClick(row('Axes project'));
  expect(screen.getByText('Deep scene')).toBeInTheDocument();
  const emptyGroup = screen
    .getAllByText('Subprojects')
    .at(-1)!
    .closest('[role=treeitem]')!;
  expect(emptyGroup.querySelector('button')).toBeNull();
});

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Mediator } from '@/lib/singletons/Mediator';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';

const mockMediator = new Mediator();
const mockProjectModel = new ProjectItemModel();
const mockOpenSceneInWorkspace = jest.fn();

jest.mock('@/lib/singletons/api', () => ({
  getMediator: () => mockMediator,
  getProjectModel: () => mockProjectModel,
}));

jest.mock('../../utils/openSceneInWorkspace', () => ({
  openSceneInWorkspace: (params: unknown) => mockOpenSceneInWorkspace(params),
}));

import ProjectBrowser from '../ProjectBrowser';
import { useRootProject } from '../../hooks/useRootProject';

function BrowserViews({ responsive = false }: { responsive?: boolean }) {
  const browser = useRootProject();
  return (
    <>
      <ProjectBrowser browser={browser} />
      {responsive && <ProjectBrowser browser={browser} />}
    </>
  );
}

function project(
  uuid: string,
  name: string,
  subprojects: ProjectModel[] = [],
  isTrashed = false
): ProjectModel {
  const model = new ProjectModel({
    uuid,
    simple_name: name,
    is_trashed: isTrashed,
  });
  model.initialized = true;
  model.scenes = [];
  model.subprojects = subprojects;
  return model;
}

describe('ProjectBrowser', () => {
  beforeEach(() => {
    mockProjectModel.clearRoot();
    mockOpenSceneInWorkspace.mockClear();
  });

  it('shows the active root and a searchable flat list including trashed descendants', async () => {
    const user = userEvent.setup();
    const buried = project('buried', 'Buried', [], true);
    const archive = project('archive', 'Archive', [buried], true);
    const detector = project('detector', 'Detector');
    mockProjectModel.setRoot(
      'CONTROL',
      project('root', 'Root Project', [detector, archive])
    );

    render(<BrowserViews />);

    expect(screen.getByRole('button', { name: 'Root Project' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Root Project' }));

    const rootRow = screen.getByRole('menuitem', { name: 'Root Project' });
    expect(within(rootRow).getByText('Root Project')).toHaveClass(
      'font-semibold'
    );
    expect(screen.getAllByRole('menuitem')).toHaveLength(4);
    expect(
      screen.getByRole('menuitem', { name: 'Archive (Trashed)' })
    ).toHaveClass('text-fuchsia-600');
    expect(
      screen.getByRole('menuitem', { name: 'Buried (Trashed)' })
    ).toBeEnabled();

    await user.type(screen.getByPlaceholderText('Filter projects...'), 'bur');
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    await user.click(
      screen.getByRole('menuitem', { name: 'Buried (Trashed)' })
    );

    expect(screen.getByText('Root Project')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Buried' })).toBeVisible();
  });

  it('shows the selected root in the selector even without subprojects', async () => {
    const user = userEvent.setup();
    mockProjectModel.setRoot('CONTROL', project('root', 'Root Project'));

    render(<BrowserViews />);

    const selector = screen.getByRole('button', { name: 'Root Project' });
    expect(selector).toBeVisible();
    await user.click(selector);
    const rootRow = screen.getByRole('menuitem', { name: 'Root Project' });
    expect(rootRow).toHaveAttribute('aria-current', 'true');
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
  });

  it('resets the selection when the active root changes', async () => {
    const user = userEvent.setup();
    mockProjectModel.setRoot(
      'CONTROL',
      project('first', 'First', [project('child', 'Child')])
    );
    render(<BrowserViews />);

    await user.click(screen.getByRole('button', { name: 'First' }));
    await user.click(screen.getByRole('menuitem', { name: 'Child' }));
    expect(screen.getByRole('button', { name: 'Child' })).toBeVisible();

    act(() => mockProjectModel.setRoot('CONTROL', project('second', 'Second')));

    expect(screen.getByRole('button', { name: 'Second' })).toBeVisible();
  });

  it('keeps the selected project in both responsive views', async () => {
    const user = userEvent.setup();
    mockProjectModel.setRoot(
      'CONTROL',
      project('root', 'Root', [project('child', 'Child')])
    );
    render(<BrowserViews responsive />);

    await user.click(screen.getAllByRole('button', { name: 'Root' })[0]);
    await user.click(screen.getByRole('menuitem', { name: 'Child' }));

    expect(screen.getAllByRole('button', { name: 'Child' })).toHaveLength(2);
  });

  it('filters and selects a loaded project using only the keyboard', async () => {
    const user = userEvent.setup();
    const unloaded = new ProjectModel({
      uuid: 'stub',
      simple_name: 'Child stub',
    });
    mockProjectModel.setRoot(
      'CONTROL',
      project('root', 'Root', [unloaded, project('child', 'Child')])
    );
    render(<BrowserViews />);

    await user.tab();
    await user.keyboard('{Enter}');
    expect(screen.getByPlaceholderText('Filter projects...')).toHaveFocus();
    await user.keyboard('Child{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Child' })).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(screen.getByRole('button', { name: 'Child' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByPlaceholderText('Filter projects...')).toHaveValue('');
  });

  it('returns to the filter from the results and closes an empty search with Escape', async () => {
    const user = userEvent.setup();
    mockProjectModel.setRoot('CONTROL', project('root', 'Root'));
    render(<BrowserViews />);

    await user.click(screen.getByRole('button', { name: 'Root' }));
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Root' })).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByPlaceholderText('Filter projects...')).toHaveFocus();
    await user.keyboard('missing{ArrowDown}');
    expect(screen.getByText('No projects found')).toBeVisible();
    expect(screen.getByPlaceholderText('Filter projects...')).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Root' })).toHaveFocus();
  });

  it('keeps focus on the selector after choosing a project with the mouse', async () => {
    const user = userEvent.setup();
    mockProjectModel.setRoot(
      'CONTROL',
      project('root', 'Root Project', [project('child', 'Child')])
    );
    render(<BrowserViews />);

    await user.click(screen.getByRole('button', { name: 'Root Project' }));
    await user.click(screen.getByRole('menuitem', { name: 'Child' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Child' })).toHaveFocus()
    );
  });

  it('does not return focus to the selector after a right-click outside', async () => {
    const user = userEvent.setup();
    mockProjectModel.setRoot('CONTROL', project('root', 'Root Project'));
    render(
      <>
        <button type="button">Outside</button>
        <BrowserViews />
      </>
    );

    const selector = screen.getByRole('button', { name: 'Root Project' });
    const outside = screen.getByRole('button', { name: 'Outside' });
    await user.click(selector);
    fireEvent(
      outside,
      new MouseEvent('pointerdown', { bubbles: true, button: 2 })
    );

    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(selector).not.toHaveFocus();
  });

  it('shows the selected project scenes and opens a scene from a trashed project', async () => {
    const user = userEvent.setup();
    const rootScene = new SceneModel({
      uuid: 'overview',
      simple_name: 'Overview',
    });
    const archivedScene = new SceneModel({
      uuid: 'archived',
      simple_name: 'Archived scene',
    });
    const archive = project('archive', 'Archive', [], true);
    archive.scenes = [archivedScene];
    const root = project('root', 'Root Project', [archive]);
    root.scenes = [rootScene];
    mockProjectModel.setRoot('CONTROL', root);

    render(<BrowserViews />);
    await user.click(screen.getByRole('button', { name: 'Open scene' }));
    expect(screen.getByRole('menuitem', { name: 'Overview' })).toBeVisible();
    expect(
      screen.queryByRole('menuitem', { name: 'Archived scene' })
    ).toBeNull();

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Root Project' }));
    await user.click(
      screen.getByRole('menuitem', { name: 'Archive (Trashed)' })
    );
    expect(screen.queryByRole('menuitem', { name: 'Overview' })).toBeNull();
    await user.click(screen.getByRole('menuitem', { name: 'Archived scene' }));

    expect(mockOpenSceneInWorkspace).toHaveBeenCalledWith({
      model: archivedScene,
    });
  });

  it('disables scene opening when the selected project has no scenes', () => {
    mockProjectModel.setRoot('CONTROL', project('root', 'Root Project'));

    render(<BrowserViews />);

    expect(screen.getByRole('button', { name: 'Open scene' })).toBeDisabled();
  });

  it('clears the filter when switching roots and does not restore an old selection', async () => {
    const user = userEvent.setup();
    const first = project('first', 'First', [project('child', 'Child')]);
    mockProjectModel.setRoot('CONTROL', first);
    render(<BrowserViews />);

    await user.click(screen.getByRole('button', { name: 'First' }));
    await user.click(screen.getByRole('menuitem', { name: 'Child' }));
    await user.click(screen.getByRole('button', { name: 'Child' }));
    await user.type(screen.getByPlaceholderText('Filter projects...'), 'Child');

    act(() => mockProjectModel.setRoot('CONTROL', project('second', 'Second')));
    expect(screen.getByPlaceholderText('Filter projects...')).toHaveValue('');
    expect(screen.getByRole('menuitem', { name: 'Second' })).toBeVisible();
    await user.keyboard('{Escape}');

    act(() => mockProjectModel.setRoot('CONTROL', first));
    expect(screen.getByRole('button', { name: 'First' })).toBeVisible();
  });

  it('retains the filter and selected project when the same root is refreshed', async () => {
    const user = userEvent.setup();
    const root = project('root', 'Root', [project('child', 'Child')]);
    mockProjectModel.setRoot('CONTROL', root);
    render(<BrowserViews />);

    await user.click(screen.getByRole('button', { name: 'Root' }));
    await user.click(screen.getByRole('menuitem', { name: 'Child' }));
    await user.click(screen.getByRole('button', { name: 'Child' }));
    await user.type(screen.getByPlaceholderText('Filter projects...'), 'Child');
    act(() => mockProjectModel.setRoot('CONTROL', root));

    expect(screen.getByPlaceholderText('Filter projects...')).toHaveValue(
      'Child'
    );
    expect(screen.getByRole('menuitem', { name: 'Child' })).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  it('opens a listed scene after a cyclic subproject reference', async () => {
    const user = userEvent.setup();
    const scene = new SceneModel({
      uuid: 'scene',
      simple_name: 'Detector scene',
    });
    const loop = project('loop', 'Loop');
    const detector = project('detector', 'Detector');
    detector.scenes = [scene];
    const root = project('root', 'Root', [loop, detector]);
    loop.subprojects = [root];
    mockProjectModel.setRoot('CONTROL', root);
    render(<BrowserViews />);

    await user.click(screen.getByRole('button', { name: 'Root' }));
    await user.click(screen.getByRole('menuitem', { name: 'Detector' }));
    await user.click(screen.getByRole('menuitem', { name: 'Detector scene' }));

    expect(mockOpenSceneInWorkspace).toHaveBeenCalledWith({ model: scene });
  });

  it('filters scene names and opens a matching scene using the keyboard', async () => {
    const user = userEvent.setup();
    const overview = new SceneModel({
      uuid: 'overview',
      simple_name: 'Overview',
    });
    const detector = new SceneModel({
      uuid: 'detector',
      simple_name: 'Detector status',
    });
    const root = project('root', 'Root');
    root.scenes = [overview, detector];
    mockProjectModel.setRoot('CONTROL', root);
    render(<BrowserViews />);

    const trigger = screen.getByRole('button', { name: 'Open scene' });
    await user.click(trigger);
    expect(screen.getByPlaceholderText('Filter scenes...')).toHaveFocus();
    await user.keyboard(' DET ');
    expect(screen.getAllByRole('menuitem')).toHaveLength(1);
    expect(
      screen.getByRole('menuitem', { name: 'Detector status' })
    ).toBeVisible();
    expect(trigger).toHaveAttribute('title', '2 scenes');
    await user.keyboard('{ArrowDown}{Enter}');

    expect(mockOpenSceneInWorkspace).toHaveBeenCalledWith({ model: detector });
    expect(screen.getByRole('button', { name: 'Open scene' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(screen.getByPlaceholderText('Filter scenes...')).toHaveValue('');
    expect(screen.getAllByRole('menuitem')).toHaveLength(2);
  });

  it('shows an empty search result without disabling the scene picker', async () => {
    const user = userEvent.setup();
    const root = project('root', 'Root');
    root.scenes = [
      new SceneModel({ uuid: 'overview', simple_name: 'Overview' }),
    ];
    mockProjectModel.setRoot('CONTROL', root);
    render(<BrowserViews />);

    const trigger = screen.getByRole('button', { name: 'Open scene' });
    await user.click(trigger);
    const search = screen.getByPlaceholderText('Filter scenes...');
    await user.type(search, 'missing');
    expect(screen.getByText('No scenes found')).toBeVisible();
    expect(screen.queryByRole('menuitem')).not.toBeInTheDocument();
    expect(trigger).toBeEnabled();
    await user.keyboard('{ArrowDown}');
    expect(search).toHaveFocus();

    await user.clear(search);
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Overview' })).toHaveFocus();
    await user.keyboard('{ArrowUp}{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open scene' })).toHaveFocus();
  });

  it('clears the scene filter when the active root changes', async () => {
    const user = userEvent.setup();
    const first = project('first', 'First');
    first.scenes = [
      new SceneModel({ uuid: 'detector', simple_name: 'Detector' }),
    ];
    const second = project('second', 'Second');
    second.scenes = [
      new SceneModel({ uuid: 'overview', simple_name: 'Overview' }),
    ];
    mockProjectModel.setRoot('CONTROL', first);
    render(<BrowserViews />);

    const trigger = screen.getByRole('button', { name: 'Open scene' });
    await user.click(trigger);
    await user.type(
      screen.getByPlaceholderText('Filter scenes...'),
      'Detector'
    );
    act(() => mockProjectModel.setRoot('CONTROL', second));

    expect(screen.getByPlaceholderText('Filter scenes...')).toHaveValue('');
    expect(screen.getByRole('menuitem', { name: 'Overview' })).toBeVisible();
    expect(
      screen.queryByRole('menuitem', { name: 'Detector' })
    ).not.toBeInTheDocument();
  });

  describe('opening the scene list after choosing a project', () => {
    function rootWithDetectorScenes() {
      const detector = project('detector', 'Detector');
      detector.scenes = [
        new SceneModel({
          uuid: 'detector-scene',
          simple_name: 'Detector scene',
        }),
      ];
      return project('root', 'Root', [detector, project('empty', 'Empty')]);
    }

    it('opens the scene list with its filter focused after a mouse choice', async () => {
      const user = userEvent.setup();
      mockProjectModel.setRoot('CONTROL', rootWithDetectorScenes());
      render(<BrowserViews />);

      await user.click(screen.getByRole('button', { name: 'Root' }));
      await user.click(screen.getByRole('menuitem', { name: 'Detector' }));

      await waitFor(() =>
        expect(screen.getByPlaceholderText('Filter scenes...')).toHaveFocus()
      );
      expect(screen.queryByPlaceholderText('Filter projects...')).toBeNull();
      expect(
        screen.getByRole('menuitem', { name: 'Detector scene' })
      ).toBeVisible();
    });

    it('opens the scene list after a keyboard choice', async () => {
      const user = userEvent.setup();
      mockProjectModel.setRoot('CONTROL', rootWithDetectorScenes());
      render(<BrowserViews />);

      await user.click(screen.getByRole('button', { name: 'Root' }));
      await user.keyboard('Detector{ArrowDown}{Enter}');

      await waitFor(() =>
        expect(screen.getByPlaceholderText('Filter scenes...')).toHaveFocus()
      );
    });

    it('leaves the scene list closed when the chosen project has no scenes', async () => {
      const user = userEvent.setup();
      mockProjectModel.setRoot('CONTROL', rootWithDetectorScenes());
      render(<BrowserViews />);

      await user.click(screen.getByRole('button', { name: 'Root' }));
      await user.click(screen.getByRole('menuitem', { name: 'Empty' }));

      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Empty' })).toHaveFocus()
      );
      expect(screen.queryByRole('menu')).toBeNull();
    });

    it('opens only the scene list of the view the project was chosen in', async () => {
      const user = userEvent.setup();
      mockProjectModel.setRoot('CONTROL', rootWithDetectorScenes());
      render(<BrowserViews responsive />);

      await user.click(screen.getAllByRole('button', { name: 'Root' })[0]);
      await user.click(screen.getByRole('menuitem', { name: 'Detector' }));

      await waitFor(() =>
        expect(screen.getByPlaceholderText('Filter scenes...')).toHaveFocus()
      );
      expect(screen.getAllByRole('menu')).toHaveLength(1);
    });
  });
});

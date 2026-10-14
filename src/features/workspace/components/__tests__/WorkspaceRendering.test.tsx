import { act, cleanup, render, screen } from '@testing-library/react';
import { DisplayTextLogModel, SceneModel } from '@/karabo/common/api';
import { ProjectModel } from '@/karabo/common/project/api';
import { broadcast_event, KaraboEvent } from '@/lib/events';
import { singletons } from '@/lib/singletons/api';
import { Mediator } from '@/lib/singletons/Mediator';
import { PanelWrangler } from '@/lib/singletons/PanelWrangler';
import { ProjectItemModel } from '@/lib/singletons/ProjectItemModel';
import { SingletonContext } from '@/testing';
import type { ScenePanelProps } from '@/features/scenepanel/api';
import { ProjectPanel } from '@/features/projectpanel/api';
import WorkspaceLeftArea from '../WorkspaceLeftArea';
import WorkspaceCenterArea from '../WorkspaceCenterArea';
import WorkspaceRightArea from '../WorkspaceRightArea';
import PanelContainer from '../PanelContainer';
import type { PanelTab } from '../../types';

const mockTree = jest.fn();
const mockScene = jest.fn();
const mockTopology = jest.fn();
const mockControllers = jest.fn();

jest.mock('@/features/projectpanel/ProjectTree', () => {
  const React = jest.requireActual('react');
  return {
    __esModule: true,
    default: (props: { snapshot: { root?: ProjectModel } }) => {
      mockTree(props);
      return React.createElement(
        'output',
        { 'data-testid': 'project-name' },
        props.snapshot.root?.simple_name
      );
    },
  };
});

jest.mock('@/features/topologypanel/api', () => ({
  SystemTopologyPanel: () => {
    mockTopology();
    return null;
  },
}));
jest.mock('@/features/configurationpanel/api', () => ({
  ConfigurationPanel: () => null,
}));
jest.mock('../ControllerPanelStack', () => ({
  __esModule: true,
  default: (props: unknown) => {
    mockControllers(props);
    return null;
  },
}));
jest.mock('@/features/scenepanel/api', () => {
  const React = jest.requireActual('react');
  return {
    useFullscreen: jest.requireActual(
      '@/features/scenepanel/hooks/useFullscreen'
    ).useFullscreen,
    ScenePanel: (props: ScenePanelProps) => {
      mockScene(props);
      return React.createElement(
        'output',
        { 'data-testid': 'scene-fit' },
        props.content.fitMode
      );
    },
  };
});

let wrangler: PanelWrangler;
let projectModel: ProjectItemModel;
let root: ProjectModel;
let context: SingletonContext;
const onExpandedChange = jest.fn();

function Panels({ revision }: { revision: number }) {
  return (
    <div data-revision={revision}>
      <WorkspaceLeftArea />
      <WorkspaceCenterArea isVisible />
      <WorkspaceRightArea isVisible onExpandedChange={onExpandedChange} />
    </div>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  projectModel = new ProjectItemModel();
  context = new SingletonContext({
    mediator: new Mediator(),
    project_model: projectModel,
    panel_wrangler: undefined,
  });
  wrangler = new PanelWrangler();
  singletons.set('panel_wrangler', wrangler);
  root = new ProjectModel({ uuid: 'root', simple_name: 'Experiment' });
  root.initialized = true;
  root.scenes = [
    new SceneModel({
      uuid: 'scene',
      simple_name: 'Overview',
      initialized: true,
    }),
  ];
  projectModel.setRoot('CONTROLS', root);
  wrangler.showProjects();
  broadcast_event(KaraboEvent.OpenScene, { model: root.scenes[0] });
});

afterEach(() => {
  cleanup();
  wrangler.dispose();
  context.restore();
});

it('skips panel rendering on parent updates with unchanged container props', () => {
  let renderCount = 0;
  const renderPanel = (tab: PanelTab) => {
    renderCount += 1;
    return <p>{tab.title} content</p>;
  };
  const { rerender } = render(
    <div data-revision={0}>
      <PanelContainer area="left" renderPanel={renderPanel} />
    </div>
  );
  expect(screen.getByText('Projects content')).toBeVisible();
  renderCount = 0;
  rerender(
    <div data-revision={1}>
      <PanelContainer area="left" renderPanel={renderPanel} />
    </div>
  );
  expect(renderCount).toBe(0);

  act(() => wrangler.selectTab('left', 'system-topology'));
  expect(screen.getByText('SystemTopology content')).toBeVisible();
  expect(screen.queryByText('Projects content')).not.toBeInTheDocument();
});

it('builds only the selected panel and falls back to the first tab', () => {
  const renderedTabs: string[] = [];
  const renderPanel = (tab: PanelTab) => {
    renderedTabs.push(tab.id);
    return <p>{tab.title} content</p>;
  };
  const left = wrangler.getSnapshot().left;
  left.activeTabId = 'missing';
  render(<PanelContainer area="left" renderPanel={renderPanel} />);
  expect(renderedTabs).toEqual(['system-topology']);
  expect(screen.getByText('SystemTopology content')).toBeVisible();

  renderedTabs.length = 0;
  act(() => wrangler.selectTab('left', 'projects'));
  expect(renderedTabs).toEqual(['projects']);
  expect(screen.getByText('Projects content')).toBeVisible();
});

it('keeps the active scene idle when another scene content changes', () => {
  const secondScene = new SceneModel({
    uuid: 'second-scene',
    simple_name: 'Second scene',
    initialized: true,
  });
  root.scenes = [...root.scenes!, secondScene];
  projectModel.setRoot('CONTROLS', root);
  broadcast_event(KaraboEvent.OpenScene, { model: secondScene });
  render(<Panels revision={0} />);
  mockScene.mockClear();

  act(() => wrangler.setFitMode('scene:scene', 'actual'));
  act(() =>
    wrangler.setContent('scene:scene', {
      ...wrangler.getContent('scene:scene')!,
      sceneRef: {
        ...wrangler.getContent('scene:scene')!.sceneRef!,
        name: 'Renamed overview',
      },
    })
  );
  expect(mockScene).not.toHaveBeenCalled();
  expect(screen.getByRole('tab', { name: 'Renamed overview' })).toBeVisible();
  expect(wrangler.getSnapshot().center.activeTabId).toBe('scene:second-scene');

  act(() => wrangler.selectTab('center', 'scene:scene'));
  expect(screen.getByTestId('scene-fit')).toHaveTextContent('actual');
  expect(mockScene.mock.calls.at(-1)?.[0].content.sceneModel).toBe(
    root.scenes[0]
  );
});

it('keeps topology idle when the left-area parent rerenders', () => {
  wrangler.selectTab('left', 'system-topology');
  const { rerender } = render(<Panels revision={0} />);
  mockTopology.mockClear();
  rerender(<Panels revision={1} />);
  expect(mockTopology).not.toHaveBeenCalled();
});

it('protects the panels when their workspace parent rerenders with unchanged panel props', () => {
  const { rerender } = render(<Panels revision={0} />);
  mockTree.mockClear();
  mockScene.mockClear();
  mockControllers.mockClear();
  rerender(<Panels revision={1} />);
  expect(mockTree).not.toHaveBeenCalled();
  expect(mockScene).not.toHaveBeenCalled();
  expect(mockControllers).not.toHaveBeenCalled();
});

it('protects Projects on parent renders while still responding to same-root model updates', () => {
  const { rerender } = render(
    <div>
      <ProjectPanel />
      <span>First render</span>
    </div>
  );
  mockTree.mockClear();
  rerender(
    <div>
      <ProjectPanel />
      <span>Parent update</span>
    </div>
  );
  expect(mockTree).not.toHaveBeenCalled();
  act(() => {
    root.simple_name = 'Updated Experiment';
    projectModel.setRoot('CONTROLS', root);
  });
  expect(mockTree).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('project-name')).toHaveTextContent(
    'Updated Experiment'
  );
});

it('keeps left and center panels idle when only the right area changes', () => {
  render(<Panels revision={0} />);
  mockTree.mockClear();
  mockScene.mockClear();
  mockControllers.mockClear();
  const controller = new DisplayTextLogModel();
  controller.keys = ['DEV.value'];
  act(() => wrangler.openControllerPanel(controller));
  expect(mockControllers).toHaveBeenCalled();
  expect(mockTree).not.toHaveBeenCalled();
  expect(mockScene).not.toHaveBeenCalled();
});

it('keeps center and right panels idle when selecting a left-area tab', () => {
  render(<Panels revision={0} />);
  mockScene.mockClear();
  mockControllers.mockClear();
  act(() => wrangler.selectTab('left', 'system-topology'));
  expect(mockTopology).toHaveBeenCalled();
  expect(mockScene).not.toHaveBeenCalled();
  expect(mockControllers).not.toHaveBeenCalled();
});

it('updates center content and fit mode without rerendering side panels or changing tab titles', () => {
  render(<Panels revision={0} />);
  mockTree.mockClear();
  mockControllers.mockClear();
  const replacement = new SceneModel({
    uuid: 'scene',
    simple_name: 'Overview',
    initialized: true,
    width: 1000,
  });
  act(() =>
    wrangler.setContent('scene:scene', {
      ...wrangler.getContent('scene:scene')!,
      sceneModel: replacement,
    })
  );
  expect(mockScene.mock.calls.at(-1)?.[0].content.sceneModel).toBe(replacement);
  act(() => wrangler.setFitMode('scene:scene', 'actual'));
  expect(screen.getByTestId('scene-fit')).toHaveTextContent('actual');
  expect(mockTree).not.toHaveBeenCalled();
  expect(mockControllers).not.toHaveBeenCalled();
  act(() =>
    wrangler.setContent('scene:scene', {
      ...wrangler.getContent('scene:scene')!,
      error: 'Scene unavailable',
    })
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Scene unavailable');
});

it('publishes scene-content cleanup when the wrangler is disposed', () => {
  render(<Panels revision={0} />);
  act(() => wrangler.dispose());
  expect(screen.getByRole('alert')).toHaveTextContent(
    'The scene is unavailable'
  );
});

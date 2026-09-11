import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectModel } from '@/karabo/common/project/api';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import { Hash, HashList } from '@/karabo/data/api';
import { KaraboEvent } from '@/lib/events';
import { Mediator } from '@/lib/singletons/Mediator';
import SelectProjectSceneDialog from '../SelectProjectSceneDialog';

const mockListDomains = jest.fn();
const mockListProjects = jest.fn();
const mockOnListScenes = jest.fn();
const mockConfig = { currentDomain: 'CONTROLS' };
const mockMediator = new Mediator();

jest.mock('@/lib/singletons/api', () => ({
  getConfig: () => mockConfig,
  getDbConn: () => ({
    listDomains: mockListDomains,
    listProjects: mockListProjects,
  }),
  getMediator: () => mockMediator,
  getNetwork: () => ({ onListScenes: mockOnListScenes }),
}));

jest.mock('@/store/api', () => ({
  useGlobalStore: () => ({
    sessionInfo: { guiServerTopic: 'CONTROLS', userAccessLevel: 0 },
  }),
}));

jest.mock('@/components/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');
  return {
    Button: ({ children, ...props }: any) =>
      ReactActual.createElement('button', props, children),
    Dialog: ({ open, children }: any) =>
      open ? ReactActual.createElement('div', null, children) : null,
    DialogContent: ({ children }: any) =>
      ReactActual.createElement('div', null, children),
    DialogDescription: ({ children }: any) =>
      ReactActual.createElement('p', null, children),
    DialogFooter: ({ children }: any) =>
      ReactActual.createElement('footer', null, children),
    DialogHeader: ({ children }: any) =>
      ReactActual.createElement('header', null, children),
    DialogTitle: ({ children }: any) =>
      ReactActual.createElement('h2', null, children),
    Separator: () => ReactActual.createElement('hr'),
  };
});

jest.mock('../components/DomainSelector', () => {
  const ReactActual = jest.requireActual<typeof React>('react');
  return {
    __esModule: true,
    default: ({ disabled, onDomainChange, selectedDomain }: any) =>
      ReactActual.createElement(
        'button',
        { disabled, onClick: () => onDomainChange('EXPERIMENT') },
        'Domain ',
        selectedDomain
      ),
  };
});

jest.mock('../components/ProjectTable', () => {
  const ReactActual = jest.requireActual<typeof React>('react');
  return {
    __esModule: true,
    default: ({ projects, onProjectClick, selectionDisabled }: any) =>
      ReactActual.createElement(
        'div',
        null,
        ReactActual.createElement(
          'span',
          { 'data-testid': 'project-selection-disabled' },
          String(selectionDisabled)
        ),
        ...projects.map((project: ProjectModel) =>
          ReactActual.createElement(
            'button',
            {
              key: project.uuid,
              disabled: selectionDisabled,
              onClick: () => onProjectClick(project),
            },
            'Project ',
            project.simple_name
          )
        )
      ),
  };
});

jest.mock('../components/ScenesTable', () => {
  const ReactActual = jest.requireActual<typeof React>('react');
  return {
    __esModule: true,
    default: ({ scenes, onSceneClick, selectionDisabled }: any) =>
      ReactActual.createElement(
        'div',
        null,
        ReactActual.createElement(
          'span',
          { 'data-testid': 'scene-selection-disabled' },
          String(selectionDisabled)
        ),
        ...scenes.map((scene: SceneModel) =>
          ReactActual.createElement(
            'button',
            {
              key: scene.uuid,
              disabled: selectionDisabled,
              onClick: () => onSceneClick(scene),
            },
            'Scene ',
            scene.simple_name
          )
        )
      ),
  };
});

jest.mock('@/features/status', () => {
  const ReactActual = jest.requireActual<typeof React>('react');
  return {
    LoadingStatus: ({ isLoading, loadingText, error }: any) =>
      ReactActual.createElement(
        'div',
        { 'data-testid': 'loading-status' },
        error || (isLoading ? loadingText : 'idle')
      ),
  };
});

function renderDialog(open = true) {
  return render(
    <SelectProjectSceneDialog
      open={open}
      onSceneSelected={jest.fn()}
      onCancel={jest.fn()}
    />
  );
}

function emit(event: KaraboEvent, hash: Hash) {
  act(() => {
    mockMediator.postEvent(event, hash);
  });
}

function domainsReply(domains = ['CONTROLS']) {
  return new Hash({
    reason: '',
    reply: new Hash({ domains }),
  });
}

function projectsReply(projects: ProjectModel[]) {
  return new Hash({
    reason: '',
    reply: new Hash({
      items: new HashList(
        projects.map(
          (project) =>
            new Hash({
              uuid: project.uuid,
              date: project.date,
              simple_name: project.simple_name,
              is_trashed: project.is_trashed,
            })
        )
      ),
    }),
  });
}

function scenesReply(scenes: SceneModel[]) {
  return new Hash({
    reason: '',
    reply: new Hash({
      items: new HashList(
        scenes.map(
          (scene) =>
            new Hash({
              uuid: scene.uuid,
              date: scene.date,
              simple_name: scene.simple_name,
            })
        )
      ),
    }),
  });
}

function sceneErrorReply(reason = 'Scene list failed') {
  return new Hash({
    reason,
    reply: new Hash({ items: new HashList() }),
  });
}

function busyReply(isProcessing: boolean) {
  return new Hash({ is_processing: isProcessing });
}

function makeProject(uuid: string, name: string) {
  return new ProjectModel({
    uuid,
    simple_name: name,
    date: '2026-07-01T00:00:00',
  });
}

function makeScene(uuid: string, name: string) {
  return new SceneModel({
    uuid,
    simple_name: name,
    date: '2026-07-01T00:00:00',
  });
}

describe('SelectProjectSceneDialog loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConfig.currentDomain = 'CONTROLS';
  });

  it('requests domains again after closing before the first domain reply', () => {
    const { rerender } = renderDialog(true);
    expect(mockListDomains).toHaveBeenCalledTimes(1);

    rerender(
      <SelectProjectSceneDialog
        open={false}
        onSceneSelected={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    emit(KaraboEvent.ListDomains, domainsReply());

    rerender(
      <SelectProjectSceneDialog
        open
        onSceneSelected={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(mockListDomains).toHaveBeenCalledTimes(2);
  });

  it('clears stale scenes when a selected project scene request fails', async () => {
    const user = userEvent.setup();
    const firstProject = makeProject('project-a', 'First');
    const secondProject = makeProject('project-b', 'Second');

    renderDialog();
    emit(KaraboEvent.ListDomains, domainsReply());
    emit(
      KaraboEvent.ListProjects,
      projectsReply([firstProject, secondProject])
    );
    emit(
      KaraboEvent.ListScenes,
      scenesReply([makeScene('scene-a', 'Old Scene')])
    );
    expect(screen.getByText('Scene Old Scene')).toBeInTheDocument();

    await user.click(screen.getByText('Project Second'));
    expect(screen.queryByText('Scene Old Scene')).not.toBeInTheDocument();

    emit(KaraboEvent.ListScenes, sceneErrorReply());

    expect(screen.queryByText('Scene Old Scene')).not.toBeInTheDocument();
    expect(screen.getByTestId('scene-selection-disabled')).toHaveTextContent(
      'false'
    );
  });

  it('keeps selection disabled until the scene list reply arrives', async () => {
    const user = userEvent.setup();
    const firstProject = makeProject('project-a', 'First');
    const secondProject = makeProject('project-b', 'Second');

    renderDialog();
    emit(KaraboEvent.ListDomains, domainsReply());
    emit(
      KaraboEvent.ListProjects,
      projectsReply([firstProject, secondProject])
    );
    emit(
      KaraboEvent.ListScenes,
      scenesReply([makeScene('scene-a', 'Overview')])
    );

    await user.click(screen.getByText('Project Second'));
    expect(mockOnListScenes).toHaveBeenLastCalledWith('project-b');

    emit(KaraboEvent.DatabaseBusy, busyReply(false));

    expect(screen.getByTestId('project-selection-disabled')).toHaveTextContent(
      'true'
    );
    expect(screen.getByTestId('scene-selection-disabled')).toHaveTextContent(
      'true'
    );

    emit(
      KaraboEvent.ListScenes,
      scenesReply([makeScene('scene-b', 'New Scene')])
    );

    expect(screen.getByTestId('project-selection-disabled')).toHaveTextContent(
      'false'
    );
    expect(screen.getByText('Scene New Scene')).toBeInTheDocument();
  });
});

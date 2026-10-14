import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectModel } from '@/karabo/common/project/api';
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
    default: ({
      projects,
      onProjectClick,
      onProjectDoubleClick,
      selectionDisabled,
    }: any) =>
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
              onDoubleClick: () => onProjectDoubleClick?.(project),
            },
            'Project ',
            project.simple_name
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
      onProjectSelected={jest.fn()}
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

function makeProject(uuid: string, name: string) {
  return new ProjectModel({
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
    expect(
      screen.getByRole('heading', { name: 'Load Project' })
    ).toBeInTheDocument();
    expect(mockListDomains).toHaveBeenCalledTimes(1);

    rerender(
      <SelectProjectSceneDialog
        open={false}
        onProjectSelected={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    emit(KaraboEvent.ListDomains, domainsReply());

    rerender(
      <SelectProjectSceneDialog
        open
        onProjectSelected={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(mockListDomains).toHaveBeenCalledTimes(2);
  });

  it('retains a domain error until the dialog is closed and retries on reopening', () => {
    const { rerender } = renderDialog();
    emit(KaraboEvent.ListDomains, new Hash({ reason: 'Domains unavailable' }));
    expect(screen.getByTestId('loading-status')).toHaveTextContent(
      'Domains unavailable'
    );
    expect(mockListDomains).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Open Project' })).toBeDisabled();
    rerender(
      <SelectProjectSceneDialog
        open={false}
        onProjectSelected={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    rerender(
      <SelectProjectSceneDialog
        open
        onProjectSelected={jest.fn()}
        onCancel={jest.fn()}
      />
    );
    expect(mockListDomains).toHaveBeenCalledTimes(2);
  });

  it('selects a project without requesting scenes and opens only on the action', async () => {
    const onProjectSelected = jest.fn();
    render(
      <SelectProjectSceneDialog
        open
        onProjectSelected={onProjectSelected}
        onCancel={jest.fn()}
      />
    );
    emit(KaraboEvent.ListDomains, domainsReply());
    emit(
      KaraboEvent.ListProjects,
      projectsReply([
        makeProject('project-b', 'Second'),
        makeProject('project-a', 'First'),
      ])
    );
    expect(mockOnListScenes).not.toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: 'Scenes' })).toBeNull();
    expect(screen.getByTestId('project-selection-disabled')).toHaveTextContent(
      'false'
    );
    await userEvent.setup().click(screen.getByText('Project Second'));
    expect(onProjectSelected).not.toHaveBeenCalled();
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Open Project' }));
    expect(onProjectSelected).toHaveBeenCalledWith(
      'CONTROLS',
      expect.objectContaining({ uuid: 'project-b' })
    );
  });

  it('opens the double-clicked project in the selected domain without requesting scenes', () => {
    const onProjectSelected = jest.fn();
    render(
      <SelectProjectSceneDialog
        open
        onProjectSelected={onProjectSelected}
        onCancel={jest.fn()}
      />
    );
    emit(KaraboEvent.ListDomains, domainsReply());
    emit(
      KaraboEvent.ListProjects,
      projectsReply([
        makeProject('project-a', 'First'),
        makeProject('project-b', 'Second'),
      ])
    );
    fireEvent.doubleClick(screen.getByText('Project Second'));
    expect(onProjectSelected).toHaveBeenCalledTimes(1);
    expect(onProjectSelected).toHaveBeenCalledWith(
      'CONTROLS',
      expect.objectContaining({ uuid: 'project-b' })
    );
    expect(mockOnListScenes).not.toHaveBeenCalled();
  });

  it('shows list errors and disables opening when no project is available', () => {
    renderDialog();
    emit(KaraboEvent.ListDomains, domainsReply());
    emit(
      KaraboEvent.ListProjects,
      new Hash({ reason: 'Database unavailable' })
    );
    expect(screen.getByText('Database unavailable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Open Project' })).toBeDisabled();
  });

  it('prevents selection during domain and project retrieval', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: 'Open Project' })).toBeDisabled();
    emit(KaraboEvent.ListDomains, domainsReply());
    expect(screen.getByTestId('project-selection-disabled')).toHaveTextContent(
      'true'
    );
    emit(
      KaraboEvent.ListProjects,
      projectsReply([makeProject('project-a', 'First')])
    );
    expect(screen.getByRole('button', { name: 'Open Project' })).toBeEnabled();
  });
});

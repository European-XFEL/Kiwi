import React from 'react';
import { render, screen } from '@testing-library/react';
import WorkspaceHeader from '../WorkspaceHeader';
import { createDefaultWorkspaceModel } from '../../utils';
import type { WorkspaceRuntime } from '../../types';

const mockRootProject = jest.fn<unknown, []>();

jest.mock('@/features/project/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    LoadProjectScene: () => null,
    ProjectBrowser: () =>
      ReactActual.createElement('div', { 'data-testid': 'project-browser' }),
    useRootProject: () => ({ rootProject: mockRootProject() }),
  };
});

jest.mock('@/app/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    KiwiHeader: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement('div', null, children),
  };
});

jest.mock('@/features/user', () => ({
  AccessLevelSelector: () => null,
  UserProfile: () => null,
}));

jest.mock('@/features/status', () => ({ ActiveIndicator: () => null }));

function renderHeader(runtime: Partial<WorkspaceRuntime>) {
  const { header } = createDefaultWorkspaceModel();
  return render(
    <WorkspaceHeader
      header={header}
      runtime={{ connected: true, ...runtime }}
    />
  );
}

describe('WorkspaceHeader', () => {
  beforeEach(() => {
    mockRootProject.mockReturnValue({ projectUuid: 'project-a' });
  });

  it('shows no Home button while the Home tab is showing', () => {
    renderHeader({ sceneTabOpen: false });

    expect(screen.getByText('No scene loaded')).toBeInTheDocument();
    expect(screen.queryByTestId('workspace-home-button')).toBeNull();
  });

  it('shows the Home button and the project browser for a project scene', () => {
    renderHeader({ sceneTabOpen: true });

    expect(screen.getByTestId('workspace-home-button')).toBeInTheDocument();
    expect(screen.getByTestId('project-browser')).toBeInTheDocument();
  });
});

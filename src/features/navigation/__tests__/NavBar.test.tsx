import React from 'react';
import { render, screen } from '@testing-library/react';

const mockNavigate = jest.fn();
const mockGetScene = jest.fn();
const mockBrowserState = {};
const mockProjectBrowser = jest.fn<React.ReactElement, [unknown]>(() =>
  React.createElement('div', { 'data-testid': 'project-browser' })
);

jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

jest.mock('@/lib/singletons/api', () => ({
  getDbConn: () => ({ getScene: mockGetScene }),
  getConfig: () => ({
    getRecentScenesByTopic: () => new Map(),
    getRecentScenes: () => [],
    setRecentScene: jest.fn(),
    removeRecentScene: jest.fn(),
  }),
}));

const mockSceneStoreState: {
  loadedSceneRef?: {
    width: number;
    height: number;
    domain: string;
    projectUuid: string;
    projectName: string;
    uuid: string;
    name: string;
  };
  setLoadedSceneRef: jest.Mock;
} = {
  loadedSceneRef: undefined,
  setLoadedSceneRef: jest.fn(),
};

jest.mock('@/features/scene-view/api', () => ({
  useActiveSceneStore: (selector?: (state: unknown) => unknown) =>
    selector ? selector(mockSceneStoreState) : mockSceneStoreState,
}));

jest.mock('@/app/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    KiwiHeader: ({ children }: any) =>
      ReactActual.createElement('div', null, children),
  };
});

jest.mock('../components/NavMenu', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    __esModule: true,
    default: ({ children }: any) =>
      ReactActual.createElement('div', null, children),
  };
});

jest.mock('../components/NavItem', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    NavItem: ({ children }: any) =>
      ReactActual.createElement('div', null, children),
  };
});

jest.mock('../components/NavToggle', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    __esModule: true,
    default: ({ children }: any) =>
      ReactActual.createElement('div', null, children),
  };
});

jest.mock('@/features/project/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    LoadProjectScene: () =>
      ReactActual.createElement('div', {
        'data-testid': 'load-project-scene',
      }),
    useRootProject: () => mockBrowserState,
    ProjectBrowser: ({ browser }: { browser: unknown }) =>
      mockProjectBrowser(browser),
  };
});

jest.mock('@/features/user', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    UserProfile: () =>
      ReactActual.createElement('div', { 'data-testid': 'user-profile' }),
    AccessLevelSelector: () =>
      ReactActual.createElement('div', {
        'data-testid': 'access-level-selector',
      }),
  };
});

jest.mock('@/features/status', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    GuiServerDisplay: () =>
      ReactActual.createElement('div', { 'data-testid': 'gui-server-display' }),
    ActiveIndicator: () =>
      ReactActual.createElement('div', { 'data-testid': 'active-indicator' }),
  };
});

jest.mock('@/components/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    Button: ({ children, ...props }: any) =>
      ReactActual.createElement('button', props, children),
    Separator: () =>
      ReactActual.createElement('div', { 'data-testid': 'separator' }),
  };
});

import { NavBar } from '../NavBar';

describe('NavBar', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSceneStoreState.loadedSceneRef = {
      width: 800,
      height: 600,
      domain: 'CONTROLS',
      projectUuid: 'project-1',
      projectName: 'David_test',
      uuid: 'scene-123',
      name: 'beckhoff',
    };
    mockSceneStoreState.setLoadedSceneRef.mockReset();
  });

  it('shows the project browser in both layouts without fetching scene info again', () => {
    render(<NavBar />);

    expect(mockGetScene).not.toHaveBeenCalled();
    expect(mockProjectBrowser).toHaveBeenCalledTimes(2);
    expect(mockProjectBrowser).toHaveBeenNthCalledWith(1, mockBrowserState);
    expect(mockProjectBrowser).toHaveBeenNthCalledWith(2, mockBrowserState);
    expect(screen.getAllByTestId('project-browser')).toHaveLength(2);
  });
});

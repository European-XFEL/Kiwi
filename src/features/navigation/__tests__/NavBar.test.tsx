import React from 'react';
import { render, screen } from '@testing-library/react';

const mockNavigate = jest.fn();
const mockGetScene = jest.fn();
const mockSceneBreadcrumb = jest.fn<
  ReturnType<typeof React.createElement>,
  [unknown]
>(() => React.createElement('div', { 'data-testid': 'scene-breadcrumb' }));

jest.mock('react-router-dom', () => ({
  useLocation: () => ({
    search:
      '?host=test-host&port=44444&domain=CONTROLS&projectUuid=project-1&sceneUuid=scene-123',
  }),
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

jest.mock('../components/Logo', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    __esModule: true,
    default: () => ReactActual.createElement('div', { 'data-testid': 'logo' }),
  };
});

jest.mock('@/features/project/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    LoadProjectScene: () =>
      ReactActual.createElement('div', {
        'data-testid': 'load-project-scene',
      }),
    SceneBreadcrumb: (props: any) => mockSceneBreadcrumb(props),
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

  it('renders the loaded scene breadcrumb without fetching scene info again', () => {
    render(<NavBar />);

    expect(mockGetScene).not.toHaveBeenCalled();
    expect(mockSceneBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        domain: 'CONTROLS',
        projectName: 'David_test',
        sceneName: 'beckhoff',
      })
    );
    expect(screen.getAllByTestId('scene-breadcrumb')).toHaveLength(2);
  });
});

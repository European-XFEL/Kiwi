import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SceneModel } from '@/karabo/common/api';
import React from 'react';
import ScenePage from '../ScenePage';

jest.mock('../../hooks/useSceneLoader');
jest.mock('@/store/api');
jest.mock('@/features/scenepanel/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    __esModule: true,
    ScenePanel: ({
      sceneModel,
      sceneRef,
    }: {
      sceneModel: { uuid: string };
      sceneRef: { name: string; uuid: string };
    }) =>
      ReactActual.createElement(
        'div',
        { 'data-testid': 'scene-panel' },
        `${sceneModel.uuid}:${sceneRef.name}`
      ),
  };
});

import { useSceneLoader } from '../../hooks/useSceneLoader';
import { useGlobalStore, useLoadedSceneStore } from '@/store/api';

const mockUseSceneLoader = jest.mocked(useSceneLoader);
const mockUseGlobalStore = jest.mocked(useGlobalStore);
const mockUseLoadedSceneStore = jest.mocked(useLoadedSceneStore);

const makeScene = (uuid: string) => {
  const scene = new SceneModel();
  scene.uuid = uuid;
  scene.width = 800;
  scene.height = 600;
  return scene;
};

const makeSceneRef = (uuid: string) => ({
  domain: 'SA1',
  projectName: 'Demo',
  uuid,
  name: 'Beamline',
  width: 800,
  height: 600,
});

describe('ScenePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGlobalStore.mockReturnValue({ lastGlobalError: null } as any);
    mockUseLoadedSceneStore.mockImplementation((selector?: any) => {
      const state = { loadedSceneRef: undefined };
      return selector ? selector(state) : state;
    });
  });

  it('renders the loading state while the scene is still pending', () => {
    mockUseSceneLoader.mockReturnValue({ scene: null, error: '' });

    render(
      <MemoryRouter>
        <ScenePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading scene...')).toBeInTheDocument();
  });

  it('renders the scene load error when loading fails', () => {
    mockUseSceneLoader.mockReturnValue({ scene: null, error: 'db failed' });

    render(
      <MemoryRouter>
        <ScenePage />
      </MemoryRouter>
    );

    expect(screen.getByText("Couldn't load scene")).toBeInTheDocument();
    expect(screen.getByText('db failed')).toBeInTheDocument();
  });

  it('renders the fatal error when a loaded scene hits a global failure', () => {
    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-1'),
      error: '',
    });
    mockUseGlobalStore.mockReturnValue({
      lastGlobalError: 'session dropped',
    } as any);

    render(
      <MemoryRouter>
        <ScenePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Unrecoverable Error')).toBeInTheDocument();
    expect(screen.getByText('session dropped')).toBeInTheDocument();
  });

  it('keeps loading until the loaded scene ref matches the loaded scene', () => {
    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-42'),
      error: '',
    });
    mockUseLoadedSceneStore.mockImplementation((selector?: any) => {
      const state = { loadedSceneRef: makeSceneRef('scene-other') };
      return selector ? selector(state) : state;
    });

    render(
      <MemoryRouter>
        <ScenePage />
      </MemoryRouter>
    );

    expect(screen.getByText('Loading scene...')).toBeInTheDocument();
  });

  it('renders ScenePanel with the loaded scene and scene ref', () => {
    mockUseSceneLoader.mockReturnValue({
      scene: makeScene('scene-42'),
      error: '',
    });
    mockUseLoadedSceneStore.mockImplementation((selector?: any) => {
      const state = { loadedSceneRef: makeSceneRef('scene-42') };
      return selector ? selector(state) : state;
    });

    render(
      <MemoryRouter>
        <ScenePage />
      </MemoryRouter>
    );

    expect(screen.getByTestId('scene-panel')).toHaveTextContent(
      'scene-42:Beamline'
    );
  });
});

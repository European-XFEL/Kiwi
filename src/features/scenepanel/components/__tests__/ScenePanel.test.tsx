import { render, screen } from '@testing-library/react';
import { SceneModel } from '@/karabo/common/api';
import React from 'react';
import ScenePanel from '../ScenePanel';

jest.mock('@/features/scene-view/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    __esModule: true,
    FitModeSelect: () =>
      ReactActual.createElement(
        'div',
        { 'data-testid': 'fit-mode-select' },
        'fit-mode'
      ),
    SceneView: ({ sceneModel }: { sceneModel: { uuid: string } }) =>
      ReactActual.createElement(
        'div',
        { 'data-testid': 'scene-view' },
        sceneModel.uuid
      ),
    useSceneScale: () => 1,
    useActiveSceneStore: (selector?: (state: unknown) => unknown) => {
      const state = {
        fitMode: 'fit-page',
        loadedSceneRef: undefined,
        setFitMode: jest.fn(),
      };
      return selector ? selector(state) : state;
    },
    getOverflow: () => ({ overflowX: 'hidden', overflowY: 'hidden' }),
  };
});

const makeScene = (uuid: string) => {
  const scene = new SceneModel();
  scene.uuid = uuid;
  scene.width = 800;
  scene.height = 600;
  return scene;
};

const sceneRef = {
  domain: 'SA1',
  projectUuid: 'project-demo',
  projectName: 'Demo',
  uuid: 'scene-1',
  name: 'Beamline',
  width: 800,
  height: 600,
};

describe('ScenePanel', () => {
  it('renders left-side apply/decline actions and right-side scene controls', () => {
    render(
      <ScenePanel sceneRef={sceneRef} sceneModel={makeScene('scene-1')} />
    );

    expect(screen.getByLabelText('Apply all changes')).toBeInTheDocument();
    expect(screen.getByLabelText('Decline all changes')).toBeInTheDocument();
    expect(screen.getByText('Scale:')).toBeInTheDocument();
    expect(screen.getByTestId('fit-mode-select')).toBeInTheDocument();
    expect(screen.getByTestId('scene-view')).toHaveTextContent('scene-1');
  });
});

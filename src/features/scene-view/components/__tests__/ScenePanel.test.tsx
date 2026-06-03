import { render, screen } from '@testing-library/react';
import { SceneModel } from '@/karabo/common/api';
import React from 'react';
import ScenePanel from '../ScenePanel';

jest.mock('../SceneView', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    __esModule: true,
    default: ({ sceneModel }: { sceneModel: { uuid: string } }) =>
      ReactActual.createElement(
        'div',
        { 'data-testid': 'scene-view' },
        sceneModel.uuid
      ),
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
  projectName: 'Demo',
  uuid: 'scene-1',
  name: 'Beamline',
  width: 800,
  height: 600,
};

describe('ScenePanel', () => {
  it('renders SceneView for the mounted scene instance', () => {
    render(
      <ScenePanel sceneRef={sceneRef} sceneModel={makeScene('scene-1')} />
    );

    expect(screen.getByTestId('scene-view')).toHaveTextContent('scene-1');
  });
});

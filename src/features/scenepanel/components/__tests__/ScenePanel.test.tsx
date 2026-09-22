import { render, screen } from '@testing-library/react';
import { SceneModel } from '@/karabo/common/api';
import React from 'react';
import ScenePanel from '../ScenePanel';
import { SceneControllerRegistry } from '../../SceneControllerRegistry';

jest.mock('@/features/scene-view/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');

  return {
    __esModule: true,
    SceneControllerRegistryProvider: ({
      children,
    }: {
      children: React.ReactNode;
    }) => ReactActual.createElement(ReactActual.Fragment, null, children),
    FitModeSelect: ({ fitMode }: { fitMode: string }) =>
      ReactActual.createElement(
        'div',
        { 'data-testid': 'fit-mode-select' },
        fitMode
      ),
    SceneView: ({
      sceneModel,
      fitMode,
    }: {
      sceneModel: { uuid: string };
      fitMode: string;
    }) =>
      ReactActual.createElement(
        'div',
        { 'data-testid': 'scene-view', 'data-fit-mode': fitMode },
        sceneModel.uuid
      ),
    useSceneScale: () => 1,
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
      <ScenePanel
        content={{
          sceneRef,
          sceneModel: makeScene('scene-1'),
          sceneControllerRegistry: new SceneControllerRegistry(sceneRef),
          fitMode: 'fit-page',
        }}
        onFitModeChange={jest.fn()}
      />
    );

    expect(screen.getByLabelText('Apply all changes')).toBeInTheDocument();
    expect(screen.getByLabelText('Decline all changes')).toBeInTheDocument();
    expect(screen.getByText('Scale:')).toBeInTheDocument();
    expect(screen.getByTestId('fit-mode-select')).toBeInTheDocument();
    expect(screen.getByTestId('scene-view')).toHaveTextContent('scene-1');
  });

  it('shows the device class icon for an unattached scene', () => {
    render(
      <ScenePanel
        content={{
          sceneRef: { ...sceneRef, deviceId: 'device-1' },
          sceneModel: makeScene('scene-1'),
          sceneControllerRegistry: new SceneControllerRegistry(sceneRef),
          fitMode: 'fit-page',
          isUnattachedScene: true,
        }}
        onFitModeChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('scene-device-class-icon')).toHaveAttribute(
      'alt',
      'Unattached scene'
    );
  });

  it("drives the toolbar and scene view from the tab's fit mode", () => {
    render(
      <ScenePanel
        content={{
          sceneRef,
          sceneModel: makeScene('scene-1'),
          sceneControllerRegistry: new SceneControllerRegistry(sceneRef),
          fitMode: 'fit-width',
        }}
        onFitModeChange={jest.fn()}
      />
    );

    expect(screen.getByTestId('fit-mode-select')).toHaveTextContent(
      'fit-width'
    );
    expect(screen.getByTestId('scene-view')).toHaveAttribute(
      'data-fit-mode',
      'fit-width'
    );
  });
});

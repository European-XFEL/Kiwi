import { render, screen } from '@testing-library/react';
import { DisplayLabelModel, SceneModel } from '@/karabo/common/api';
import type { ControllerContainerContext } from '@/features/controllers/api';
import { AccessLevel } from '@/karabo/data/enums';
import React from 'react';
import { SceneControllerRegistry } from '@/features/scenepanel/SceneControllerRegistry';
import ScenePanel from '../ScenePanel';

const mockSceneControllerRegistries: Array<SceneControllerRegistry | null> = [];

jest.mock('@/features/scene-view/api', () => {
  const ReactActual = jest.requireActual<typeof React>('react');
  const { SceneControllerRegistryProvider } = jest.requireActual<
    typeof import('@/features/scene-view/contexts/SceneControllerRegistryContext')
  >('@/features/scene-view/contexts/SceneControllerRegistryContext');
  const { useSceneControllerRegistry } = jest.requireActual<
    typeof import('@/features/scene-view/hooks/useSceneControllerRegistry')
  >('@/features/scene-view/hooks/useSceneControllerRegistry');

  return {
    __esModule: true,
    SceneControllerRegistryProvider,
    FitModeSelect: () =>
      ReactActual.createElement(
        'div',
        { 'data-testid': 'fit-mode-select' },
        'fit-mode'
      ),
    SceneView: ({ sceneModel }: { sceneModel: { uuid: string } }) => {
      const sceneControllerRegistry =
        useSceneControllerRegistry() as SceneControllerRegistry | null;
      mockSceneControllerRegistries.push(sceneControllerRegistry);

      return ReactActual.createElement(
        'div',
        {
          'data-testid': 'scene-view',
          'data-registry-scene': sceneControllerRegistry?.options.id ?? '',
        },
        sceneModel.uuid
      );
    },
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
  projectUuid: 'project-1',
  projectName: 'Demo',
  uuid: 'scene-1',
  name: 'Beamline',
  width: 800,
  height: 600,
};

describe('ScenePanel registry lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSceneControllerRegistries.length = 0;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('passes the provided sceneControllerRegistry into the registry context', () => {
    const sceneControllerRegistry = new SceneControllerRegistry(sceneRef);

    render(
      <ScenePanel
        content={{
          sceneRef,
          sceneModel: makeScene('scene-1'),
          sceneControllerRegistry,
          fitMode: 'fit-page',
        }}
        onFitModeChange={jest.fn()}
      />
    );

    const observed = mockSceneControllerRegistries.at(-1);
    expect(observed).toBe(sceneControllerRegistry);
    expect(observed?.options.id).toBe('scene-1');
    expect(screen.getByTestId('scene-view')).toHaveAttribute(
      'data-registry-scene',
      'scene-1'
    );
  });

  it('reflects a different registry when the prop changes', () => {
    const firstRegistry = new SceneControllerRegistry(sceneRef);
    const secondRef = { ...sceneRef, uuid: 'scene-2' };
    const secondRegistry = new SceneControllerRegistry(secondRef);

    const { rerender } = render(
      <ScenePanel
        content={{
          sceneRef,
          sceneModel: makeScene('scene-1'),
          sceneControllerRegistry: firstRegistry,
          fitMode: 'fit-page',
        }}
        onFitModeChange={jest.fn()}
      />
    );

    rerender(
      <ScenePanel
        content={{
          sceneRef: secondRef,
          sceneModel: makeScene('scene-2'),
          sceneControllerRegistry: secondRegistry,
          fitMode: 'fit-page',
        }}
        onFitModeChange={jest.fn()}
      />
    );

    const observed = mockSceneControllerRegistries.at(-1);
    expect(observed).toBe(secondRegistry);
    expect(observed?.options.id).toBe('scene-2');
  });

  it('the registry can register mounted controllers', () => {
    const sceneControllerRegistry = new SceneControllerRegistry(sceneRef);
    const model = new DisplayLabelModel();
    const ctx: ControllerContainerContext = {
      proxy: undefined,
      proxies: [],
      userAccessLevel: AccessLevel.OBSERVER,
    };

    render(
      <ScenePanel
        content={{
          sceneRef,
          sceneModel: makeScene('scene-1'),
          sceneControllerRegistry,
          fitMode: 'fit-page',
        }}
        onFitModeChange={jest.fn()}
      />
    );

    sceneControllerRegistry.registerController('scene.0', model, ctx);

    expect(sceneControllerRegistry.controllers.size).toBe(1);
    expect(sceneControllerRegistry.getController('scene.0')?.ctx).toBe(ctx);
  });
});

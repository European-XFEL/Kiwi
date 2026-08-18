import { fireEvent, render } from '@testing-library/react';
import { SceneControllerRegistryProvider } from '../../contexts/SceneControllerRegistryContext';
import type {
  SceneControllerRecord,
  SceneControllerRegistry,
} from '../../contexts/SceneControllerRegistryContext';
import { createSceneControllerRegistryMock } from '@/testing';
import type { SceneObjectInteraction } from '../../utils/sceneObjectInteraction';
import { useSceneObjectInteraction } from '../useSceneObjectInteraction';

function Surface({
  enabled,
  onPointerDown,
}: {
  enabled?: boolean;
  onPointerDown: (interaction: SceneObjectInteraction) => void;
}) {
  const handlePointerDown = useSceneObjectInteraction({
    scale: 2,
    enabled,
    onPointerDown,
  });

  return (
    <div data-testid="surface" onPointerDownCapture={handlePointerDown}>
      <div data-scene-object-id="scene.0">
        <button data-testid="hit">child</button>
      </div>
    </div>
  );
}

function renderSurface(
  registry: SceneControllerRegistry,
  props: {
    enabled?: boolean;
    onPointerDown: (interaction: SceneObjectInteraction) => void;
  }
) {
  return render(
    <SceneControllerRegistryProvider registry={registry}>
      <Surface {...props} />
    </SceneControllerRegistryProvider>
  );
}

describe('useSceneObjectInteraction', () => {
  it('resolves the object id and controller record from the pointer target', () => {
    const controller: SceneControllerRecord = {
      id: 'scene.0',
      model: {} as SceneControllerRecord['model'],
      ctx: {} as SceneControllerRecord['ctx'],
    };
    const registry = createSceneControllerRegistryMock(controller);
    const onPointerDown = jest.fn();

    const { getByTestId } = renderSurface(registry, { onPointerDown });

    fireEvent.pointerDown(getByTestId('hit'));

    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerDown).toHaveBeenCalledWith(
      expect.objectContaining({ objectId: 'scene.0', controller }),
      expect.anything()
    );
    expect(registry.getController).toHaveBeenCalledWith('scene.0');
  });

  it('does not invoke the callback when disabled', () => {
    const onPointerDown = jest.fn();

    const { getByTestId } = renderSurface(createSceneControllerRegistryMock(), {
      enabled: false,
      onPointerDown,
    });

    fireEvent.pointerDown(getByTestId('hit'));

    expect(onPointerDown).not.toHaveBeenCalled();
  });
});

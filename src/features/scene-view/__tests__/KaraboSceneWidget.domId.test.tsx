import { render } from '@testing-library/react';
import { DisplayLabelModel, RectangleModel } from '@/karabo/common/api';
import DisplayLabel from '@/features/controllers/display/DisplayLabel';
import { KaraboSceneWidget } from '../KaraboSceneWidget';
import { registerRenderer } from '../renderRegistry';
import '../components/shapes/Rectangle';

registerRenderer('DisplayLabel', DisplayLabel);

const mockControllerContainer = jest.fn<null, [unknown]>(() => null);

jest.mock('../components/widgets/ControllerContainer', () => ({
  ControllerContainer: (props: unknown) => mockControllerContainer(props),
}));

const makeWidget = () => {
  const model = new DisplayLabelModel();
  model.width = 80;
  model.height = 30;
  return model;
};

describe('KaraboSceneWidget DOM identity', () => {
  it('exposes the objectId as the DOM lookup attribute and a semantic id', () => {
    const { container } = render(
      <KaraboSceneWidget model={makeWidget()} objectId="scene:uuid.0" />
    );

    const wrapper = container.querySelector<HTMLElement>(
      '[data-scene-object-id="scene:uuid.0"]'
    );

    expect(wrapper).not.toBeNull();
    expect(wrapper?.id).toMatch(/^SceneObject-/);
  });

  it('forwards the objectId into the controller render path', () => {
    render(<KaraboSceneWidget model={makeWidget()} objectId="scene:uuid.1" />);

    expect(mockControllerContainer).toHaveBeenCalledWith(
      expect.objectContaining({ objectId: 'scene:uuid.1' })
    );
  });

  it('places shapes below widgets without changing widget stacking', () => {
    const shape = new RectangleModel();
    shape.width = 80;
    shape.height = 30;

    const { container } = render(
      <>
        <KaraboSceneWidget model={makeWidget()} objectId="scene:uuid.0" />
        <KaraboSceneWidget model={shape} objectId="scene:uuid.1" />
      </>
    );

    const widgetWrapper = container.querySelector<HTMLElement>(
      '[data-scene-object-id="scene:uuid.0"]'
    );
    const shapeWrapper = container.querySelector<HTMLElement>(
      '[data-scene-object-id="scene:uuid.1"]'
    );

    expect(widgetWrapper?.style.zIndex).toBe('');
    expect(shapeWrapper).toHaveStyle({ zIndex: '-1' });
  });

  it('preserves source order when stacking several shapes', () => {
    const shapes = Array.from({ length: 3 }, () => {
      const shape = new RectangleModel();
      shape.width = 80;
      shape.height = 30;
      return shape;
    });

    const { container } = render(
      <>
        {shapes.map((shape, index) => (
          <KaraboSceneWidget
            key={index}
            model={shape}
            objectId={`scene:uuid.${index}`}
          />
        ))}
      </>
    );

    const wrappers = Array.from(
      container.querySelectorAll<HTMLElement>('[data-scene-object-id]')
    );

    expect(wrappers.map((wrapper) => wrapper.dataset.sceneObjectId)).toEqual([
      'scene:uuid.0',
      'scene:uuid.1',
      'scene:uuid.2',
    ]);
    wrappers.forEach((wrapper) => {
      expect(wrapper).toHaveStyle({ zIndex: '-1' });
    });
  });
});

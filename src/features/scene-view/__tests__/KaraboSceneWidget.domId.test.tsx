import { render } from '@testing-library/react';
import { DisplayLabelModel } from '@/karabo/common/api';
import DisplayLabel from '@/features/controllers/components/display/DisplayLabel';
import { KaraboSceneWidget } from '../KaraboSceneWidget';
import { registerRenderer } from '../renderRegistry';

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
      <KaraboSceneWidget
        model={makeWidget()}
        objectId="scene:uuid.0"
        layer="widget"
      />
    );

    const wrapper = container.querySelector<HTMLElement>(
      '[data-scene-object-id="scene:uuid.0"]'
    );

    expect(wrapper).not.toBeNull();
    expect(wrapper?.id).toMatch(/^SceneObject-/);
  });

  it('forwards the objectId into the controller render path', () => {
    render(
      <KaraboSceneWidget
        model={makeWidget()}
        objectId="scene:uuid.1"
        layer="widget"
      />
    );

    expect(mockControllerContainer).toHaveBeenCalledWith(
      expect.objectContaining({ objectId: 'scene:uuid.1' })
    );
  });
});

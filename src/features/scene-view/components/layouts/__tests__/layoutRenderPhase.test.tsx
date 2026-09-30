import { render } from '@testing-library/react';
import {
  BoxLayoutModel,
  Direction,
  DisplayLabelModel,
  FixedLayoutModel,
  GridLayoutModel,
  RectangleModel,
} from '@/karabo/common/api';
import DisplayLabel from '@/features/controllers/display/DisplayLabel';
import { renderContent } from '../../../KaraboSceneWidget';
import { registerRenderer } from '../../../renderRegistry';
import '../BoxLayout';
import '../FixedLayout';
import '../GridLayout';
import '../../shapes/Rectangle';

registerRenderer('DisplayLabel', DisplayLabel);

const mockControllerContainer = jest.fn<null, [unknown]>(() => null);

jest.mock(
  '@/features/scene-view/components/widgets/ControllerContainer',
  () => ({
    ControllerContainer: (props: unknown) => mockControllerContainer(props),
  })
);

describe('layout shape stacking', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeWidget = () => {
    const child = new DisplayLabelModel();
    child.width = 50;
    child.height = 20;
    return child;
  };

  const makeShape = () => {
    const child = new RectangleModel();
    child.width = 50;
    child.height = 20;
    return child;
  };

  const makeBoxLayout = () => {
    const layout = new BoxLayoutModel();
    layout.direction = Direction.LeftToRight;
    layout.children = [makeWidget(), makeShape()];
    return layout;
  };

  const makeFixedLayout = () => {
    const layout = new FixedLayoutModel();
    layout.children = [makeWidget(), makeShape()];
    return layout;
  };

  const makeGridLayout = () => {
    const layout = new GridLayoutModel();
    layout.children = [makeWidget(), makeShape()];
    return layout;
  };

  it.each([
    ['BoxLayout', makeBoxLayout],
    ['FixedLayout', makeFixedLayout],
    ['GridLayout', makeGridLayout],
  ])(
    'renders mixed children once and stacks only the shape for %s',
    (_, makeLayout) => {
      const { container } = render(<>{renderContent(makeLayout(), 'scene')}</>);

      expect(mockControllerContainer).toHaveBeenCalledTimes(1);
      expect(mockControllerContainer).toHaveBeenCalledWith(
        expect.objectContaining({ objectId: 'scene.0' })
      );
      expect(
        container.querySelector<HTMLElement>('[data-scene-object-id="scene.0"]')
          ?.style.zIndex
      ).toBe('');
      expect(
        container.querySelector('[data-scene-object-id="scene.1"]')
      ).toHaveStyle({ zIndex: '-1' });
    }
  );

  it.each([
    ['BoxLayout', makeBoxLayout],
    ['FixedLayout', makeFixedLayout],
    ['GridLayout', makeGridLayout],
  ])(
    'adds scene object identity attributes for %s',
    (layoutName, makeLayout) => {
      const { container } = render(<>{renderContent(makeLayout(), 'scene')}</>);

      const root = container.querySelector<HTMLElement>(
        '[data-scene-object-id="scene"]'
      );
      const child = container.querySelector<HTMLElement>(
        '[data-scene-object-id="scene.0"]'
      );

      expect(root?.id).toMatch(new RegExp('^' + layoutName + '-'));
      expect(child?.id).toMatch(new RegExp('^' + layoutName + '-child-'));
    }
  );

  it.each([
    ['BoxLayout', makeBoxLayout],
    ['FixedLayout', makeFixedLayout],
    ['GridLayout', makeGridLayout],
  ])(
    'preserves the stacking order of several nested shapes in %s',
    (_, makeLayout) => {
      const outer = new BoxLayoutModel();
      outer.direction = Direction.LeftToRight;
      const inner = makeLayout();
      inner.children = [makeShape(), makeShape(), makeWidget()];
      outer.children = [inner];

      const { container } = render(<>{renderContent(outer, 'scene')}</>);

      const nestedChildren = Array.from(
        container.querySelectorAll<HTMLElement>(
          '[data-scene-object-id^="scene.0."]'
        )
      );

      expect(
        nestedChildren.map((child) => child.dataset.sceneObjectId)
      ).toEqual(['scene.0.0', 'scene.0.1', 'scene.0.2']);
      expect(nestedChildren[0]).toHaveStyle({ zIndex: '-1' });
      expect(nestedChildren[1]).toHaveStyle({ zIndex: '-1' });
      expect(nestedChildren[2]?.style.zIndex).toBe('');
      expect(mockControllerContainer).toHaveBeenCalledTimes(1);
    }
  );
});

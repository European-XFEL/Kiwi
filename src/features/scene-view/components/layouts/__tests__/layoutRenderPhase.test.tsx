import { render } from '@testing-library/react';
import {
  BoxLayoutModel,
  Direction,
  DisplayLabelModel,
  FixedLayoutModel,
  GridLayoutModel,
} from '@/karabo/common/api';
import { renderLayerContent } from '../../../KaraboSceneWidget';
import '../BoxLayout';
import '../FixedLayout';
import '../GridLayout';
import '@/features/controllers/components/display/DisplayLabel';

const mockControllerContainer = jest.fn<null, [unknown]>(() => null);

jest.mock('@/features/controllers/api', () => ({
  ControllerContainer: (props: unknown) => mockControllerContainer(props),
}));

describe('layout render layer propagation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const makeChild = () => {
    const child = new DisplayLabelModel();
    child.width = 50;
    child.height = 20;
    return child;
  };

  const makeBoxLayout = () => {
    const layout = new BoxLayoutModel();
    layout.direction = Direction.LeftToRight;
    layout.children = [makeChild()];
    return layout;
  };

  const makeFixedLayout = () => {
    const layout = new FixedLayoutModel();
    layout.children = [makeChild()];
    return layout;
  };

  const makeGridLayout = () => {
    const layout = new GridLayoutModel();
    layout.children = [makeChild()];
    return layout;
  };

  it.each([
    ['BoxLayout', makeBoxLayout],
    ['FixedLayout', makeFixedLayout],
    ['GridLayout', makeGridLayout],
  ])(
    'does not mount nested controller widgets in the shape pass for %s',
    (_, makeLayout) => {
      render(<>{renderLayerContent(makeLayout(), 'shape')}</>);

      expect(mockControllerContainer).not.toHaveBeenCalled();
    }
  );

  it.each([
    ['BoxLayout', makeBoxLayout],
    ['FixedLayout', makeFixedLayout],
    ['GridLayout', makeGridLayout],
  ])(
    'mounts nested controller widgets once in the widget pass for %s',
    (_, makeLayout) => {
      render(<>{renderLayerContent(makeLayout(), 'widget')}</>);

      expect(mockControllerContainer).toHaveBeenCalledTimes(1);
    }
  );
});

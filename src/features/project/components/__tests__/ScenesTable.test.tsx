import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SceneModel } from '@/karabo/common/scenemodel/api';
import ScenesTable from '../ScenesTable';

const scenes = [
  new SceneModel({ uuid: 'scene-a', simple_name: 'Overview' }),
  new SceneModel({ uuid: 'scene-b', simple_name: 'Detectors' }),
];

describe('ScenesTable', () => {
  it('reports single and double clicks while selection is available', async () => {
    const user = userEvent.setup();
    const onSceneClick = jest.fn();
    const onSceneDoubleClick = jest.fn();

    render(
      <ScenesTable
        scenes={scenes}
        onSceneClick={onSceneClick}
        onSceneDoubleClick={onSceneDoubleClick}
      />
    );
    await user.click(screen.getByText('Overview'));
    await user.dblClick(screen.getByText('Detectors'));

    expect(onSceneClick).toHaveBeenCalled();
    expect(onSceneDoubleClick).toHaveBeenCalledTimes(1);
    expect(onSceneDoubleClick.mock.calls[0][0].uuid).toBe('scene-b');
  });

  it('ignores clicks while selection is disabled', async () => {
    const user = userEvent.setup();
    const onSceneClick = jest.fn();
    const onSceneDoubleClick = jest.fn();

    render(
      <ScenesTable
        scenes={scenes}
        onSceneClick={onSceneClick}
        onSceneDoubleClick={onSceneDoubleClick}
        selectionDisabled
      />
    );
    await user.click(screen.getByText('Overview'));
    await user.dblClick(screen.getByText('Detectors'));

    expect(onSceneClick).not.toHaveBeenCalled();
    expect(onSceneDoubleClick).not.toHaveBeenCalled();
  });

  it('marks its rows as disabled for assistive technology', () => {
    render(
      <ScenesTable
        scenes={scenes}
        onSceneClick={jest.fn()}
        onSceneDoubleClick={jest.fn()}
        selectionDisabled
      />
    );

    expect(screen.getByText('Overview').closest('tr')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
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

  it.each(['right click', 'ContextMenu', 'Shift+F10'])(
    'bookmarks the targeted row through %s while another scene is selected',
    async (access) => {
      const user = userEvent.setup();
      const onSceneBookmark = jest.fn();
      const onSceneClick = jest.fn();
      const onSceneDoubleClick = jest.fn();
      render(
        <ScenesTable
          scenes={scenes}
          selectedScene={scenes[0]}
          onSceneClick={onSceneClick}
          onSceneDoubleClick={onSceneDoubleClick}
          onSceneBookmark={onSceneBookmark}
        />
      );
      const target = screen.getByRole('button', { name: /^Detectors/ });
      target.focus();
      if (access === 'right click') {
        fireEvent.contextMenu(target);
      } else {
        fireEvent.keyDown(target, {
          key: access === 'ContextMenu' ? 'ContextMenu' : 'F10',
          shiftKey: access === 'Shift+F10',
        });
      }
      await user.click(
        await screen.findByRole('menuitem', { name: 'Add to Favorites' })
      );

      expect(onSceneBookmark).toHaveBeenCalledTimes(1);
      expect(onSceneBookmark).toHaveBeenCalledWith(scenes[1]);
      expect(onSceneClick).toHaveBeenCalledWith(scenes[1]);
      expect(onSceneDoubleClick).not.toHaveBeenCalled();
    }
  );

  it('cannot bookmark busy rows', () => {
    const onSceneBookmark = jest.fn();
    render(
      <ScenesTable
        scenes={scenes}
        onSceneClick={jest.fn()}
        onSceneDoubleClick={jest.fn()}
        onSceneBookmark={onSceneBookmark}
        selectionDisabled
      />
    );

    fireEvent.contextMenu(screen.getByText('Detectors'));
    const item = screen.queryByRole('menuitem', { name: 'Add to Favorites' });
    if (item) {
      expect(item).toHaveAttribute('aria-disabled', 'true');
      fireEvent.click(item);
    }
    expect(onSceneBookmark).not.toHaveBeenCalled();
  });

  it('does not offer bookmarking without a callback', () => {
    render(
      <ScenesTable
        scenes={scenes}
        onSceneClick={jest.fn()}
        onSceneDoubleClick={jest.fn()}
      />
    );
    fireEvent.contextMenu(screen.getByText('Detectors'));
    expect(
      screen.queryByRole('menuitem', { name: 'Add to Favorites' })
    ).not.toBeInTheDocument();
  });
});

it('disables the cinema action while selection is disabled', async () => {
  const onCopy = jest.fn();
  const onSceneClick = jest.fn();
  render(
    <ScenesTable
      scenes={scenes}
      onSceneClick={onSceneClick}
      onSceneDoubleClick={jest.fn()}
      onSceneCopyCinema={onCopy}
      selectionDisabled
    />
  );
  fireEvent.contextMenu(screen.getByTestId('scene-row-scene-b'));
  const item = await screen.findByRole('menuitem', {
    name: 'Copy cinema URL',
  });
  expect(item).toHaveAttribute('aria-disabled', 'true');
  fireEvent.click(item);
  expect(onCopy).not.toHaveBeenCalled();
  expect(onSceneClick).not.toHaveBeenCalled();
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RecentScenesList from '../RecentScenesList';
import type { RecentSceneInfo } from '@/store/api';

const scenes: RecentSceneInfo[] = [
  {
    domain: 'CONTROLS',
    projectName: 'David_test',
    projectUuid: 'project-1',
    uuid: 'scene-a',
    name: 'beckhoff',
  },
  {
    domain: 'CONTROLS',
    projectName: 'David_test',
    projectUuid: 'project-1',
    uuid: 'scene-b',
    name: 'box_layout',
  },
];

describe('RecentScenesList', () => {
  it('opens a recent scene via the folder action button', async () => {
    const user = userEvent.setup();
    const onSceneOpen = jest.fn();

    render(
      <RecentScenesList
        scenes={scenes}
        onSceneOpen={onSceneOpen}
        onSceneRemove={jest.fn()}
      />
    );

    await user.click(screen.getAllByTitle('Open scene')[0]);

    expect(onSceneOpen).toHaveBeenCalledWith(scenes[0]);
  });

  it('removes a recent scene via the trash action button', async () => {
    const user = userEvent.setup();
    const onSceneRemove = jest.fn();

    render(
      <RecentScenesList
        scenes={scenes}
        onSceneOpen={jest.fn()}
        onSceneRemove={onSceneRemove}
      />
    );

    await user.click(screen.getAllByTitle('Remove from recent scenes')[0]);

    expect(onSceneRemove).toHaveBeenCalledWith(scenes[0]);
  });
});

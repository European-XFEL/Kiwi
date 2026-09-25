import { render, screen } from '@testing-library/react';
import { singletons } from '@/lib/singletons/api';
import { useGlobalStore } from '@/store/api';
import HomePanel from '../HomePanel';

describe('HomePanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    singletons.delete('config');
    useGlobalStore.getState().setLoggedIn({
      loggedUser: 'test-user',
      accessLevel: 4,
      isReadOnly: false,
      guiServerHost: 'host-a',
      guiServerPort: 44444,
      guiServerTopic: 'TOPIC_A',
      guiServerVersion: '2.20.0',
      sessionStartEpoc: 1700000000000,
    });
  });

  afterEach(() => {
    useGlobalStore.getState().reset();
    singletons.delete('config');
    localStorage.clear();
  });

  it('does not offer recent scenes saved by an earlier version', () => {
    localStorage.setItem(
      'kiwi/project:recentScenesByTopic',
      JSON.stringify({
        TOPIC_A: [
          {
            domain: 'CONTROLS',
            projectUuid: 'motor-project',
            projectName: 'Motors',
            uuid: 'motor-scene',
            name: 'Motor Scene',
          },
        ],
      })
    );

    render(<HomePanel />);

    expect(screen.getByRole('heading', { name: 'Kiwi' })).toBeInTheDocument();
    expect(screen.queryByText('Recent Scenes')).not.toBeInTheDocument();
    expect(screen.queryByText('Motor Scene')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Open scene' })
    ).not.toBeInTheDocument();
  });
});

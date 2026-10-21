import { Hash } from '@/karabo/data/api';
import { KaraboEvent } from '@/lib/events';
import { showMessageBox } from '@/lib/messagebox';
import type { StoredProjectFavorite } from '@/lib/singletons/api';
import { ConfigurationStore } from '@/lib/singletons/Configuration';
import { Mediator } from '@/lib/singletons/Mediator';
import { SingletonContext } from '@/testing';
import {
  addProjectFavorite,
  moveProjectFavorite,
  removeProjectFavorite,
} from '../projectFavoriteActions';

jest.mock('@/lib/messagebox', () => ({ showMessageBox: jest.fn() }));

const favorite = {
  domain: 'CONTROLS',
  projectUuid: 'motors',
  projectName: 'Motors',
};

describe('project favorite actions', () => {
  let config: ConfigurationStore;
  let mediator: Mediator;
  let context: SingletonContext;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    config = new ConfigurationStore();
    mediator = new Mediator();
    context = new SingletonContext({ config, mediator });
  });

  afterEach(() => {
    context.restore();
    localStorage.clear();
  });

  it('keeps direct Configuration mutations silent', () => {
    const topics: string[] = [];
    mediator.on(KaraboEvent.ProjectFavoritesChanged, (data: Hash) => {
      topics.push(data.get('topic'));
    });

    config.addProjectFavorite('TOPIC_A', favorite);
    config.removeProjectFavorite('TOPIC_A', favorite);
    config.setValue('projectFavoritesByTopic', { TOPIC_A: [favorite] });
    config.deleteValue('projectFavoritesByTopic');

    expect(config.getProjectFavorites('TOPIC_A')).toEqual([]);
    expect(topics).toEqual([]);
  });

  it('persists additions and removals before broadcasting the affected topic', () => {
    const changes: {
      topic: string;
      favorites: readonly StoredProjectFavorite[];
      persisted: readonly StoredProjectFavorite[];
    }[] = [];
    mediator.on(KaraboEvent.ProjectFavoritesChanged, (data: Hash) => {
      const topic = data.getValue<string>('topic');
      changes.push({
        topic,
        favorites: config.getProjectFavorites(topic),
        persisted: new ConfigurationStore().getProjectFavorites(topic),
      });
    });

    addProjectFavorite('TOPIC_A', favorite);
    addProjectFavorite('TOPIC_B', { ...favorite, projectName: 'Other topic' });
    removeProjectFavorite('TOPIC_A', favorite);

    expect(changes).toEqual([
      { topic: 'TOPIC_A', favorites: [favorite], persisted: [favorite] },
      {
        topic: 'TOPIC_B',
        favorites: [{ ...favorite, projectName: 'Other topic' }],
        persisted: [{ ...favorite, projectName: 'Other topic' }],
      },
      { topic: 'TOPIC_A', favorites: [], persisted: [] },
    ]);
    expect(config.getProjectFavorites('TOPIC_B')).toEqual([
      { ...favorite, projectName: 'Other topic' },
    ]);
  });

  it('warns at the limit without broadcasting or changing stored favorites', () => {
    const favorites = Array.from({ length: 10 }, (_, index) => ({
      ...favorite,
      projectUuid: `project-${index}`,
    }));
    favorites.forEach((entry) => config.addProjectFavorite('TOPIC_A', entry));
    const changed = jest.fn();
    mediator.on(KaraboEvent.ProjectFavoritesChanged, changed);

    addProjectFavorite('TOPIC_A', favorite);

    expect(showMessageBox).toHaveBeenCalledWith({
      variant: 'warning',
      title: 'Favorites are full',
      msg: 'You can keep up to 10 favorites. Remove one from Home to add another.',
    });
    expect(changed).not.toHaveBeenCalled();
    expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual(
      favorites
    );
  });

  it('broadcasts a name refresh at the limit without warning', () => {
    const favorites = Array.from({ length: 10 }, (_, index) => ({
      ...favorite,
      projectUuid: `project-${index}`,
    }));
    favorites.forEach((entry) => config.addProjectFavorite('TOPIC_A', entry));
    const changed = jest.fn();
    mediator.on(KaraboEvent.ProjectFavoritesChanged, changed);

    addProjectFavorite('TOPIC_A', { ...favorites[0], projectName: 'Renamed' });

    expect(showMessageBox).not.toHaveBeenCalled();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(config.getProjectFavorites('TOPIC_A')[0].projectName).toBe(
      'Renamed'
    );
  });

  it('persists the new priority order before broadcasting its topic', () => {
    const detail = {
      ...favorite,
      projectUuid: 'detail',
      projectName: 'Detail',
    };
    config.addProjectFavorite('TOPIC_A', favorite);
    config.addProjectFavorite('TOPIC_A', detail);
    const changes: {
      topic: string;
      favorites: readonly StoredProjectFavorite[];
    }[] = [];
    mediator.on(KaraboEvent.ProjectFavoritesChanged, (data: Hash) => {
      const topic = data.getValue<string>('topic');
      changes.push({
        topic,
        favorites: new ConfigurationStore().getProjectFavorites(topic),
      });
    });

    moveProjectFavorite('TOPIC_A', detail, 0);

    expect(changes).toEqual([
      { topic: 'TOPIC_A', favorites: [detail, favorite] },
    ]);
  });

  it.each(['getItem', 'setItem'] as const)(
    'updates memory before broadcasting when storage %s fails',
    async (method) => {
      const storageSpy = jest
        .spyOn(Storage.prototype, method)
        .mockImplementation(() => {
          throw new DOMException('The operation is insecure.');
        });
      try {
        const memoryConfig = new ConfigurationStore();
        await SingletonContext.run({ config: memoryConfig }, () => {
          const changes: {
            topic: string;
            favorites: readonly StoredProjectFavorite[];
          }[] = [];
          mediator.on(KaraboEvent.ProjectFavoritesChanged, (data: Hash) => {
            const topic = data.getValue<string>('topic');
            changes.push({
              topic,
              favorites: memoryConfig.getProjectFavorites(topic),
            });
          });

          addProjectFavorite('TOPIC_A', favorite);
          removeProjectFavorite('TOPIC_A', favorite);

          expect(changes).toEqual([
            { topic: 'TOPIC_A', favorites: [favorite] },
            { topic: 'TOPIC_A', favorites: [] },
          ]);
        });
      } finally {
        storageSpy.mockRestore();
      }
    }
  );
});

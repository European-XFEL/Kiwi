import { Hash } from '@/karabo/data/api';
import { KaraboEvent } from '@/lib/events';
import type { StoredProjectFavorite } from '@/lib/singletons/api';
import { ConfigurationStore } from '@/lib/singletons/Configuration';
import { Mediator } from '@/lib/singletons/Mediator';
import { SingletonContext } from '@/testing';
import {
  addProjectFavorite,
  removeProjectFavorite,
} from '../projectFavoriteActions';

const favorite = {
  domain: 'CONTROLS',
  projectUuid: 'motors',
  projectName: 'Motors',
  sceneUuid: 'overview',
  sceneName: 'Overview',
};

describe('project favorite actions', () => {
  let config: ConfigurationStore;
  let mediator: Mediator;
  let context: SingletonContext;

  beforeEach(() => {
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
    addProjectFavorite('TOPIC_B', { ...favorite, sceneName: 'Other topic' });
    removeProjectFavorite('TOPIC_A', favorite);

    expect(changes).toEqual([
      { topic: 'TOPIC_A', favorites: [favorite], persisted: [favorite] },
      {
        topic: 'TOPIC_B',
        favorites: [{ ...favorite, sceneName: 'Other topic' }],
        persisted: [{ ...favorite, sceneName: 'Other topic' }],
      },
      { topic: 'TOPIC_A', favorites: [], persisted: [] },
    ]);
    expect(config.getProjectFavorites('TOPIC_B')).toEqual([
      { ...favorite, sceneName: 'Other topic' },
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

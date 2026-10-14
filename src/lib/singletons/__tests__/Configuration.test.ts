import { decryptData } from '@/lib/crypto';
import { ConfigurationStore } from '../Configuration';

describe('ConfigurationStore', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('initializes from localStorage once and uses runtime cache afterwards', () => {
    localStorage.setItem('kiwi/network:host', JSON.stringify('stored-host'));

    const config = new ConfigurationStore();

    expect(config.getValue('host')).toBe('stored-host');

    // Runtime reads should come from cache, not from localStorage.
    localStorage.setItem('kiwi/network:host', JSON.stringify('changed-host'));
    expect(config.getValue('host')).toBe('stored-host');
  });

  it('keeps configuration in memory when localStorage is unavailable', () => {
    const originalGetItem = localStorage.getItem;
    Object.defineProperty(localStorage, 'getItem', {
      configurable: true,
      value: () => {
        throw new DOMException('The operation is insecure.');
      },
    });

    try {
      const config = new ConfigurationStore();

      expect(() => config.setValue('host', 'memory-host')).not.toThrow();
      expect(config.getValue('host')).toBe('memory-host');

      config.setValue('sessionRefreshToken', 'memory-token');
      expect(config.getValue('sessionRefreshToken')).toBe('memory-token');
    } finally {
      Object.defineProperty(localStorage, 'getItem', {
        configurable: true,
        value: originalGetItem,
      });
    }
  });

  it('reads encrypted items from localStorage as shared values', () => {
    const rawToken = JSON.stringify('secret-token');
    localStorage.setItem(
      'kiwi/authentication:sessionRefreshToken',
      `encrypted_${rawToken}`
    );

    const config = new ConfigurationStore();

    expect(config.getValue('sessionRefreshToken')).toBe('secret-token');
    expect(decryptData).toHaveBeenCalledWith(`encrypted_${rawToken}`);

    const updatedRawToken = JSON.stringify('updated-token');
    localStorage.setItem(
      'kiwi/authentication:sessionRefreshToken',
      `encrypted_${updatedRawToken}`
    );

    // Encrypted/shared items are not cached in memory and are read from storage.
    expect(config.getValue('sessionRefreshToken')).toBe('updated-token');
  });

  it('throws when stored encrypted value is invalid', () => {
    localStorage.setItem(
      'kiwi/authentication:sessionRefreshToken',
      'invalid-payload'
    );

    const config = new ConfigurationStore();

    expect(() => config.getValue('sessionRefreshToken')).toThrow(
      'Failed to initialize config item "sessionRefreshToken" from localStorage'
    );
  });

  it('stores the last GUI server topic selection', () => {
    const config = new ConfigurationStore();

    config.lastTopic = 'SA2';

    expect(config.lastTopic).toBe('SA2');

    expect(localStorage.getItem('kiwi/network:lastTopic')).toBe(
      JSON.stringify('SA2')
    );
  });

  describe('project favorites', () => {
    const favorite = {
      domain: 'CONTROLS',
      projectUuid: 'motors',
      projectName: 'Motors',
      sceneUuid: 'overview',
      sceneName: 'Overview',
    };

    it('recovers from invalid favorites JSON while keeping other configuration', () => {
      localStorage.setItem('kiwi/project:projectFavoritesByTopic', '{bad');
      localStorage.setItem('kiwi/network:host', JSON.stringify('stored-host'));

      const config = new ConfigurationStore();

      expect(config.getValue('host')).toBe('stored-host');
      expect(config.getProjectFavorites('TOPIC_A')).toEqual([]);
      config.addProjectFavorite('TOPIC_A', favorite);
      expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual([
        favorite,
      ]);
    });

    it('still reports invalid JSON in other configuration items', () => {
      localStorage.setItem('kiwi/network:host', '{bad');

      expect(() => new ConfigurationStore()).toThrow(
        'Failed to initialize config item "host" from localStorage'
      );
    });

    it.each(['null', '[]', '5', '"favorites"', 'false'])(
      'treats a non-mapping favorites value %s as empty',
      (stored) => {
        localStorage.setItem('kiwi/project:projectFavoritesByTopic', stored);

        const config = new ConfigurationStore();

        expect(config.getProjectFavorites('TOPIC_A')).toEqual([]);
        config.addProjectFavorite('TOPIC_A', favorite);
        config.removeProjectFavorite('TOPIC_A', favorite);
        expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual(
          []
        );
      }
    );

    it.each(['null', '{}', '5', '"favorites"'])(
      'ignores a non-array topic value %s and keeps the other topic',
      (stored) => {
        localStorage.setItem(
          'kiwi/project:projectFavoritesByTopic',
          JSON.stringify({ TOPIC_A: JSON.parse(stored), TOPIC_B: [favorite] })
        );

        const config = new ConfigurationStore();

        expect(config.getProjectFavorites('TOPIC_A')).toEqual([]);
        expect(config.getProjectFavorites('TOPIC_B')).toEqual([favorite]);
        config.addProjectFavorite('TOPIC_A', favorite);
        expect(new ConfigurationStore().getProjectFavorites('TOPIC_B')).toEqual(
          [favorite]
        );
      }
    );

    it('keeps valid entries in order and drops malformed entries', () => {
      const detail = { ...favorite, sceneUuid: 'detail', sceneName: '' };
      localStorage.setItem(
        'kiwi/project:projectFavoritesByTopic',
        JSON.stringify({
          TOPIC_A: [
            null,
            favorite,
            { ...favorite, domain: '' },
            { ...favorite, projectUuid: '' },
            { ...favorite, sceneUuid: '' },
            { ...favorite, domain: 42 },
            { ...favorite, projectUuid: null },
            { ...favorite, sceneUuid: undefined },
            { ...favorite, projectName: 42 },
            { ...favorite, sceneName: null },
            detail,
          ],
        })
      );

      const config = new ConfigurationStore();

      expect(config.getProjectFavorites('TOPIC_A')).toEqual([favorite, detail]);
      config.removeProjectFavorite('TOPIC_A', favorite);
      expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual([
        detail,
      ]);
    });

    it('preserves every valid favorite in a stored list longer than ten', () => {
      const favorites = Array.from({ length: 12 }, (_, index) => ({
        ...favorite,
        sceneUuid: `scene-${index}`,
      }));
      localStorage.setItem(
        'kiwi/project:projectFavoritesByTopic',
        JSON.stringify({ TOPIC_A: favorites })
      );
      const config = new ConfigurationStore();

      const snapshot = config.getProjectFavorites('TOPIC_A');

      expect(snapshot).toEqual(favorites);
      expect(config.getProjectFavorites('TOPIC_A')).toBe(snapshot);
    });

    it('validates favorites supplied through the generic configuration API', () => {
      const config = new ConfigurationStore();
      config.setValue('projectFavoritesByTopic', {
        TOPIC_A: [favorite, { ...favorite, sceneUuid: '' }],
        TOPIC_B: 5,
      });

      expect(config.getProjectFavorites('TOPIC_A')).toEqual([favorite]);
      expect(config.getProjectFavorites('TOPIC_B')).toEqual([]);
      expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual([
        favorite,
      ]);
      config.setValue('projectFavoritesByTopic', null);
      expect(config.getProjectFavorites('TOPIC_A')).toEqual([]);
    });

    it('persists complete favorites and isolates them by topic', () => {
      const config = new ConfigurationStore();
      config.addProjectFavorite('TOPIC_A', favorite);
      config.addProjectFavorite('TOPIC_B', {
        ...favorite,
        sceneName: 'Other topic',
      });

      expect(
        JSON.parse(
          localStorage.getItem('kiwi/project:projectFavoritesByTopic')!
        )
      ).toEqual({
        TOPIC_A: [favorite],
        TOPIC_B: [{ ...favorite, sceneName: 'Other topic' }],
      });
      const restored = new ConfigurationStore();
      expect(restored.getProjectFavorites('TOPIC_A')).toEqual([favorite]);
      expect(restored.getProjectFavorites('TOPIC_B')).toEqual([
        { ...favorite, sceneName: 'Other topic' },
      ]);
      expect(restored.getProjectFavorites('UNKNOWN')).toEqual([]);
    });

    it('appends scenes and updates duplicate names in place', () => {
      const config = new ConfigurationStore();
      const secondScene = {
        ...favorite,
        sceneUuid: 'detail',
        sceneName: 'Detail',
      };
      config.addProjectFavorite('TOPIC_A', favorite);
      config.addProjectFavorite('TOPIC_A', secondScene);
      config.addProjectFavorite('TOPIC_A', {
        ...favorite,
        projectName: 'Renamed Motors',
        sceneName: 'Renamed Overview',
      });

      expect(config.getProjectFavorites('TOPIC_A')).toEqual([
        {
          ...favorite,
          projectName: 'Renamed Motors',
          sceneName: 'Renamed Overview',
        },
        secondScene,
      ]);
    });

    it('rejects an eleventh favorite without writing and still accepts another topic', () => {
      const config = new ConfigurationStore();
      const favorites = Array.from({ length: 10 }, (_, index) => ({
        ...favorite,
        sceneUuid: `scene-${index}`,
      }));
      favorites.forEach((entry) => config.addProjectFavorite('TOPIC_A', entry));
      const write = jest.spyOn(Storage.prototype, 'setItem');

      expect(config.addProjectFavorite('TOPIC_A', favorite)).toBe(false);
      expect(write).not.toHaveBeenCalled();
      expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual(
        favorites
      );
      expect(config.addProjectFavorite('TOPIC_B', favorite)).toBe(true);
      expect(config.getProjectFavorites('TOPIC_B')).toEqual([favorite]);
      write.mockRestore();
    });

    it('refreshes names at the limit without changing priority', () => {
      const config = new ConfigurationStore();
      const favorites = Array.from({ length: 10 }, (_, index) => ({
        ...favorite,
        sceneUuid: `scene-${index}`,
      }));
      favorites.forEach((entry) => config.addProjectFavorite('TOPIC_A', entry));
      const renamed = {
        ...favorites[4],
        projectName: 'Renamed project',
        sceneName: 'Renamed scene',
      };

      expect(config.addProjectFavorite('TOPIC_A', renamed)).toBe(true);

      expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual([
        ...favorites.slice(0, 4),
        renamed,
        ...favorites.slice(5),
      ]);
    });

    it('keeps legacy lists above the limit and allows moving and removing', () => {
      const favorites = Array.from({ length: 12 }, (_, index) => ({
        ...favorite,
        sceneUuid: `scene-${index}`,
      }));
      localStorage.setItem(
        'kiwi/project:projectFavoritesByTopic',
        JSON.stringify({ TOPIC_A: favorites })
      );
      const config = new ConfigurationStore();

      expect(config.addProjectFavorite('TOPIC_A', favorite)).toBe(false);
      expect(config.getProjectFavorites('TOPIC_A')).toEqual(favorites);
      config.moveProjectFavorite('TOPIC_A', favorites[11], 0);
      config.removeProjectFavorite('TOPIC_A', favorites[0]);

      expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual([
        favorites[11],
        ...favorites.slice(1, 11),
      ]);
    });

    it.each([
      { from: 2, to: 0, order: [2, 0, 1] },
      { from: 0, to: 1, order: [1, 0, 2] },
      { from: 0, to: 9, order: [1, 2, 0] },
      { from: 2, to: -1, order: [2, 0, 1] },
    ])(
      'persists moving index $from to $to and preserves other topics',
      ({ from, to, order }) => {
        const config = new ConfigurationStore();
        const favorites = Array.from({ length: 3 }, (_, index) => ({
          ...favorite,
          sceneUuid: `scene-${index}`,
        }));
        favorites.forEach((entry) =>
          config.addProjectFavorite('TOPIC_A', entry)
        );
        config.addProjectFavorite('TOPIC_B', favorite);

        config.moveProjectFavorite('TOPIC_A', favorites[from], to);

        const restored = new ConfigurationStore();
        expect(restored.getProjectFavorites('TOPIC_A')).toEqual(
          order.map((index) => favorites[index])
        );
        expect(restored.getProjectFavorites('TOPIC_B')).toEqual([favorite]);
      }
    );

    it('does not write when moving a missing favorite or keeping its position', () => {
      const config = new ConfigurationStore();
      config.addProjectFavorite('TOPIC_A', favorite);
      const write = jest.spyOn(Storage.prototype, 'setItem');

      config.moveProjectFavorite(
        'TOPIC_A',
        { ...favorite, domain: 'OTHER' },
        0
      );
      config.moveProjectFavorite(
        'TOPIC_A',
        { ...favorite, projectUuid: 'other' },
        0
      );
      config.moveProjectFavorite(
        'TOPIC_A',
        { ...favorite, sceneUuid: 'missing' },
        0
      );
      config.moveProjectFavorite('TOPIC_A', favorite, 0);
      config.moveProjectFavorite('TOPIC_A', favorite, 9);

      expect(write).not.toHaveBeenCalled();
      expect(config.getProjectFavorites('TOPIC_A')).toEqual([favorite]);
      write.mockRestore();
    });

    it('distinguishes identical scene UUIDs in different domains and projects', () => {
      const config = new ConfigurationStore();
      const otherDomain = { ...favorite, domain: 'EXPERIMENT' };
      const otherProject = { ...favorite, projectUuid: 'detectors' };
      config.addProjectFavorite('TOPIC_A', favorite);
      config.addProjectFavorite('TOPIC_A', otherDomain);
      config.addProjectFavorite('TOPIC_A', otherProject);

      config.removeProjectFavorite('TOPIC_A', favorite);

      expect(new ConfigurationStore().getProjectFavorites('TOPIC_A')).toEqual([
        otherDomain,
        otherProject,
      ]);
    });

    it('deletes only the selected scene in the selected topic', () => {
      const config = new ConfigurationStore();
      const secondScene = { ...favorite, sceneUuid: 'detail' };
      config.addProjectFavorite('TOPIC_A', favorite);
      config.addProjectFavorite('TOPIC_A', secondScene);
      config.addProjectFavorite('TOPIC_B', favorite);

      config.removeProjectFavorite('TOPIC_A', favorite);

      const restored = new ConfigurationStore();
      expect(restored.getProjectFavorites('TOPIC_A')).toEqual([secondScene]);
      expect(restored.getProjectFavorites('TOPIC_B')).toEqual([favorite]);
    });

    it('keeps unrelated topic favorites unchanged after additions and removals', () => {
      const config = new ConfigurationStore();
      const empty = config.getProjectFavorites('TOPIC_A');
      expect(config.getProjectFavorites('TOPIC_A')).toBe(empty);

      config.addProjectFavorite('TOPIC_A', favorite);
      const snapshot = config.getProjectFavorites('TOPIC_A');
      expect(config.getProjectFavorites('TOPIC_A')).toBe(snapshot);
      expect(snapshot).toEqual([favorite]);
      config.addProjectFavorite('TOPIC_B', favorite);
      expect(config.getProjectFavorites('TOPIC_A')).toBe(snapshot);
      config.removeProjectFavorite('TOPIC_A', favorite);
      expect(config.getProjectFavorites('TOPIC_A')).toEqual([]);
    });

    it.each(['getItem', 'setItem'] as const)(
      'keeps additions and deletion in memory when storage %s fails',
      (method) => {
        const storageSpy = jest
          .spyOn(Storage.prototype, method)
          .mockImplementation(() => {
            throw new DOMException('The operation is insecure.');
          });
        try {
          const config = new ConfigurationStore();
          config.addProjectFavorite('TOPIC_A', favorite);
          expect(config.getProjectFavorites('TOPIC_A')).toEqual([favorite]);
          config.removeProjectFavorite('TOPIC_A', favorite);
          expect(config.getProjectFavorites('TOPIC_A')).toEqual([]);
        } finally {
          storageSpy.mockRestore();
        }
      }
    );
  });
});

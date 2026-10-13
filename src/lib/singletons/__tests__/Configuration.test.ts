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

    it('prepends scenes and updates duplicate names in place', () => {
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
        secondScene,
        {
          ...favorite,
          projectName: 'Renamed Motors',
          sceneName: 'Renamed Overview',
        },
      ]);
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
        otherProject,
        otherDomain,
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

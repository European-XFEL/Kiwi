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

  it('stores recent scenes grouped by topic', () => {
    const config = new ConfigurationStore();

    config.setRecentScene('TOPIC_A', {
      domain: 'DOM',
      projectUuid: 'project-1',
      uuid: '1',
      name: 'Scene 1',
      projectName: 'Project',
    });

    expect(config.getRecentScenes('TOPIC_A')).toEqual([
      {
        domain: 'DOM',
        projectUuid: 'project-1',
        uuid: '1',
        name: 'Scene 1',
        projectName: 'Project',
      },
    ]);
    expect(config.getRecentScenes('TOPIC_B')).toEqual([]);
  });

  it('updates and moves an existing topic scene to the front', () => {
    const config = new ConfigurationStore();

    config.setRecentScene('TOPIC_A', {
      domain: 'DOM',
      projectUuid: 'project-1',
      uuid: '1',
      name: 'Scene 1',
      projectName: 'Project',
    });
    config.setRecentScene('TOPIC_A', {
      domain: 'DOM',
      projectUuid: 'project-2',
      uuid: '2',
      name: 'Scene 2',
      projectName: 'Project',
    });
    config.setRecentScene('TOPIC_A', {
      domain: 'DOM',
      projectUuid: 'project-1b',
      uuid: '1',
      name: 'Scene 1 renamed',
      projectName: 'Project X',
    });

    expect(config.getRecentScenes('TOPIC_A')).toEqual([
      {
        domain: 'DOM',
        projectUuid: 'project-1b',
        uuid: '1',
        name: 'Scene 1 renamed',
        projectName: 'Project X',
      },
      {
        domain: 'DOM',
        projectUuid: 'project-2',
        uuid: '2',
        name: 'Scene 2',
        projectName: 'Project',
      },
    ]);
  });

  it('removes recent scenes by topic', () => {
    const config = new ConfigurationStore();

    config.setRecentScene('TOPIC_A', {
      domain: 'DOM',
      projectUuid: 'project-1',
      uuid: '1',
      name: 'Scene 1',
      projectName: 'Project',
    });

    config.removeRecentScene('TOPIC_A', { domain: 'DOM', uuid: '1' });

    expect(config.getRecentScenes('TOPIC_A')).toEqual([]);
  });

  it('stores the last GUI server topic selection', () => {
    const config = new ConfigurationStore();

    config.lastTopic = 'SA2';

    expect(config.lastTopic).toBe('SA2');

    expect(localStorage.getItem('kiwi/network:lastTopic')).toBe(
      JSON.stringify('SA2')
    );
  });
});

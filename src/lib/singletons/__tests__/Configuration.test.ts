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
});

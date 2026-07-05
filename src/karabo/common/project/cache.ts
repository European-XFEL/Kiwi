export type ProjectCacheItem = {
  uuid: string;
  simple_name: string | null;
  is_trashed: boolean;
  date: string;
};

// The ProjectDBCache to store project data in a simple key-value store.

export class ProjectDBCache {
  static readonly KEY_PREFIX = 'kiwi:project-db-cache:';

  constructor(private readonly storage: Storage = sessionStorage) {}

  public flush(): void {}

  public store(domain: string, uuid: string, data: string): void {
    this.storage.setItem(this.key(domain, uuid), data);
  }

  public retrieve(
    domain: string,
    uuid: string,
    _existing?: unknown
  ): string | null {
    return this.storage.getItem(this.key(domain, uuid));
  }

  public get_available_domains(): string[] {
    const domains = new Set<string>();

    for (const key of this.cacheKeys()) {
      const parts = this.parseKey(key);
      if (parts) {
        domains.add(parts.domain);
      }
    }

    return Array.from(domains);
  }

  private key(domain: string, uuid: string): string {
    return `${ProjectDBCache.KEY_PREFIX}${encodeURIComponent(
      domain
    )}:${encodeURIComponent(uuid)}`;
  }

  private parseKey(key: string): { domain: string; uuid: string } | null {
    if (!key.startsWith(ProjectDBCache.KEY_PREFIX)) {
      return null;
    }

    const parts = key.slice(ProjectDBCache.KEY_PREFIX.length).split(':');
    if (parts.length !== 2) {
      return null;
    }

    return {
      domain: decodeURIComponent(parts[0]),
      uuid: decodeURIComponent(parts[1]),
    };
  }

  private cacheKeys(): string[] {
    const keys: string[] = [];

    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(ProjectDBCache.KEY_PREFIX)) {
        keys.push(key);
      }
    }

    return keys;
  }
}

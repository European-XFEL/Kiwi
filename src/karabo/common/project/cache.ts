export type ProjectCacheItem = {
  uuid: string;
  simple_name: string | null;
  is_trashed: boolean;
  date: string;
};

// The ProjectDBCache to store project data in a simple key-value store.

export class ProjectDBCache {
  private readonly cache = new Map<string, Map<string, string>>();

  public flush(): void {}

  public store(domain: string, uuid: string, data: string): void {
    let domainCache = this.cache.get(domain);
    if (!domainCache) {
      domainCache = new Map<string, string>();
      this.cache.set(domain, domainCache);
    }

    domainCache.set(uuid, data);
  }

  public retrieve(
    domain: string,
    uuid: string,
    _existing?: unknown
  ): string | null {
    return this.cache.get(domain)?.get(uuid) ?? null;
  }

  public get_available_domains(): string[] {
    return Array.from(this.cache.keys());
  }
}

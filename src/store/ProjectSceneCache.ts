import { ProjectSceneInfo } from '@/lib/ProjectDbInfo';

export class ProjectSceneCache {
  static readonly ITEM_PREFIX = 'prjScene';
  static readonly SEPARATOR = ':-:-:';

  public constructor() {
    // Performs a cache pruning on startup
    setTimeout(() => {
      this._pruneCache();
    }, 0);
    // Starts the periodic cache pruning loop
    setInterval(
      this._pruneCache,
      1000 * ProjectSceneCache.CACHE_PRUNE_INTERVAL_SECONDS
    );
  }

  // #region Store and Get scene info

  public getSceneInfo = (
    domain: string,
    uuid: string
  ): ProjectSceneInfo | null => {
    const infoValue = localStorage.getItem(this._getInfoKey(domain, uuid));
    if (infoValue) {
      // The scene has been found in the cache
      const sceneInfo = JSON.parse(infoValue).info;
      return sceneInfo;
    } else {
      return null;
    }
  };

  public storeSceneInfo(info: ProjectSceneInfo): void {
    localStorage.setItem(
      this._getInfoKey(info.domain, info.uuid),
      JSON.stringify({ info: info, savedAt: new Date() })
    );
  }

  private _getInfoKey = (domain: string, uuid: string): string => {
    return `${ProjectSceneCache.ITEM_PREFIX}${ProjectSceneCache.SEPARATOR}${domain}${ProjectSceneCache.SEPARATOR}${uuid}`;
  };

  // #endregion

  // #region Cache expiration
  static MAX_CACHE_ITEMS = 50;
  static MAX_CACHE_AGE_MILLISECONDS = 30 * 1000; // 30 seconds
  static CACHE_PRUNE_INTERVAL_SECONDS = 15;

  private _pruneCache = (): void => {
    // First step - remove all expired cache items
    const now = new Date();
    const keys = Object.keys(localStorage);
    const sceneCacheKeys = keys.filter((key: string) =>
      key.startsWith(
        `${ProjectSceneCache.ITEM_PREFIX}${ProjectSceneCache.SEPARATOR}`
      )
    );
    let expiredCacheItems = 0;
    for (const key of sceneCacheKeys) {
      const infoValue = localStorage.getItem(key);
      if (infoValue !== null) {
        const savedAt = new Date(JSON.parse(infoValue).savedAt);
        const timeDiff = now.getTime() - savedAt.getTime();
        if (timeDiff > ProjectSceneCache.MAX_CACHE_AGE_MILLISECONDS) {
          expiredCacheItems++;
          localStorage.removeItem(key);
        }
      }
    }
    if (
      sceneCacheKeys.length - expiredCacheItems >
      ProjectSceneCache.MAX_CACHE_ITEMS
    ) {
      // Second step is needed: the number of scene items in the cache is greater
      // than the maximum allowed. Need to remove the oldest ones.
      const keys = Object.keys(localStorage);
      const sceneCacheKeys = keys.filter((key: string) =>
        key.startsWith(
          `${ProjectSceneCache.ITEM_PREFIX}${ProjectSceneCache.SEPARATOR}`
        )
      );
      const sortedKeys = sceneCacheKeys.sort((a: string, b: string) => {
        const aSavedAt = new Date(JSON.parse(localStorage.getItem(a)!).savedAt);
        const bSavedAt = new Date(JSON.parse(localStorage.getItem(b)!).savedAt);
        return aSavedAt.getTime() - bSavedAt.getTime();
      });
      const itemsToRemove =
        sceneCacheKeys.length - ProjectSceneCache.MAX_CACHE_ITEMS;
      for (let i = 0; i < itemsToRemove; i++) {
        localStorage.removeItem(sortedKeys[i]);
      }
    }
  };

  // #endregion
}

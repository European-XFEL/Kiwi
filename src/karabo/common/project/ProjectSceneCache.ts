import { Hash } from '@/karabo/data/hash';
import { SceneModel } from '../scenemodel/api';
import {
  KaraboEvent,
  KaraboEventMap,
  register_for_broadcasts,
  unregister_for_broadcasts,
} from '@/lib/events';

export class ProjectSceneCache {
  static readonly ITEM_PREFIX = 'prjScene';
  static readonly SEPARATOR = ':-:-:';

  private readonly cacheStorage = new Map<string, string>();

  constructor() {
    this._eventMap = {
      [KaraboEvent.ProjectUpdated]: this._onProjectUpdate,
    };
    register_for_broadcasts(this._eventMap);

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

  dispose() {
    unregister_for_broadcasts(this._eventMap);
  }

  // #region KaraboEvent handling

  private readonly _eventMap: KaraboEventMap;

  private _onProjectUpdate = (_hash: Hash): void => {
    this.cacheStorage.clear();
  };

  // #endregion

  // #region Store and Get scene info

  public getSceneInfo = (domain: string, uuid: string): SceneModel | null => {
    const infoValue = this.cacheStorage.get(this._getInfoKey(domain, uuid));
    if (infoValue) {
      // The scene has been found in the cache
      const sceneInfo = JSON.parse(infoValue).info;
      return sceneInfo;
    } else {
      return null;
    }
  };

  public storeSceneInfo(domain: string, info: SceneModel): void {
    this.cacheStorage.set(
      this._getInfoKey(domain, info.uuid),
      JSON.stringify({ info: info, savedAt: new Date() })
    );
  }

  private _getInfoKey = (domain: string, uuid: string): string => {
    return `${ProjectSceneCache.ITEM_PREFIX}${ProjectSceneCache.SEPARATOR}${domain}${ProjectSceneCache.SEPARATOR}${uuid}`;
  };

  // #endregion

  // #region Cache expiration
  static MAX_CACHE_ITEMS = 50;
  static MAX_CACHE_AGE_MILLISECONDS = 300 * 1_000; // 5 minutes
  static CACHE_PRUNE_INTERVAL_SECONDS = 30;

  private _pruneCache = (): void => {
    // First step - remove all expired cache items
    const now = new Date();
    const keys = Array.from(this.cacheStorage.keys());
    const sceneCacheKeys = keys.filter((key: string) =>
      key.startsWith(
        `${ProjectSceneCache.ITEM_PREFIX}${ProjectSceneCache.SEPARATOR}`
      )
    );
    let expiredCacheItems = 0;
    for (const key of sceneCacheKeys) {
      const infoValue = this.cacheStorage.get(key);
      if (infoValue !== undefined) {
        const savedAt = new Date(JSON.parse(infoValue).savedAt);
        const timeDiff = now.getTime() - savedAt.getTime();
        if (timeDiff > ProjectSceneCache.MAX_CACHE_AGE_MILLISECONDS) {
          expiredCacheItems++;
          this.cacheStorage.delete(key);
        }
      }
    }
    if (
      sceneCacheKeys.length - expiredCacheItems >
      ProjectSceneCache.MAX_CACHE_ITEMS
    ) {
      // Second step is needed: the number of scene items in the cache is greater
      // than the maximum allowed. Need to remove the oldest ones.
      const keys = Array.from(this.cacheStorage.keys());
      const sceneCacheKeys = keys.filter((key: string) =>
        key.startsWith(
          `${ProjectSceneCache.ITEM_PREFIX}${ProjectSceneCache.SEPARATOR}`
        )
      );
      const sortedKeys = sceneCacheKeys.sort((a: string, b: string) => {
        const aSavedAt = new Date(
          JSON.parse(this.cacheStorage.get(a)!).savedAt
        );
        const bSavedAt = new Date(
          JSON.parse(this.cacheStorage.get(b)!).savedAt
        );
        return aSavedAt.getTime() - bSavedAt.getTime();
      });
      const itemsToRemove =
        sceneCacheKeys.length - ProjectSceneCache.MAX_CACHE_ITEMS;
      for (let i = 0; i < itemsToRemove; i++) {
        this.cacheStorage.delete(sortedKeys[i]);
      }
    }
  };

  // #endregion
}

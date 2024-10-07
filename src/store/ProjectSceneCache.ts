import {
  LoadProjectSceneResult,
  ProjectSceneInfo,
} from "../karabo_data/ProjectDbInfo";
import { ProjectDBConnector } from "../ProjectDBConnector";

export class ProjectSceneCache {
  static readonly ITEM_PREFIX = "prjScene";
  static readonly SEPARATOR = ":-:-:";

  // #region Singleton support

  private constructor() {}

  static #_inst?: ProjectSceneCache;

  static get inst(): ProjectSceneCache {
    if (ProjectSceneCache.#_inst === undefined) {
      ProjectSceneCache.#_inst = new ProjectSceneCache();
      // Performs a cache pruning on startup
      //   setTimeout(() => {
      //     ProjectSceneCache.#_inst!.#_pruneCache();
      //   }, 200);
      // Starts the periodic cache pruning loop
      setInterval(
        ProjectSceneCache.#_inst.#_pruneCache,
        1000 * ProjectSceneCache.CACHE_PRUNE_INTERVAL_SECONDS
      );
    }
    return ProjectSceneCache.#_inst;
  }

  // #endregion

  // #region Store and Get scene info

  storeSceneInfo(info: ProjectSceneInfo): void {
    localStorage.setItem(
      this.#_getInfoKey(info.domain, info.uuid),
      JSON.stringify({ info: info, savedAt: new Date() })
    );
  }

  getSceneInfoFromQueryParams = (
    queryParams: string,
    onProjectSceneInfo: (info: ProjectSceneInfo | null) => void
  ): void => {
    const sceneData = queryParams.match(
      /^.*\?host=([^&]+)&port=([^&]+)&domain=([^&]+)&projectName=([^&]+)&uuid=([^&]+).*$/
    );
    if (sceneData) {
      const domain = sceneData[3];
      const projectName = sceneData[4];
      const uuid = sceneData[5];
      this.getSceneInfo(domain, projectName, uuid, onProjectSceneInfo);
    } else {
      onProjectSceneInfo(null);
    }
  };

  #_gettingSceneInfo: boolean = false;

  getSceneInfo = (
    domain: string,
    projectName: string,
    uuid: string,
    onProjectSceneInfo: (info: ProjectSceneInfo | null) => void
  ): void => {
    if (this.#_gettingSceneInfo) {
      // There's already a scene info operation taking place, postpone the
      // execution of this to a later time
      setTimeout(
        this.getSceneInfo,
        100,
        domain,
        projectName,
        uuid,
        onProjectSceneInfo
      );
    } else {
      this.#_gettingSceneInfo = true;
      this.#_getSceneInfoWorker(domain, projectName, uuid, onProjectSceneInfo);
    }
  };

  #_getSceneInfoWorker = (
    domain: string,
    projectName: string,
    uuid: string,
    onProjectSceneInfo: (info: ProjectSceneInfo | null) => void
  ): void => {
    const infoValue = localStorage.getItem(this.#_getInfoKey(domain, uuid));
    if (infoValue === null) {
      ProjectDBConnector.inst.getScene(
        domain,
        projectName,
        uuid,
        (result: LoadProjectSceneResult) => {
          if (result.scene !== undefined) {
            this.storeSceneInfo(result.scene);
            onProjectSceneInfo(result.scene);
          } else {
            onProjectSceneInfo(null);
            console.log(result.error_msg);
          }
          // NOTE: this assignement is internal to the callback and cannot be
          // moved outside, or the enforcement of only one scene retrieval at
          // a time via a network request would be lost.
          this.#_gettingSceneInfo = false;
        }
      );
    } else {
      // The scene has been found in the cache
      const sceneInfo = JSON.parse(infoValue).info;
      onProjectSceneInfo(sceneInfo);
      this.#_gettingSceneInfo = false;
    }
  };

  #_getInfoKey = (domain: string, uuid: string): string => {
    return `${ProjectSceneCache.ITEM_PREFIX}${ProjectSceneCache.SEPARATOR}${domain}${ProjectSceneCache.SEPARATOR}${uuid}`;
  };

  // #endregion

  // #region Cache expiration
  static MAX_CACHE_ITEMS = 50;
  static MAX_CACHE_AGE_MILLISECONDS = 10 * 60 * 1000; // 10 minutes
  static CACHE_PRUNE_INTERVAL_SECONDS = 20;

  #_pruneCache = (): void => {
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

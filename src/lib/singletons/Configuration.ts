import { decryptData, encryptData } from '@/lib/crypto';
import type { AccessLevel } from '@/karabo/data/api';

/** Subset of data needed to resume a GUI Session when the app starts. */
export interface SessionData {
  userId: string;
  refreshToken?: string; // Only for auth sessions.
  accessLevel?: AccessLevel; // Only for non-auth sessions.
}

export const AUTHENTICATION = 'authentication';
export const NETWORK = 'network';
export const PROJECT = 'project';
export const BACKBONE = 'backbone';
export const DIRECTORIES = 'dir';
export const USER = 'user';

export interface StoredRecentSceneInfo {
  domain: string;
  uuid: string;
  name: string;
  projectName: string;
}

type ItemDType = 'string' | 'number' | 'int' | 'float' | 'boolean' | 'json';

class Item {
  public key: string = '';
  public defaultValue: any;
  public store: boolean;
  public group: string;
  public editable: boolean;
  public encrypted: boolean;
  public dtype: ItemDType;

  constructor(params: any) {
    this.defaultValue = params.defaultValue;
    this.store = params.store ?? true;
    this.group = params.group ?? '';
    this.editable = params.editable ?? false;
    this.encrypted = params.encrypted ?? false;
    this.dtype = params.dtype ?? 'string';

    if (this.encrypted && !this.store) {
      throw new Error(
        `Encrypted item "${this.key}" must have store=true because it is always shared from localStorage.`
      );
    }
  }
}

class EncryptedItem extends Item {
  constructor(params: any) {
    super({ ...params, encrypted: true, store: true });
  }
}

function serialize(value: any): string {
  return JSON.stringify(value);
}

function deserialize(rawValue: string): any {
  return JSON.parse(rawValue);
}

function coerceByDtype(value: any, configItem: Item): any {
  if (value === undefined || value === null) {
    return value;
  }

  switch (configItem.dtype) {
    case 'string':
      return String(value);
    case 'number':
    case 'float': {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? configItem.defaultValue : parsed;
    }
    case 'int': {
      const parsed = Number.parseInt(`${value}`, 10);
      return Number.isNaN(parsed) ? configItem.defaultValue : parsed;
    }
    case 'boolean':
      if (typeof value === 'string') {
        return value.toLowerCase() === 'true';
      }
      return Boolean(value);
    case 'json':
      return value;
    default:
      return String(value);
  }
}

export class ConfigurationStore {
  private readonly prefix = 'kiwi';
  private readonly memory = new Map<string, any>();
  private readonly MRU_SCENES_SIZE = 6;

  private readonly storage_items = {
    host: new Item({
      defaultValue: '',
      group: NETWORK,
      dtype: 'string',
    }),
    port: new Item({
      defaultValue: 0,
      group: NETWORK,
      dtype: 'int',
    }),

    sessionUserId: new Item({
      defaultValue: '',
      group: AUTHENTICATION,
      dtype: 'string',
    }),
    sessionAccessLevel: new Item({
      defaultValue: undefined,
      group: AUTHENTICATION,
      dtype: 'string',
    }),
    sessionRefreshToken: new EncryptedItem({
      defaultValue: undefined,
      group: AUTHENTICATION,
      dtype: 'string',
    }),

    recentScenesByTopic: new Item({
      defaultValue: {},
      group: PROJECT,
      dtype: 'json',
    }),
  };

  constructor() {
    Object.entries(this.storage_items).forEach(([key, configItem]) => {
      configItem.key = key;
      if (!configItem.encrypted) {
        this.memory.set(configItem.key, this.loadInitialValue(configItem));
      }
    });
  }

  private storageKey(configItem: Item): string {
    return `${this.prefix}/${configItem.group}:${configItem.key}`;
  }

  private loadInitialValue(configItem: Item): any {
    if (!configItem.store) {
      return configItem.defaultValue;
    }

    const rawValue = localStorage.getItem(this.storageKey(configItem));
    if (rawValue === null) {
      return configItem.defaultValue;
    }

    try {
      const decodedValue = configItem.encrypted
        ? decryptData(rawValue)
        : rawValue;
      return coerceByDtype(deserialize(decodedValue), configItem);
    } catch (err) {
      throw new Error(
        `Failed to initialize config item "${configItem.key}" from localStorage`,
        { cause: err }
      );
    }
  }

  private getItem(configItem: Item): any {
    if (configItem.encrypted) {
      return this.loadInitialValue(configItem);
    }

    return coerceByDtype(this.memory.get(configItem.key), configItem);
  }

  private setItem(configItem: Item, value: any): void {
    const coercedValue = coerceByDtype(value, configItem);

    if (!configItem.encrypted) {
      this.memory.set(configItem.key, coercedValue);
    }

    if (!configItem.store) {
      return;
    }

    const rawValue = serialize(coercedValue);
    const finalValue = configItem.encrypted ? encryptData(rawValue) : rawValue;
    localStorage.setItem(this.storageKey(configItem), finalValue);
  }

  private deleteItem(configItem: Item): void {
    if (!configItem.encrypted) {
      this.memory.set(configItem.key, configItem.defaultValue);
    }

    if (!configItem.store) {
      return;
    }

    localStorage.removeItem(this.storageKey(configItem));
  }

  // #region SessionData

  async saveAuthSession(userId: string, refreshToken: string): Promise<void> {
    this.setItem(this.storage_items.sessionUserId, userId);
    this.setItem(this.storage_items.sessionRefreshToken, refreshToken);
    this.deleteItem(this.storage_items.sessionAccessLevel);
  }

  async saveNonAuthSession(
    userId: string,
    accessLevel: AccessLevel
  ): Promise<void> {
    this.setItem(this.storage_items.sessionUserId, userId);
    this.setItem(this.storage_items.sessionAccessLevel, accessLevel);
    this.deleteItem(this.storage_items.sessionRefreshToken);
  }

  async loadSession(): Promise<SessionData | undefined> {
    const userId = this.getItem(this.storage_items.sessionUserId);
    if (!userId) {
      return undefined;
    }

    const refreshToken = this.getItem(this.storage_items.sessionRefreshToken);
    const accessLevel = this.getItem(this.storage_items.sessionAccessLevel);

    return {
      userId,
      refreshToken: refreshToken ?? undefined,
      accessLevel: accessLevel ?? undefined,
    };
  }

  async deleteSession(): Promise<void> {
    this.deleteItem(this.storage_items.sessionUserId);
    this.deleteItem(this.storage_items.sessionRefreshToken);
    this.deleteItem(this.storage_items.sessionAccessLevel);
  }

  // #endregion

  // #region RecentScenes

  private moveFront<T>(arr: readonly T[], index: number): T[] {
    if (index === 0) {
      return arr.slice();
    }

    return [arr[index], ...arr.slice(0, index), ...arr.slice(index + 1)];
  }

  private getRecentScenesByTopicObject(): Record<
    string,
    StoredRecentSceneInfo[]
  > {
    const recentScenes = this.getItem(this.storage_items.recentScenesByTopic);
    if (!recentScenes || typeof recentScenes !== 'object') {
      return {};
    }

    return recentScenes as Record<string, StoredRecentSceneInfo[]>;
  }

  public getRecentScenes(topic: string): StoredRecentSceneInfo[] {
    const recentScenesByTopic = this.getRecentScenesByTopicObject();
    const scenes = recentScenesByTopic[topic];
    return Array.isArray(scenes) ? [...scenes] : [];
  }

  public getRecentScenesByTopic(): Map<string, StoredRecentSceneInfo[]> {
    const recentScenesByTopic = this.getRecentScenesByTopicObject();
    const recentScenesMap = new Map<string, StoredRecentSceneInfo[]>();

    Object.entries(recentScenesByTopic).forEach(([topic, scenes]) => {
      recentScenesMap.set(topic, [...scenes]);
    });

    return recentScenesMap;
  }

  public setRecentScene(topic: string, scene: StoredRecentSceneInfo): void {
    const recentScenesByTopic = this.getRecentScenesByTopicObject();
    let scenes = Array.isArray(recentScenesByTopic[topic])
      ? [...recentScenesByTopic[topic]]
      : [];

    const index = scenes.findIndex(
      (entry) => entry.domain === scene.domain && entry.uuid === scene.uuid
    );

    if (index >= 0) {
      scenes[index] = {
        ...scenes[index],
        name: scene.name,
        projectName: scene.projectName,
      };
      scenes = this.moveFront(scenes, index);
    } else {
      scenes.unshift(scene);
      if (scenes.length > this.MRU_SCENES_SIZE) {
        scenes = scenes.slice(0, this.MRU_SCENES_SIZE);
      }
    }

    this.setItem(this.storage_items.recentScenesByTopic, {
      ...recentScenesByTopic,
      [topic]: scenes,
    });
  }

  public removeRecentScene(
    topic: string,
    sceneId: { domain: string; uuid: string }
  ): void {
    const recentScenesByTopic = this.getRecentScenesByTopicObject();
    const scenes = Array.isArray(recentScenesByTopic[topic])
      ? recentScenesByTopic[topic]
      : [];

    const updatedScenes = scenes.filter(
      (scene) =>
        !(scene.domain === sceneId.domain && scene.uuid === sceneId.uuid)
    );

    if (updatedScenes.length === 0) {
      const nextRecentScenesByTopic = { ...recentScenesByTopic };
      delete nextRecentScenesByTopic[topic];
      this.setItem(
        this.storage_items.recentScenesByTopic,
        nextRecentScenesByTopic
      );
      return;
    }

    this.setItem(this.storage_items.recentScenesByTopic, {
      ...recentScenesByTopic,
      [topic]: updatedScenes,
    });
  }

  // #endregion

  // #region Generic Item Access

  public getValue(key: keyof typeof this.storage_items): any {
    return this.getItem(this.storage_items[key]);
  }

  public setValue(key: keyof typeof this.storage_items, value: any): void {
    this.setItem(this.storage_items[key], value);
  }

  public deleteValue(key: keyof typeof this.storage_items): void {
    this.deleteItem(this.storage_items[key]);
  }

  public keys(): Array<keyof typeof this.storage_items> {
    return Object.keys(this.storage_items) as Array<
      keyof typeof this.storage_items
    >;
  }

  // #endregion

  // #region Backward-compatible API

  public get lastHost(): string {
    return this.getItem(this.storage_items.host);
  }

  public set lastHost(host: string) {
    this.setItem(this.storage_items.host, host);
  }

  public get lastPort(): number {
    return this.getItem(this.storage_items.port);
  }

  public set lastPort(port: number) {
    this.setItem(this.storage_items.port, port);
  }

  // #endregion
}

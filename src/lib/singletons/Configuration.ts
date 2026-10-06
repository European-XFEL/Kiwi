import { decryptData, encryptData } from '@/lib/crypto';
import { AccessLevel } from '@/karabo/data/api';

/** Subset of data needed to resume a GUI Session when the app starts. */
export interface SessionData {
  userId: string;
  refreshToken?: string; // Only for auth sessions.
  accessLevel?: AccessLevel; // Only for non-auth sessions.
  isReadOnly: boolean;
}

export const AUTHENTICATION = 'authentication';
export const NETWORK = 'network';
export const PROJECT = 'project';
export const BACKBONE = 'backbone';
export const DIRECTORIES = 'dir';
export const USER = 'user';

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
  private storage: Storage | undefined;

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
    lastTopic: new Item({
      defaultValue: '',
      group: NETWORK,
      dtype: 'string',
    }),

    sessionUserId: new Item({
      defaultValue: '',
      group: AUTHENTICATION,
      dtype: 'string',
    }),
    sessionAccessLevel: new Item({
      defaultValue: undefined,
      group: AUTHENTICATION,
      dtype: 'int',
    }),
    sessionRefreshToken: new EncryptedItem({
      defaultValue: undefined,
      group: AUTHENTICATION,
      dtype: 'string',
    }),
    sessionReadOnly: new Item({
      defaultValue: undefined,
      group: AUTHENTICATION,
      dtype: 'boolean',
    }),

    currentDomain: new Item({
      defaultValue: '',
      group: PROJECT,
      dtype: 'string',
    }),
  };

  constructor() {
    try {
      this.storage = globalThis.localStorage;
    } catch {
      this.storage = undefined;
      console.log('localeStorage could not be created.');
    }

    Object.entries(this.storage_items).forEach(([key, configItem]) => {
      configItem.key = key;
      if (!configItem.encrypted || !this.storage) {
        this.memory.set(configItem.key, this.loadInitialValue(configItem));
      }
    });
  }

  private storageKey(configItem: Item): string {
    return `${this.prefix}/${configItem.group}:${configItem.key}`;
  }

  private loadInitialValue(configItem: Item): any {
    if (!configItem.store || !this.storage) {
      return configItem.defaultValue;
    }

    const rawValue = this.readStorage(this.storageKey(configItem));
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
    if (configItem.encrypted && this.storage) {
      return this.loadInitialValue(configItem);
    }

    return coerceByDtype(this.memory.get(configItem.key), configItem);
  }

  private setItem(configItem: Item, value: any): void {
    const coercedValue = coerceByDtype(value, configItem);

    if (!configItem.encrypted || !this.storage) {
      this.memory.set(configItem.key, coercedValue);
    }

    if (!configItem.store || !this.storage) {
      return;
    }

    const rawValue = serialize(coercedValue);
    const finalValue = configItem.encrypted ? encryptData(rawValue) : rawValue;
    try {
      this.storage.setItem(this.storageKey(configItem), finalValue);
    } catch {
      this.storage = undefined;
      this.memory.set(configItem.key, coercedValue);
    }
  }

  private deleteItem(configItem: Item): void {
    if (!configItem.encrypted || !this.storage) {
      this.memory.set(configItem.key, configItem.defaultValue);
    }

    if (!configItem.store || !this.storage) {
      return;
    }

    try {
      this.storage.removeItem(this.storageKey(configItem));
    } catch {
      this.storage = undefined;
      this.memory.set(configItem.key, configItem.defaultValue);
    }
  }

  private readStorage(key: string): string | null {
    if (!this.storage) {
      return null;
    }

    try {
      return this.storage.getItem(key);
    } catch {
      this.storage = undefined;
      return null;
    }
  }

  // #region SessionData

  async saveAuthSession(
    userId: string,
    refreshToken: string,
    isReadOnly: boolean
  ): Promise<void> {
    this.setItem(this.storage_items.sessionUserId, userId);
    this.setItem(this.storage_items.sessionRefreshToken, refreshToken);
    this.setItem(this.storage_items.sessionReadOnly, isReadOnly);
    this.deleteItem(this.storage_items.sessionAccessLevel);
  }

  async saveNonAuthSession(
    userId: string,
    accessLevel: AccessLevel
  ): Promise<void> {
    this.setItem(this.storage_items.sessionUserId, userId);
    this.setItem(this.storage_items.sessionAccessLevel, accessLevel);
    this.setItem(
      this.storage_items.sessionReadOnly,
      accessLevel === AccessLevel.OBSERVER
    );
    this.deleteItem(this.storage_items.sessionRefreshToken);
  }

  async loadSession(): Promise<SessionData | undefined> {
    const userId = this.getItem(this.storage_items.sessionUserId);
    if (!userId) {
      return undefined;
    }

    const refreshToken = this.getItem(this.storage_items.sessionRefreshToken);
    const accessLevel = this.getItem(this.storage_items.sessionAccessLevel);
    const isReadOnly = this.getItem(this.storage_items.sessionReadOnly);

    return {
      userId,
      refreshToken: refreshToken ?? undefined,
      accessLevel: accessLevel ?? undefined,
      isReadOnly: isReadOnly,
    };
  }

  async deleteSession(): Promise<void> {
    this.deleteItem(this.storage_items.sessionUserId);
    this.deleteItem(this.storage_items.sessionRefreshToken);
    this.deleteItem(this.storage_items.sessionAccessLevel);
    this.deleteItem(this.storage_items.sessionReadOnly);
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

  public get lastTopic(): string {
    return this.getItem(this.storage_items.lastTopic);
  }

  public set lastTopic(topic: string) {
    this.setItem(this.storage_items.lastTopic, topic);
  }

  public get currentDomain(): string {
    return this.getItem(this.storage_items.currentDomain);
  }

  public set currentDomain(domain: string) {
    this.setItem(this.storage_items.currentDomain, domain);
  }

  // #endregion
}

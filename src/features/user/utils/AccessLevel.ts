import { AccessLevel } from '@/karabo/data/enums';
import { useGlobalStore } from '@/store/globalAppStateStore';

export class AccessControlManager {
  private static _instance?: AccessControlManager;

  private _originalLevel: AccessLevel = AccessLevel.OBSERVER;
  private _currentLevel: AccessLevel = AccessLevel.OBSERVER;
  private _isAuthenticated = false;

  private constructor() {}

  static get instance(): AccessControlManager {
    if (!this._instance) {
      this._instance = new AccessControlManager();
    }
    return this._instance;
  }

  private syncToStore() {
    const { updateAccessLevel } = useGlobalStore.getState();
    updateAccessLevel(this._currentLevel);
  }

  initFromLogin(params: {
    accessLevel: AccessLevel;
    isAuthenticated: boolean;
    userId?: string;
  }): void {
    this._originalLevel = params.accessLevel;
    this._currentLevel = params.accessLevel;
    this._isAuthenticated = params.isAuthenticated;

    this.syncToStore();
  }

  get originalLevel(): AccessLevel {
    return this._originalLevel;
  }

  get currentLevel(): AccessLevel {
    return this._currentLevel;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated;
  }

  getAvailableLevels(): AccessLevel[] {
    switch (this._originalLevel) {
      case AccessLevel.OBSERVER:
        return [AccessLevel.OBSERVER];
      case AccessLevel.OPERATOR:
        return [AccessLevel.OBSERVER, AccessLevel.OBSERVER];
      case AccessLevel.EXPERT:
        return [AccessLevel.OBSERVER, AccessLevel.OPERATOR, AccessLevel.EXPERT];
      default:
        return [this._originalLevel];
    }
  }

  canChangeLevel(): boolean {
    return this._originalLevel >= AccessLevel.OPERATOR;
  }

  canChangeTo(target: AccessLevel): boolean {
    return this.getAvailableLevels().includes(target);
  }

  setCurrentLevel(target: AccessLevel): void {
    if (!this.canChangeTo(target)) {
      throw new Error(
        `Access level change not allowed: ${
          AccessLevel[this._originalLevel]
        } -> ${AccessLevel[target]}`
      );
    }
    this._currentLevel = target;
    this.syncToStore();
  }

  reset(): void {
    this._originalLevel = AccessLevel.OBSERVER;
    this._currentLevel = AccessLevel.OBSERVER;
    this._isAuthenticated = false;
    this.syncToStore();
  }
}
